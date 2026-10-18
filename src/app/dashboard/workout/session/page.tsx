"use client";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Plus, Timer, Trash2, X } from "lucide-react";
import { useAuth } from "@/app/Context/AuthContext";
import DashboardShell from "@/components/DashboardShell";
import Loader from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { api, localDate, toApiError } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { useApi } from "@/lib/useApi";
import { PlanDoc, firstNumber, todayName } from "../types";

interface SetRow {
  reps: string;
  weight: string;
  done: boolean;
}
interface ExRow {
  name: string;
  rest: number;
  target: string;
  sets: SetRow[];
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Logger() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const { userData } = useAuth();
  const dayName = params.get("day") || todayName();
  const { data, loading } = useApi<{ plan: PlanDoc | null }>(userData?.uid ? "/api/workout/plan" : null);

  const [exercises, setExercises] = useState<ExRow[] | null>(null);
  const [title, setTitle] = useState("Workout");
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState(0);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const started = useRef(Date.now());

  // Prefill from the plan's day once it has loaded (or start empty for a free-form workout).
  useEffect(() => {
    if (loading || exercises) return;
    const day = data?.plan?.plan.days.find((d) => d.day === dayName);
    if (day && !day.rest) {
      setTitle(day.focus || "Workout");
      setExercises(
        day.exercises.map((e) => ({
          name: e.name,
          rest: e.rest_sec,
          target: e.reps,
          sets: Array.from({ length: e.sets }, () => ({ reps: String(firstNumber(e.reps)), weight: "", done: false })),
        }))
      );
    } else {
      setExercises([]);
    }
  }, [loading, data, dayName, exercises]);

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
      setRest((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const update = (ei: number, si: number, patch: Partial<SetRow>) =>
    setExercises((prev) =>
      prev!.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) }))
    );

  const toggleDone = (ei: number, si: number) => {
    const row = exercises![ei].sets[si];
    update(ei, si, { done: !row.done });
    if (!row.done) setRest(exercises![ei].rest || 60); // start rest timer when a set is completed
  };

  const addSet = (ei: number) =>
    setExercises((prev) =>
      prev!.map((e, i) => {
        if (i !== ei) return e;
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, { reps: last?.reps ?? "10", weight: last?.weight ?? "", done: false }] };
      })
    );

  const doneSets = useMemo(() => (exercises ?? []).reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0), [exercises]);

  const finish = async () => {
    const logged = (exercises ?? [])
      .map((e) => ({
        name: e.name,
        sets: e.sets
          .filter((s) => s.done)
          .map((s) => ({ reps: Math.max(0, Math.round(Number(s.reps) || 0)), weight: Math.max(0, Number(s.weight) || 0), done: true })),
      }))
      .filter((e) => e.sets.length);
    if (!logged.length) return toast("Tick off at least one set to log this workout.", "info");
    setSaving(true);
    try {
      await api.post("/api/workout/sessions", {
        name: title,
        local_date: localDate(),
        duration_min: Math.max(1, Math.round(elapsed / 60)),
        exercises: logged,
        source: "manual",
      });
      toast("Workout saved. Nice work! 💪", "success");
      router.push("/dashboard/workout");
    } catch (e) {
      toast(toApiError(e).message, "error");
      setSaving(false);
    }
  };

  if (!exercises) return <Loader fullscreen={false} />;

  const field =
    "w-16 sm:w-20 p-1.5 rounded bg-transparent border border-stone-500 focus:border-stone-50 focus:outline-none text-center text-stone-50";

  return (
    <div className={`${poiret.className} max-w-2xl mx-auto px-4 text-stone-50 pb-28`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <input
          aria-label="Workout name"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl sm:text-3xl bg-transparent border-b border-transparent hover:border-stone-500 focus:border-stone-50 focus:outline-none min-w-0 flex-1"
        />
        <span className="flex items-center gap-1 text-xl tabular-nums text-gray-300" aria-label="Elapsed time">
          <Timer size={20} strokeWidth={1.25} /> {mmss(elapsed)}
        </span>
      </div>

      {exercises.length === 0 && (
        <p className="text-gray-400 mb-4">
          {dayName} has no planned exercises (rest day or no plan yet). Add exercises below to log a free workout.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {exercises.map((ex, ei) => (
          <section key={ei} className="border-2 border-stone-50 rounded-xl p-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <h2 className="text-xl font-normal">{ex.name}</h2>
                {ex.target && <p className="text-sm text-gray-400">Target: {ex.target} reps</p>}
              </div>
              <button
                aria-label={`Remove ${ex.name}`}
                onClick={() => setExercises((p) => p!.filter((_, i) => i !== ei))}
                className="text-gray-500 hover:text-red-400 transition"
              >
                <Trash2 size={18} strokeWidth={1.5} />
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] sm:grid-cols-[2rem_6rem_6rem_2.5rem] gap-2 text-xs text-gray-400 items-center justify-center">
                <span>Set</span>
                <span className="text-center">Reps</span>
                <span className="text-center">Weight (kg)</span>
                <span />
              </div>
              {ex.sets.map((s, si) => (
                <div key={si} className="grid grid-cols-[2rem_1fr_1fr_2.5rem] sm:grid-cols-[2rem_6rem_6rem_2.5rem] gap-2 items-center">
                  <span className="text-gray-400">{si + 1}</span>
                  <input
                    aria-label={`${ex.name} set ${si + 1} reps`}
                    inputMode="numeric"
                    className={field + " w-full"}
                    value={s.reps}
                    onChange={(e) => update(ei, si, { reps: e.target.value.replace(/[^\d]/g, "") })}
                  />
                  <input
                    aria-label={`${ex.name} set ${si + 1} weight`}
                    inputMode="decimal"
                    placeholder="BW"
                    className={field + " w-full"}
                    value={s.weight}
                    onChange={(e) => update(ei, si, { weight: e.target.value.replace(/[^\d.]/g, "") })}
                  />
                  <button
                    role="checkbox"
                    aria-checked={s.done}
                    aria-label={`Mark set ${si + 1} done`}
                    onClick={() => toggleDone(ei, si)}
                    className={`h-9 w-9 rounded-lg border flex items-center justify-center transition ${
                      s.done ? "bg-green-500 border-green-500" : "border-stone-500 hover:border-stone-50"
                    }`}
                  >
                    {s.done && <Check size={18} />}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => addSet(ei)} className="mt-3 text-sm text-gray-300 hover:text-stone-50 flex items-center gap-1 transition">
              <Plus size={14} /> Add set
            </button>
          </section>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = newName.trim();
          if (!name) return;
          setExercises((p) => [...p!, { name, rest: 60, target: "", sets: [{ reps: "10", weight: "", done: false }] }]);
          setNewName("");
        }}
      >
        <input
          aria-label="Add exercise"
          placeholder="Add an exercise…"
          maxLength={80}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 p-2 rounded bg-transparent border border-stone-500 focus:border-stone-50 focus:outline-none"
        />
        <button type="submit" className="px-4 rounded border border-stone-50 hover:bg-stone-50 hover:text-black transition">
          Add
        </button>
      </form>

      {/* Sticky action bar with rest timer */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-black/80 backdrop-blur border-t border-neutral-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {rest > 0 ? (
            <div className="flex items-center gap-3" role="timer" aria-live="off">
              <span className="text-2xl tabular-nums text-yellow-300">Rest {mmss(rest)}</span>
              <button onClick={() => setRest(0)} aria-label="Skip rest" className="text-gray-400 hover:text-stone-50">
                <X size={18} />
              </button>
            </div>
          ) : (
            <span className="text-gray-400">{doneSets} set{doneSets === 1 ? "" : "s"} done</span>
          )}
          <button
            onClick={finish}
            disabled={saving || doneSets === 0}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-40 transition px-6 py-2 rounded-lg"
          >
            {saving ? "Saving…" : "Finish workout"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <DashboardShell active="workout">
      <Suspense fallback={<Loader fullscreen={false} />}>
        <Logger />
      </Suspense>
    </DashboardShell>
  );
}
