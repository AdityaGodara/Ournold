"use client";
import React from "react";
import { Check, Flame, Trophy } from "lucide-react";
import { ErrorState, Skeleton } from "@/components/ui/Loader";
import { localDate } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { useApi } from "@/lib/useApi";
import { Stats } from "./types";

const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function Bars({ data, label, unit }: { data: { key: string; value: number }[]; label: string; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure aria-label={label}>
      <figcaption className="text-gray-300 mb-2">{label}</figcaption>
      <div className="flex items-end gap-1.5 h-32" role="img" aria-label={`${label}: ${data.map((d) => `${d.key} ${d.value}`).join(", ")}`}>
        {data.map((d) => (
          <div key={d.key} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group">
            <span className="text-[11px] text-gray-400 opacity-0 group-hover:opacity-100 transition">{d.value}{unit}</span>
            <div
              className="w-full rounded-t bg-[#6bcfed] min-h-[2px] transition-all duration-500"
              style={{ height: `${(d.value / max) * 100}%`, opacity: d.value ? 1 : 0.25 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        {data.map((d) => (
          <span key={d.key} className="flex-1 text-center text-[10px] text-gray-500 truncate">
            {d.key}
          </span>
        ))}
      </div>
    </figure>
  );
}

export default function ProgressSection({ refreshKey }: { refreshKey?: number }) {
  const { data, loading, error, refetch } = useApi<Stats>("/api/workout/stats", { today: localDate(), k: refreshKey ?? 0 });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (loading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <section className={`${poiret.className} text-stone-50 flex flex-col gap-6`} aria-labelledby="progress-h">
      <h2 id="progress-h" className="text-2xl sm:text-3xl font-normal">
        Progress
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-neutral-700 rounded-xl p-4 flex items-center gap-3">
          <Flame color="#ffb434" strokeWidth={1.25} size={32} />
          <div>
            <p className="text-3xl leading-none">{data.streak}</p>
            <p className="text-sm text-gray-400">day streak</p>
          </div>
        </div>
        <div className="border border-neutral-700 rounded-xl p-4 flex items-center gap-3">
          <Trophy color="#f1c232" strokeWidth={1.25} size={32} />
          <div>
            <p className="text-3xl leading-none">{data.total_sessions}</p>
            <p className="text-sm text-gray-400">sessions (last 100 days)</p>
          </div>
        </div>
        <div className="border border-neutral-700 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-2">Last 7 days</p>
          <div className="flex justify-between">
            {data.strip.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1" title={shortDate(d.date)}>
                <span
                  className={`h-7 w-7 rounded-full flex items-center justify-center border ${
                    d.done ? "bg-green-500 border-green-500" : "border-neutral-600"
                  }`}
                >
                  {d.done && <Check size={14} />}
                </span>
                <span className="text-[10px] text-gray-500">
                  {new Date(`${d.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Bars label="Sessions per week" unit="" data={data.weekly.map((w) => ({ key: shortDate(w.week), value: w.sessions }))} />
        <Bars label="Weekly volume (kg lifted)" unit="kg" data={data.weekly.map((w) => ({ key: shortDate(w.week), value: Math.round(w.volume) }))} />
      </div>

      {data.best.length > 0 && (
        <div>
          <p className="text-gray-300 mb-2">Personal bests</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.best.map((b) => (
              <li key={b.name} className="flex justify-between border border-neutral-700 rounded-lg px-3 py-2">
                <span>{b.name}</span>
                <span className="text-gray-400">
                  {b.max_weight > 0 ? `${b.max_weight} kg · ` : ""}
                  {b.max_reps} reps
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
