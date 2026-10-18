"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Dumbbell, Moon, Play, RefreshCw, Shuffle, Sparkles } from "lucide-react";
import { ErrorState, Skeleton } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { api, toApiError } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { useApi } from "@/lib/useApi";
import { PlanDoc, PlanDay, WEEKDAYS, todayName } from "./types";

const EQUIPMENT = [
  { v: "gym", label: "Gym" },
  { v: "home", label: "Home (dumbbells)" },
  { v: "bodyweight", label: "Bodyweight" },
] as const;

function Generator({ onDone, initial, compact }: { onDone: (p: PlanDoc) => void; initial?: PlanDoc["params"]; compact?: boolean }) {
  const toast = useToast();
  const [equipment, setEquipment] = useState<PlanDoc["params"]["equipment"]>(initial?.equipment ?? "gym");
  const [days, setDays] = useState(initial?.days_per_week ?? 4);
  const [minutes, setMinutes] = useState(initial?.minutes_per_session ?? 45);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<{ plan: PlanDoc }>("/api/workout/plan", {
        equipment,
        days_per_week: days,
        minutes_per_session: minutes,
      });
      onDone(data.plan);
      toast("Your new plan is ready", "success");
    } catch (e) {
      toast(toApiError(e).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const sel =
    "bg-transparent border border-stone-500 focus:border-stone-50 focus:outline-none rounded p-2 text-stone-50 [&>option]:text-black";

  return (
    <div className={`flex flex-col gap-3 ${compact ? "" : "items-center text-center"}`}>
      <div className="flex flex-wrap gap-3 justify-center">
        <label className="text-sm flex flex-col gap-1">
          Equipment
          <select className={sel} value={equipment} onChange={(e) => setEquipment(e.target.value as typeof equipment)}>
            {EQUIPMENT.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1">
          Days / week
          <select className={sel} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1">
          Session length
          <select className={sel} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {[30, 45, 60, 75, 90].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        onClick={generate}
        disabled={busy}
        className="self-center bg-green-500 hover:bg-green-600 disabled:opacity-60 transition px-5 py-2 rounded-lg flex items-center gap-2"
      >
        {busy ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
        {busy ? "Designing your plan…" : compact ? "Regenerate plan" : "Generate my plan"}
      </button>
    </div>
  );
}

function DayCard({ day, onSwap, swapping }: { day: PlanDay; onSwap: (ex: string) => void; swapping: string | null }) {
  if (day.rest || !day.exercises.length) {
    return (
      <div className="flex items-center gap-3 text-gray-300 py-6 justify-center">
        <Moon strokeWidth={1.25} /> {day.focus || "Rest day"}. Recovery is where you grow.
      </div>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-neutral-700">
      {day.exercises.map((e) => (
        <li key={e.name} className="py-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg">{e.name}</p>
            <p className="text-sm text-gray-400">
              {e.sets} × {e.reps} · rest {e.rest_sec}s
            </p>
            {e.notes && <p className="text-sm text-gray-500 mt-0.5">{e.notes}</p>}
          </div>
          <button
            onClick={() => onSwap(e.name)}
            disabled={swapping !== null}
            aria-label={`Swap ${e.name}`}
            title="Swap for an alternative"
            className="p-2 text-gray-400 hover:text-stone-50 transition disabled:opacity-40"
          >
            <Shuffle size={18} className={swapping === e.name ? "animate-spin" : ""} />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function PlanSection() {
  const toast = useToast();
  const { data, loading, error, refetch, setData } = useApi<{ plan: PlanDoc | null }>("/api/workout/plan");
  const [selected, setSelected] = useState(todayName());
  const [swapping, setSwapping] = useState<string | null>(null);
  const [showGen, setShowGen] = useState(false);

  const doc = data?.plan ?? null;
  const day = doc?.plan.days.find((d) => d.day === selected);

  const swap = async (exercise: string) => {
    setSwapping(exercise);
    try {
      const res = await api.post<{ plan: PlanDoc }>("/api/workout/plan/swap", { day: selected, exercise });
      setData({ plan: res.data.plan });
    } catch (e) {
      toast(toApiError(e).message, "error");
    } finally {
      setSwapping(null);
    }
  };

  return (
    <section className={`${poiret.className} border-2 border-stone-50 rounded-xl p-4 sm:p-6 text-stone-50`} aria-labelledby="plan-h">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 id="plan-h" className="text-2xl sm:text-3xl font-normal flex items-center gap-2">
          <Dumbbell strokeWidth={1.25} /> {doc?.plan.title ?? "Your weekly plan"}
        </h2>
        {doc && (
          <button onClick={() => setShowGen((s) => !s)} className="text-sm text-gray-300 hover:text-stone-50 transition flex items-center gap-1">
            <RefreshCw size={14} /> {showGen ? "Close" : "New plan"}
          </button>
        )}
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : loading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : !doc ? (
        <div className="flex flex-col gap-4 items-center py-4">
          <p className="text-gray-300 text-center max-w-md">
            Get a personalised 7-day plan built from your goal, body data and schedule. You can swap any exercise.
          </p>
          <Generator onDone={(p) => setData({ plan: p })} />
        </div>
      ) : (
        <>
          {showGen && (
            <div className="mb-5 pb-5 border-b border-neutral-700">
              <Generator
                compact
                initial={doc.params}
                onDone={(p) => {
                  setData({ plan: p });
                  setShowGen(false);
                }}
              />
            </div>
          )}
          <p className="text-gray-300 mb-4">{doc.plan.summary}</p>
          <div role="tablist" aria-label="Plan days" className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
            {WEEKDAYS.slice(1).concat(WEEKDAYS[0]).map((d) => {
              const pd = doc.plan.days.find((x) => x.day === d);
              const active = d === selected;
              return (
                <button
                  key={d}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelected(d)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg border text-sm transition ${
                    active ? "bg-stone-50 text-black border-stone-50" : "border-neutral-600 hover:border-stone-50"
                  }`}
                >
                  {d.slice(0, 3)}
                  <span className={`block text-[11px] ${active ? "text-gray-600" : "text-gray-500"}`}>
                    {pd?.rest ? "Rest" : pd?.focus}
                  </span>
                </button>
              );
            })}
          </div>

          {day && (
            <div role="tabpanel" className="mt-3">
              <p className="text-xl mb-1">{day.rest ? "" : day.focus}</p>
              <DayCard day={day} onSwap={swap} swapping={swapping} />
              {!day.rest && day.exercises.length > 0 && (
                <Link
                  href={`/dashboard/workout/session?day=${encodeURIComponent(day.day)}`}
                  className="mt-4 inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 transition px-5 py-2 rounded-lg"
                >
                  <Play size={18} /> Start {day.day === todayName() ? "today's" : day.day} workout
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
