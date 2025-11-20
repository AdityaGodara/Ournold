"use client";

import React from "react";

interface InsightCardProps {
  title: string;
  description: string;
}

export default function InsightCard({ title, description }: InsightCardProps) {
  return (
    <div className="
      bg-neutral-900 
      rounded-xl 
      border 
      border-neutral-700 
      p-5 
      hover:scale-[1.02] 
      transition 
      shadow-md
      hover:shadow-lg
      cursor-default
    ">
      <h3 className="text-xl font-semibold text-stone-50 mb-2">
        {title}
      </h3>
      <p className="text-stone-300 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
