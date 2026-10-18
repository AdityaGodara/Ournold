import React from "react";
import { Skeleton } from "./Loader";

/** Placeholder with the same outline-card look as the real metric cards. */
export function CardSkeleton({ className = "", lines = 2 }: { className?: string; lines?: number }) {
  return (
    <div
      className={`border-2 border-neutral-700 rounded-xl p-5 flex flex-col gap-3 w-full md:min-w-[20rem] ${className}`}
      aria-hidden
    >
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-12 w-1/2" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-3/4" />
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 250 }: { height?: number }) {
  return (
    <div className="w-full max-w-[34rem] p-4 md:p-6" aria-hidden>
      <Skeleton className="h-7 w-40 mb-4" />
      <div style={{ height }} className="w-full rounded-lg bg-gray-500 animate-pulse" />
    </div>
  );
}

function Pill() {
  return <Skeleton className="h-16 w-full rounded-xl" />;
}

function NavSkeleton() {
  return (
    <div className="flex justify-center items-end gap-6 md:gap-10 mt-16 sm:mt-5 mb-8" aria-hidden>
      <Skeleton className="h-6 w-14" />
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-6 w-20" />
    </div>
  );
}

/** Page-shaped loading placeholder used by route `loading.tsx` files and while auth resolves. */
export default function PageSkeleton({ variant }: { variant: "dashboard" | "food" | "workout" }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading page" className="min-h-screen px-4 pb-24">
      <NavSkeleton />

      {variant === "dashboard" && (
        <div className="flex flex-col items-center gap-6">
          <div className="grid gap-3 sm:grid-cols-3 w-full max-w-[64rem]">
            <Pill />
            <Pill />
            <Pill />
          </div>
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full md:w-auto">
            <CardSkeleton />
            <CardSkeleton lines={1} />
            <CardSkeleton lines={3} />
          </div>
          <div className="flex flex-col lg:flex-row gap-6 w-full justify-center items-center">
            <ChartSkeleton height={280} />
            <ChartSkeleton height={280} />
          </div>
        </div>
      )}

      {variant === "food" && (
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-3">
            <Skeleton className="h-12 w-48 rounded-md" />
            <Skeleton className="h-12 w-40 rounded-md" />
          </div>
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            <div className="w-full lg:w-[30%] flex flex-col gap-3">
              <Skeleton className="h-8 w-24" />
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <div className="w-full lg:w-[70%] flex flex-col xl:flex-row gap-5">
              <div className="flex flex-col gap-4 w-full xl:w-auto xl:min-w-[20rem]">
                <Skeleton className="h-8 w-24 mx-auto" />
                <CardSkeleton lines={1} />
                <CardSkeleton lines={1} />
              </div>
              <Skeleton className="h-[320px] w-full xl:w-1/2 rounded-md" />
            </div>
          </div>
        </div>
      )}

      {variant === "workout" && (
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <div className="border-2 border-neutral-700 rounded-xl p-6 flex flex-col gap-4">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-14 shrink-0 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Pill />
            <Pill />
            <Pill />
          </div>
        </div>
      )}
    </div>
  );
}
