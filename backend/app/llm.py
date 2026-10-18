"""Gemini access: per-user encrypted keys, LLM factory, JSON parsing, error mapping."""
import json
import logging
import re
import time
from typing import Any, Dict, Optional, Tuple

from fastapi import HTTPException
from firebase_admin import firestore
from langchain_google_genai import ChatGoogleGenerativeAI

from . import security
from .config import settings
from .db import user_ref

log = logging.getLogger("ournold.llm")

_KEY_TTL = 30 * 60
_KEY_CACHE_MAX = 1000
_key_cache: Dict[str, Tuple[str, float]] = {}


# ---------------------------------------------------------------- key storage
def _secrets_ref(uid: str):
    return user_ref(uid).collection("private").document("secrets")


def has_user_key(uid: str) -> bool:
    try:
        get_user_key(uid)
        return True
    except HTTPException:
        return False


def get_user_key(uid: str) -> str:
    """Returns the decrypted Gemini key. Lazily migrates legacy plaintext keys on first use."""
    now = time.time()
    hit = _key_cache.get(uid)
    if hit and hit[1] > now:
        return hit[0]

    snap = _secrets_ref(uid).get()
    key: Optional[str] = None
    if snap.exists and (snap.to_dict() or {}).get("gemini_api_enc"):
        key = security.decrypt(snap.to_dict()["gemini_api_enc"])
    else:
        legacy = user_ref(uid).get()
        legacy_key = (legacy.to_dict() or {}).get("gemini_api") if legacy.exists else None
        if legacy_key:
            store_user_key(uid, legacy_key)  # migrate + delete the plaintext copy
            key = legacy_key

    if not key:
        raise HTTPException(
            status_code=400,
            detail="NO_GEMINI_KEY: Add your Gemini API key in Update Profile to use AI features.",
        )

    if len(_key_cache) >= _KEY_CACHE_MAX:
        _key_cache.clear()
    _key_cache[uid] = (key, now + _KEY_TTL)
    return key


def store_user_key(uid: str, key: str) -> None:
    _secrets_ref(uid).set({"gemini_api_enc": security.encrypt(key), "updated_at": firestore.SERVER_TIMESTAMP})
    # remove any legacy plaintext copy
    user_ref(uid).update({"gemini_api": firestore.DELETE_FIELD})
    _key_cache.pop(uid, None)


def validate_key(key: str) -> None:
    """Cheap live check so users learn immediately if the key is wrong."""
    try:
        llm = ChatGoogleGenerativeAI(model=settings.gemini_model, api_key=key, max_retries=0, timeout=15)
        llm.invoke("Reply with the single word: ok")
    except Exception as exc:
        raise map_error(exc)


# ---------------------------------------------------------------- LLM helpers
def make_llm(key: str, temperature: float = 0.3, timeout: int = 45) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        temperature=temperature,
        api_key=key,
        max_retries=1,
        timeout=timeout,
    )


def get_llm(uid: str, temperature: float = 0.3) -> ChatGoogleGenerativeAI:
    return make_llm(get_user_key(uid), temperature)


def map_error(exc: Exception) -> HTTPException:
    """Translate provider errors into clean HTTP errors without leaking raw text."""
    if isinstance(exc, HTTPException):
        return exc
    text = str(exc)
    low = text.lower()
    if "429" in text or "resource_exhausted" in low or "quota" in low:
        return HTTPException(429, "Your Gemini quota/rate limit was hit. Wait a moment and retry.")
    if "api key not valid" in low or "api_key_invalid" in low or "permission_denied" in low or "401" in text or "403" in text:
        return HTTPException(400, "INVALID_GEMINI_KEY: Your Gemini API key was rejected. Update it in Update Profile.")
    if "timeout" in low or "deadline" in low:
        return HTTPException(504, "The AI took too long to respond. Please retry.")
    log.exception("LLM error")
    return HTTPException(502, "The AI service had a problem. Please retry.")


def text_of(content: Any) -> str:
    """Normalises LangChain message content (str or list of blocks) to plain text."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in content)
    return str(content or "")


_FENCE = re.compile(r"```(?:json)?\s*|\s*```")


def parse_json(raw: str) -> Any:
    """Parses a JSON object/array from a model response, tolerating fences and surrounding prose."""
    cleaned = _FENCE.sub("", raw).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # try whichever bracket appears first, so an array of objects is not mistaken for its first object
    order = sorted((("{", "}"), ("[", "]")), key=lambda p: cleaned.find(p[0]) if p[0] in cleaned else len(cleaned) + 1)
    for open_c, close_c in order:
        s, e = cleaned.find(open_c), cleaned.rfind(close_c)
        if s != -1 and e > s:
            try:
                return json.loads(cleaned[s : e + 1])
            except json.JSONDecodeError:
                continue
    raise ValueError("No valid JSON in model output")


def invoke_json(uid: str, prompt: str, temperature: float = 0.3) -> Any:
    """Calls the user's Gemini and returns parsed JSON; raises clean HTTP errors."""
    try:
        resp = get_llm(uid, temperature).invoke(prompt)
    except Exception as exc:
        raise map_error(exc)
    try:
        return parse_json(text_of(resp.content))
    except ValueError:
        raise HTTPException(502, "The AI returned an unreadable answer. Please retry.")
