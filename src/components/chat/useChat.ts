"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, authFetch, toApiError, userTimezone } from "@/lib/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Set on an assistant bubble when the request failed. */
  error?: { message: string; code: ApiError["code"]; persisted: boolean };
}

export interface ChatSummary {
  id: string;
  title: string;
  type: string;
  updated_at?: string;
}

export type ChatTopic = "general" | "diet" | "workout";

/** Parses a Server-Sent-Events stream into JSON events. */
async function* readEvents(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (raw.startsWith("data:")) {
        try {
          yield JSON.parse(raw.slice(5).trim());
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  }
}

export function useChat(topic: ChatTopic, enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatIdRef = useRef<string | null>(null);
  chatIdRef.current = chatId;

  const refreshChats = useCallback(async () => {
    try {
      const res = await api.get<{ data: ChatSummary[] }>("/api/chats");
      setChats(res.data.data);
    } catch {
      /* history list is non-critical */
    }
  }, []);

  useEffect(() => {
    if (enabled) refreshChats();
  }, [enabled, refreshChats]);

  const patchLast = (fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((prev) => (prev.length ? [...prev.slice(0, -1), fn(prev[prev.length - 1])] : prev));

  const run = useCallback(
    async (text: string, regenerate: boolean) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      let persisted = false;

      try {
        const res = await authFetch("/api/chat/stream", {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            chat_id: chatIdRef.current,
            message: text,
            type: topic,
            tz: userTimezone(),
            regenerate,
          }),
        });
        persisted = true;
        for await (const ev of readEvents(res)) {
          if (ev.type === "meta") setChatId(ev.chat_id);
          else if (ev.type === "token") patchLast((m) => ({ ...m, content: m.content + ev.text }));
          else if (ev.type === "error") {
            const code: ApiError["code"] = ev.status === 429 ? "RATE_LIMIT" : ev.status === 400 ? "INVALID_KEY" : "UNKNOWN";
            patchLast((m) => ({ ...m, error: { message: ev.message, code, persisted: true } }));
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          const err = toApiError(e);
          patchLast((m) => ({ ...m, error: { message: err.message, code: err.code, persisted } }));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
        refreshChats();
      }
    },
    [topic, refreshChats]
  );

  const send = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || streaming) return;
      setMessages((prev) => [...prev, { role: "user", content: clean }, { role: "assistant", content: "" }]);
      run(clean, false);
    },
    [run, streaming]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const regenerate = useCallback(() => {
    if (streaming) return;
    setMessages((prev) => {
      const trimmed = prev[prev.length - 1]?.role === "assistant" ? prev.slice(0, -1) : prev;
      return [...trimmed, { role: "assistant", content: "" }];
    });
    run("", true);
  }, [run, streaming]);

  /** Retry after a failure: re-ask if the server never stored the question, otherwise regenerate the answer. */
  const retry = useCallback(() => {
    const last = messages[messages.length - 1];
    if (!last?.error || streaming) return;
    if (last.error.persisted && chatIdRef.current) {
      regenerate();
    } else {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (!lastUser) return;
      setMessages((prev) => prev.slice(0, -2));
      send(lastUser.content);
    }
  }, [messages, streaming, regenerate, send]);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setChatId(null);
  }, []);

  const openChat = useCallback(async (id: string) => {
    abortRef.current?.abort();
    try {
      const res = await api.get<{ id: string; messages: ChatMessage[] }>(`/api/chats/${id}`);
      setMessages(res.data.messages);
      setChatId(id);
    } catch {
      /* leave current view */
    }
  }, []);

  const removeChat = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/api/chats/${id}`);
        setChats((prev) => prev.filter((c) => c.id !== id));
        if (chatIdRef.current === id) newChat();
      } catch {
        /* ignore */
      }
    },
    [newChat]
  );

  return { messages, chatId, chats, streaming, send, stop, regenerate, retry, newChat, openChat, removeChat };
}
