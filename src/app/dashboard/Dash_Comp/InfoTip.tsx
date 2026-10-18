import React from "react";
import { Info } from "lucide-react";

/** Hover- and focus-accessible tooltip used on metric cards. */
export default function InfoTip({ text, label }: { text: string; label: string }) {
  return (
    <div className="relative group shrink-0">
      <button type="button" aria-label={label} className="rounded focus-visible:outline-2 focus-visible:outline-white">
        <Info color="#939393ff" strokeWidth={1} className="cursor-pointer" />
      </button>
      <div
        role="tooltip"
        className="absolute top-full right-0 mt-2 w-64 sm:w-72 text-sm bg-stone-900 text-stone-100 p-3 rounded-lg shadow-lg z-50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"
      >
        {text}
      </div>
    </div>
  );
}
