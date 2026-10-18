"""Streaming chat (SSE) with server-side persisted conversations."""
import json
import logging
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from .. import llm
from ..auth import ai_user, get_current_user
from ..db import get_db, user_ref
from ..services.context import system_prompt

log = logging.getLogger("ournold.chat")
router = APIRouter(prefix="/api", tags=["chat"])

HISTORY_TURNS = 10


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _chats(uid: str):
    return user_ref(uid).collection("chats")


def _sse(obj: dict) -> str:
    return f"data: {json.dumps(obj)}\n\n"


class StreamRequest(BaseModel):
    chat_id: Optional[str] = None
    message: str = Field(default="", max_length=2000)
    type: Literal["general", "diet", "workout"] = "general"
    tz: Optional[str] = None
    regenerate: bool = False


@router.post("/chat/stream")
def chat_stream(req: StreamRequest, uid: str = Depends(ai_user)):
    text = req.message.strip()
    if not req.regenerate and not text:
        raise HTTPException(400, "Message is empty.")

    # --- everything that can fail runs BEFORE streaming starts, so errors are proper HTTP responses
    key = llm.get_user_key(uid)
    chat_ref = _chats(uid).document(req.chat_id) if req.chat_id else _chats(uid).document()
    snap = chat_ref.get()
    if req.chat_id and not snap.exists:
        raise HTTPException(404, "Conversation not found.")
    msgs = chat_ref.collection("messages")

    if req.regenerate:
        if not snap.exists:
            raise HTTPException(400, "Nothing to regenerate.")
        last = list(msgs.order_by("created_at", direction="DESCENDING").limit(2).stream())
        for d in last:  # drop trailing assistant reply
            if (d.to_dict() or {}).get("role") == "assistant":
                d.reference.delete()
        last_user = next(
            (d.to_dict() for d in msgs.order_by("created_at", direction="DESCENDING").limit(1).stream()), None
        )
        if not last_user or last_user.get("role") != "user":
            raise HTTPException(400, "Nothing to regenerate.")
        text = last_user["content"]
    else:
        title = (snap.to_dict() or {}).get("title") if snap.exists else None
        if not title:
            title = text[:48] + ("…" if len(text) > 48 else "")
        chat_ref.set({"title": title, "convo_type": req.type, "updated_at": _now(),
                      **({} if snap.exists else {"created_at": _now()})}, merge=True)
        msgs.document().set({"role": "user", "content": text, "created_at": _now()})

    # history (excluding the message we just stored)
    hist_docs = list(msgs.order_by("created_at", direction="DESCENDING").limit(HISTORY_TURNS + 1).stream())
    history = [d.to_dict() for d in reversed(hist_docs)]
    if history and history[-1].get("role") == "user":
        history = history[:-1]

    messages = [SystemMessage(content=system_prompt(uid, req.type, req.tz))]
    for m in history[-HISTORY_TURNS:]:
        messages.append((HumanMessage if m["role"] == "user" else AIMessage)(content=m["content"]))
    messages.append(HumanMessage(content=text))

    chat_id = chat_ref.id
    model = llm.make_llm(key, temperature=0.4, timeout=60)

    def generate():
        acc: list[str] = []
        yield _sse({"type": "meta", "chat_id": chat_id})
        try:
            for chunk in model.stream(messages):
                piece = llm.text_of(chunk.content)
                if piece:
                    acc.append(piece)
                    yield _sse({"type": "token", "text": piece})
            yield _sse({"type": "done"})
        except GeneratorExit:  # client pressed Stop / closed the connection
            raise
        except Exception as exc:
            err = llm.map_error(exc)
            yield _sse({"type": "error", "message": str(err.detail).split(": ", 1)[-1], "status": err.status_code})
        finally:
            answer = "".join(acc).strip()
            if answer:  # persist full or partial answer
                try:
                    msgs.document().set({"role": "assistant", "content": answer, "created_at": _now()})
                    chat_ref.set({"updated_at": _now()}, merge=True)
                except Exception:
                    log.exception("Failed to persist assistant message")

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ------------------------------------------------------------- conversations
@router.get("/chats")
def list_chats(uid: str = Depends(get_current_user)):
    docs = _chats(uid).order_by("updated_at", direction="DESCENDING").limit(40).stream()
    return {
        "data": [
            {"id": d.id, "title": (d.to_dict() or {}).get("title", "New chat"),
             "type": (d.to_dict() or {}).get("convo_type", "general"),
             "updated_at": (d.to_dict() or {}).get("updated_at")}
            for d in docs
        ]
    }


@router.get("/chats/{chat_id}")
def get_chat(chat_id: str, uid: str = Depends(get_current_user)):
    ref = _chats(uid).document(chat_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(404, "Conversation not found.")
    msgs = ref.collection("messages").order_by("created_at").limit(300).stream()
    return {
        "id": chat_id,
        "title": (snap.to_dict() or {}).get("title"),
        "messages": [{"role": m["role"], "content": m["content"]} for m in (d.to_dict() for d in msgs)],
    }


class RenameBody(BaseModel):
    title: str = Field(min_length=1, max_length=80)


@router.patch("/chats/{chat_id}")
def rename_chat(chat_id: str, body: RenameBody, uid: str = Depends(get_current_user)):
    ref = _chats(uid).document(chat_id)
    if not ref.get().exists:
        raise HTTPException(404, "Conversation not found.")
    ref.update({"title": body.title.strip()})
    return {"id": chat_id, "title": body.title.strip()}


@router.delete("/chats/{chat_id}")
def delete_chat(chat_id: str, uid: str = Depends(get_current_user)):
    ref = _chats(uid).document(chat_id)
    batch = get_db().batch()
    n = 0
    for d in ref.collection("messages").stream():
        batch.delete(d.reference)
        n += 1
        if n % 400 == 0:
            batch.commit()
            batch = get_db().batch()
    batch.delete(ref)
    batch.commit()
    return {"deleted": True}
