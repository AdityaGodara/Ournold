"use client";
import React, { useState } from "react";
import { Eye, EyeOff, ExternalLink } from "lucide-react";

/** Gemini key input with a short explainer, so users know why it's needed and where to get one (free). */
export default function GeminiKeyField({
  value,
  onChange,
  configured,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Profile page: a key is already stored (it is never sent back to the browser). */
  configured?: boolean;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="gemini-key" className="text-lg">
        Gemini API key {required && <span className="text-orange-300">*</span>}
      </label>
      <div className="relative">
        <input
          id="gemini-key"
          name="gemini_key"
          type={show ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder={configured ? "••••••••••  (saved: leave empty to keep it)" : "Paste your key (starts with AIza…)"}
          className="w-full border border-stone-500 focus:border-stone-50 rounded-md px-3 py-2 pr-10 bg-transparent outline-none transition"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide key" : "Show key"}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-stone-50"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <p className="text-sm text-gray-400 leading-snug">
        Ournold&apos;s AI runs on <em>your</em> free Google Gemini key, so you stay in control of usage. It&apos;s stored
        encrypted on the server and never shown again.{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="underline inline-flex items-center gap-1 text-stone-200"
        >
          Get a free key <ExternalLink size={12} />
        </a>
      </p>
    </div>
  );
}
