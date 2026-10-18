"use client";
import React from "react";
import { poiret } from "@/lib/fonts";

/** Outline card matching the app's existing card style. */
export function StatCard({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${poiret.className} border-2 border-stone-50 rounded-xl p-4 sm:p-5 text-stone-50 flex flex-col gap-3 ${className}`}>
      <h2 className="text-xl font-normal flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Circular progress ring. Pass `value` 0..1 (values above 1 are capped visually). */
export function Ring({
  value,
  size = 120,
  stroke = 10,
  color = "#f3f3f3",
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
  label: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2f2f2f" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 0.9s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Horizontal progress bar with label and values. */
export function Bar({
  label,
  value,
  max,
  unit = "g",
  color = "#6bcfed",
}: {
  label: string;
  value: number;
  max: number | null;
  unit?: string;
  color?: string;
}) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-gray-400">
          {Math.round(value)}
          {max ? ` / ${max}` : ""} {unit}
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-neutral-700 overflow-hidden"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/** A gentle, encouraging note (never red). */
export function Note({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "care" }) {
  return (
    <p className={`text-sm leading-snug rounded-lg px-3 py-2 ${tone === "care" ? "bg-orange-300/10 text-orange-200" : "bg-white/5 text-stone-300"}`}>
      {children}
    </p>
  );
}

export function BigNumber({ children, unit }: { children: React.ReactNode; unit?: string }) {
  return (
    <p className="text-4xl sm:text-5xl leading-none">
      {children}
      {unit && <span className="text-xl text-gray-500 ml-1">{unit}</span>}
    </p>
  );
}
