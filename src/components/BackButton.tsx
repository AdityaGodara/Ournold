"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Standalone back chevron for pages outside the dashboard shell. */
export default function BackButton() {
  const router = useRouter();
  return (
    <button
      aria-label="Go back"
      onClick={() => router.back()}
      className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10 text-stone-50 hover:text-gray-500 hover:scale-[1.3] transition rounded focus-visible:outline-2 focus-visible:outline-white"
    >
      <ChevronLeft size={32} color="#ffffff" strokeWidth={1} />
    </button>
  );
}
