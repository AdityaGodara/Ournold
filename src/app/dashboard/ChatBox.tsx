"use client";
import React, { useState, useEffect, useRef, FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { slideAnimation } from "../config/motion";
import { Poiret_One } from "next/font/google";
import axios from "axios";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, getAuthToken } from "@/app/firebase/config";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BotMessageSquare, X } from "lucide-react";

const fontPoiretOne = Poiret_One({
  subsets: ["latin"],
  weight: ["400"],
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBox({convo}: {convo: string}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // ✅ Track Firebase login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Improved auto scroll with RAF for better timing
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: "smooth",
          block: "end"
        });
      });
    };

    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // ✅ Send message to backend (FastAPI)
  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const newMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = await getAuthToken();

      // ✅ Send message to FastAPI
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ask`,
        {
          user_id: user.uid,
          query: input,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          type: convo
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const reply = res.data.answer || "No response from AI.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Error: Unable to connect to AI server. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {!visible && (
        <motion.div
          key="chat-button"
          variants={slideAnimation("left")}
          initial="initial"
          exit="exit"
          animate="animate"
          className="fixed right-5 bottom-10"
        >
          <div 
            className="p-5 rounded-xl bg-green-300 hover:bg-green-400 duration-[.2s] cursor-pointer" 
            onClick={() => setVisible(!visible)}
          >
            <BotMessageSquare size={36} strokeWidth={1.5} />
          </div>
        </motion.div>
      )}
      {visible && (
        <motion.div
          key="chat-box"
          variants={slideAnimation("left")}
          initial="initial"
          exit="exit"
          animate="animate"
          className={`${fontPoiretOne.className} fixed right-5 top-5 p-4 sm:p-5 w-full sm:w-[90vw] md:w-[70vw] lg:w-[50vw] xl:w-[35vw] 2xl:w-[30vw] border border-gray-300 rounded-xl shadow-lg backdrop-blur-sm bg-black/30 z-50`}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-3 sm:gap-4 h-full">
            {/* Header */}
            <div className="bg-stone-50 rounded-xl w-full py-2 px-3 sm:py-3 flex gap-5 justify-between items-center">
              <h1 className="text-lg sm:text-xl md:text-2xl text-center font-bold text-gray-700 tracking-tight">
                Ask Ournold :
              </h1>
              <X 
                size={25} 
                strokeWidth={1} 
                onClick={() => setVisible(!visible)} 
                className="hover:text-gray-500 transition cursor-pointer" 
              />
            </div>

            {/* Chat Area - Added ref and scroll-smooth */}
            <div 
              ref={chatContainerRef}
              className="h-[60vh] bg-gray-800/90 rounded-xl overflow-y-auto p-3 sm:p-4 flex flex-col scroll-smooth"
              style={{ scrollBehavior: 'smooth' }}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm sm:text-base">
                  Start a conversation...
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg my-1 ${
                      msg.role === "user"
                        ? "bg-gray-700 text-white self-end ml-auto"
                        : "bg-gray-200 text-gray-800 self-start mr-auto"
                    } w-fit max-w-[80%] whitespace-pre-wrap`}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ))
              )}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} style={{ height: '1px' }} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={sendMessage}
              className="flex gap-2 sm:gap-3 items-center"
            >
              <input
                type="text"
                placeholder={
                  user ? "Message here..." : "Please sign in to chat..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!user || loading}
                className="flex-1 bg-stone-50 rounded-xl p-2 sm:p-3 text-sm sm:text-base text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
              />
              <button
                type="submit"
                disabled={!user || loading}
                className="bg-stone-50 hover:bg-gray-200 active:scale-95 rounded-xl text-gray-700 font-semibold p-2 sm:p-3 px-4 sm:px-6 text-sm sm:text-base transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
              >
                {loading ? "..." : "Send"}
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}