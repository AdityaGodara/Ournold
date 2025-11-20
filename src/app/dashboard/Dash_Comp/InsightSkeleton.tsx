import React from "react";

export default function InsightSkeleton() {
  return (
    <div className="animate-pulse bg-white/5 border border-white/10 rounded-2xl p-5 h-[150px] flex flex-col gap-4">
      <div className="w-1/2 h-6 bg-white/10 rounded-md"></div>
      <div className="w-full h-4 bg-white/10 rounded-md"></div>
      <div className="w-3/4 h-4 bg-white/10 rounded-md"></div>
    </div>
  );
}
