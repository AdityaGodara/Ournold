"use client";
import React from "react";
import { Flame, Timer, Trash2 } from "lucide-react";
import { ErrorState, Skeleton } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { api, toApiError } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { useApi } from "@/lib/useApi";
import { SessionDoc } from "./types";

export default function HistorySection({ onChange }: { onChange: () => void }) {
  const toast = useToast();
  const { data, loading, error, refetch, setData } = useApi<{ data: SessionDoc[] }>("/api/workout/sessions", { limit: 10 });

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/workout/sessions/${id}`);
      setData({ data: (data?.data ?? []).filter((s) => s.id !== id) });
      onChange();
    } catch (e) {
      toast(toApiError(e).message, "error");
    }
  };

  return (
    <section className={`${poiret.className} text-stone-50`} aria-labelledby="history-h">
      <h2 id="history-h" className="text-2xl sm:text-3xl font-normal mb-3">
        Recent sessions
      </h2>
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : loading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : !data?.data.length ? (
        <p className="text-gray-400">No sessions yet. Start a workout from your plan or use the rep counter.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.data.map((s) => (
            <li key={s.id} className="border border-neutral-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg truncate">{s.name}</p>
                <p className="text-sm text-gray-400">
                  {new Date(`${s.local_date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ·{" "}
                  {s.exercises.length} exercise{s.exercises.length === 1 ? "" : "s"} · {s.total_reps} reps
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-300 shrink-0">
                <span className="flex items-center gap-1"><Timer size={14} /> {s.duration_min}m</span>
                <span className="flex items-center gap-1"><Flame size={14} color="#ffb434" /> {s.calories}</span>
                <button aria-label={`Delete session ${s.name}`} onClick={() => remove(s.id)} className="text-gray-500 hover:text-red-400 transition">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
