import React from "react";

/** The app's honeycomb loader (styles live in loading.css). */
export default function Loader({ fullscreen = true }: { fullscreen?: boolean }) {
  return (
    <div
      className={`${fullscreen ? "w-full h-screen bg-black" : "w-full py-10"} flex justify-center items-center`}
      role="status"
      aria-label="Loading"
    >
      <div className="honeycomb">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-gray-500 animate-pulse ${className}`} aria-hidden />;
}

/** Inline error with an optional retry button, in the existing theme. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center text-stone-50" role="alert">
      <p className="text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="border border-stone-50 rounded-xl px-4 py-1 hover:bg-stone-50 hover:text-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Retry
        </button>
      )}
    </div>
  );
}
