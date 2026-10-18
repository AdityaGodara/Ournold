"use client";
import { useEffect } from "react";
import Link from "next/link";
import { poiret } from "@/lib/fonts";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={`${poiret.className} min-h-screen flex flex-col items-center justify-center gap-5 text-stone-50 px-6 text-center`}>
      <h1 className="text-4xl">Something went wrong</h1>
      <p className="text-gray-400 max-w-md">An unexpected error occurred. Your data is safe, so please try again.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="border border-stone-50 hover:bg-stone-50 hover:text-black transition px-5 py-2 rounded-xl">
          Try again
        </button>
        <Link href="/" className="border border-neutral-600 hover:border-stone-50 transition px-5 py-2 rounded-xl">
          Home
        </Link>
      </div>
    </div>
  );
}
