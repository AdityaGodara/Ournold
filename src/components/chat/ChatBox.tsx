"use client";
import React, { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  BotMessageSquare,
  Check,
  Copy,
  History,
  RefreshCw,
  SendHorizontal,
  Square,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { slideAnimation } from "@/app/config/motion";
import { useAuth } from "@/app/Context/AuthContext";
import { poiret } from "@/lib/fonts";
import Markdown from "./Markdown";
import { ChatMessage, ChatTopic, useChat } from "./useChat";

const SUGGESTIONS: Record<ChatTopic, string[]> = {
  general: [
    "Am I on track for my goal?",
    "What should I focus on this week?",
    "Explain my BMI and BMR simply",
    "How can I improve my sleep and recovery?",
  ],
  diet: [
    "How are my macros today?",
    "Suggest a high-protein dinner within my budget",
    "What should I eat after a workout?",
    "Rate my last few meals",
  ],
  workout: [
    "Walk me through today's workout",
    "Swap my leg day for a home version",
    "How do I progress my lifts?",
    "How much rest do I need between sets?",
  ],
};

const MAX_LEN = 2000;

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      aria-label="Copy answer"
      title="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="p-1 rounded hover:bg-gray-300 text-gray-600 transition"
    >
      {done ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

function Bubble({
  msg,
  isLast,
  streaming,
  onRegenerate,
  onRetry,
}: {
  msg: ChatMessage;
  isLast: boolean;
  streaming: boolean;
  onRegenerate: () => void;
  onRetry: () => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="self-end ml-auto max-w-[85%] rounded-xl bg-gray-700 text-white px-3 py-2 whitespace-pre-wrap break-words text-[15px]">
        {msg.content}
      </div>
    );
  }
  const waiting = streaming && isLast && !msg.content && !msg.error;
  return (
    <div className="self-start mr-auto max-w-[92%]">
      <div className="rounded-xl bg-gray-200 text-gray-800 px-3 py-2 text-[15px] break-words">
        {waiting ? (
          <span className="flex gap-1 py-1" aria-label="Ournold is thinking">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        ) : (
          <>
            {msg.content && <Markdown>{msg.content}</Markdown>}
            {streaming && isLast && msg.content && <span className="inline-block w-1.5 h-4 bg-gray-600 animate-pulse align-middle ml-0.5" />}
          </>
        )}
        {msg.error && (
          <div className="mt-1 text-red-700 text-sm" role="alert">
            <p>{msg.error.message}</p>
            <div className="flex gap-3 mt-1">
              <button onClick={onRetry} className="underline font-semibold">
                Retry
              </button>
              {(msg.error.code === "NO_KEY" || msg.error.code === "INVALID_KEY") && (
                <Link href="/updateProfile" className="underline font-semibold">
                  Update API key
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
      {isLast && !streaming && msg.content && !msg.error && (
        <div className="flex gap-1 mt-1 ml-1">
          <CopyButton text={msg.content} />
          <button
            aria-label="Regenerate answer"
            title="Regenerate"
            onClick={onRegenerate}
            className="p-1 rounded hover:bg-gray-700/40 text-gray-400 hover:text-gray-200 transition"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ChatBox({ convo }: { convo: ChatTopic }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const chat = useChat(convo, !!user && visible);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Follow the stream unless the user scrolled up to read.
  useEffect(() => {
    if (stickToBottom.current) endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.messages]);

  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible, chat.chatId]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setVisible(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || chat.streaming) return;
    stickToBottom.current = true;
    chat.send(input);
    setInput("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onScroll = () => {
    const el = scrollerRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const lastIdx = chat.messages.length - 1;

  return (
    <AnimatePresence>
      {!visible && (
        <motion.div
          key="chat-button"
          variants={slideAnimation("left")}
          initial="initial"
          exit="exit"
          animate="animate"
          className="fixed right-4 bottom-6 sm:right-5 sm:bottom-10 z-40"
        >
          <button
            aria-label="Open Ournold assistant"
            className="p-4 sm:p-5 rounded-xl bg-green-300 hover:bg-green-400 duration-[.2s] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            onClick={() => setVisible(true)}
          >
            <BotMessageSquare size={36} strokeWidth={1.5} />
          </button>
        </motion.div>
      )}

      {visible && (
        <motion.div
          key="chat-box"
          variants={slideAnimation("left")}
          initial="initial"
          exit="exit"
          animate="animate"
          role="dialog"
          aria-label="Chat with Ournold"
          className={`${poiret.className} fixed z-50 inset-0 sm:inset-auto sm:right-5 sm:bottom-5 sm:top-5 sm:w-[26rem] lg:w-[30rem] 2xl:w-[34rem] flex flex-col gap-3 p-3 sm:p-4 sm:rounded-xl sm:border border-gray-300 shadow-lg backdrop-blur-md bg-black/70 sm:bg-black/40`}
        >
          {/* Header */}
          <div className="bg-stone-50 rounded-xl w-full py-2 px-3 flex gap-3 justify-between items-center text-gray-700">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Ask Ournold</h1>
            <div className="flex items-center gap-1">
              <button
                aria-label="New chat"
                title="New chat"
                onClick={() => {
                  chat.newChat();
                  setShowHistory(false);
                }}
                className="p-1.5 rounded hover:bg-gray-200 transition"
              >
                <SquarePen size={22} strokeWidth={1.25} />
              </button>
              <button
                aria-label="Chat history"
                title="History"
                aria-pressed={showHistory}
                onClick={() => setShowHistory((s) => !s)}
                className={`p-1.5 rounded transition ${showHistory ? "bg-gray-300" : "hover:bg-gray-200"}`}
              >
                <History size={22} strokeWidth={1.25} />
              </button>
              <button
                aria-label="Close chat"
                title="Close (Esc)"
                onClick={() => setVisible(false)}
                className="p-1.5 rounded hover:bg-gray-200 transition"
              >
                <X size={24} strokeWidth={1.25} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="relative flex-1 min-h-0 rounded-xl bg-gray-800/90">
            {showHistory ? (
              <div className="absolute inset-0 overflow-y-auto p-3 text-stone-50">
                <p className="text-sm text-gray-400 mb-2">Previous conversations</p>
                {chat.chats.length === 0 && <p className="text-gray-400 text-center mt-10">No saved chats yet.</p>}
                <ul className="flex flex-col gap-2">
                  {chat.chats.map((c) => (
                    <li
                      key={c.id}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                        c.id === chat.chatId ? "border-stone-50" : "border-neutral-700"
                      } hover:border-stone-50 transition`}
                    >
                      <button
                        className="flex-1 text-left truncate text-base"
                        onClick={() => {
                          chat.openChat(c.id);
                          setShowHistory(false);
                        }}
                      >
                        {c.title}
                      </button>
                      <button
                        aria-label={`Delete chat ${c.title}`}
                        onClick={() => chat.removeChat(c.id)}
                        className="text-gray-400 hover:text-red-400 transition"
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div
                ref={scrollerRef}
                onScroll={onScroll}
                role="log"
                aria-live="polite"
                className="absolute inset-0 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3 font-sans"
                style={{ fontFamily: "var(--font-geist-sans), Inter, sans-serif" }}
              >
                {chat.messages.length === 0 ? (
                  <div className="m-auto text-center w-full">
                    <p className={`${poiret.className} text-stone-50 text-2xl mb-1`}>How can I help?</p>
                    <p className="text-gray-400 text-sm mb-4">I know your profile, meals and workouts.</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS[convo].map((s) => (
                        <button
                          key={s}
                          disabled={!user}
                          onClick={() => chat.send(s)}
                          className="text-sm text-stone-100 border border-neutral-600 hover:border-stone-50 hover:bg-white/10 rounded-full px-3 py-1.5 transition text-left"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chat.messages.map((m, i) => (
                    <Bubble
                      key={i}
                      msg={m}
                      isLast={i === lastIdx}
                      streaming={chat.streaming}
                      onRegenerate={chat.regenerate}
                      onRetry={chat.retry}
                    />
                  ))
                )}
                <div ref={endRef} className="h-px shrink-0" />
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={submit} className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                maxLength={MAX_LEN}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={!user}
                aria-label="Message"
                placeholder={user ? "Ask anything…  (Shift+Enter for a new line)" : "Please sign in to chat..."}
                className="w-full resize-none bg-stone-50 rounded-xl p-3 text-base text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
              />
              {input.length > MAX_LEN - 200 && (
                <span className="absolute right-2 -top-5 text-xs text-gray-400">
                  {input.length}/{MAX_LEN}
                </span>
              )}
            </div>
            {chat.streaming ? (
              <button
                type="button"
                onClick={chat.stop}
                aria-label="Stop generating"
                className="bg-stone-50 hover:bg-gray-200 active:scale-95 rounded-xl text-gray-700 p-3 transition shadow-md"
              >
                <Square size={22} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!user || !input.trim()}
                aria-label="Send message"
                className="bg-stone-50 hover:bg-gray-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-xl text-gray-700 p-3 transition shadow-md"
              >
                <SendHorizontal size={22} />
              </button>
            )}
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
