"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { poiret } from "@/lib/fonts";

type Kind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

const ToastContext = createContext<(message: string, kind?: Kind) => void>(() => {});

export const useToast = () => useContext(ToastContext);

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
const COLORS = { success: "#4ade80", error: "#f87171", info: "#84b5ff" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-3), { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(92vw,26rem)] pointer-events-none"
      >
        <AnimatePresence>
          {items.map((t) => {
            const Icon = ICONS[t.kind];
            return (
              <motion.div
                key={t.id}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0, y: 20 }}
                role={t.kind === "error" ? "alert" : "status"}
                className={`${poiret.className} pointer-events-auto flex items-start gap-3 rounded-xl border border-neutral-700 bg-neutral-900/95 backdrop-blur-sm px-4 py-3 text-stone-50 shadow-lg`}
              >
                <Icon size={20} strokeWidth={1.5} color={COLORS[t.kind]} className="mt-0.5 shrink-0" />
                <p className="text-base leading-snug">{t.message}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
