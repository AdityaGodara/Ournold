"use client";
import React from "react";
import { Check, Flame, Lightbulb, Scale, Target, Trophy, Zap } from "lucide-react";
import { useAuth } from "@/app/Context/AuthContext";
import { ErrorState } from "@/components/ui/Loader";
import { CardSkeleton } from "@/components/ui/Skeletons";
import { BigNumber, Note, Ring, StatCard } from "@/components/ui/Stats";
import { userTimezone } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { DashboardStats } from "@/lib/statsTypes";
import { useApi } from "@/lib/useApi";

const weekday = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "narrow" });
const signed = (n: number, d = 1) => `${n > 0 ? "+" : ""}${n.toFixed(d)}`;

function GoalCard({ s }: { s: DashboardStats }) {
  const g = s.goal;
  if (!g) {
    return (
      <StatCard title="Goal progress" icon={<Target strokeWidth={1.25} />}>
        <Note>Add your height and weight in Update Profile to see your goal progress.</Note>
      </StatCard>
    );
  }
  const verb = g.kind === "lose" ? "lost" : "gained";
  const moved = Math.abs(g.start - g.current);
  const right = g.kind === "lose" ? g.current <= g.start : g.current >= g.start;

  return (
    <StatCard title="Goal progress" icon={<Target strokeWidth={1.25} />}>
      {g.kind === "maintain" ? (
        <>
          <p className="text-3xl">{g.in_range ? "In your healthy range" : "Near your healthy range"}</p>
          <p className="text-gray-400">
            Healthy range for your height: {g.low}-{g.high} kg. You&apos;re at {g.current} kg.
          </p>
        </>
      ) : (
        <div className="flex items-center gap-5">
          <Ring value={g.progress ?? 0} label="Progress to goal weight" color="#6bcfed">
            <span className="text-2xl">{Math.round((g.progress ?? 0) * 100)}%</span>
          </Ring>
          <div className="min-w-0">
            <p className="text-lg leading-tight">
              {right && moved >= 0.1 ? `${moved.toFixed(1)} kg ${verb} so far 🎉` : "Your journey starts here"}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {g.start} → <span className="text-stone-50">{g.current}</span> → {g.target} kg
            </p>
            {g.next_milestone !== undefined && (
              <p className="text-sm mt-2 text-stone-300">
                Next milestone: <span className="text-stone-50">{g.next_milestone} kg</span> ({g.to_milestone} kg to go)
              </p>
            )}
          </div>
        </div>
      )}
    </StatCard>
  );
}

function TrendCard({ s }: { s: DashboardStats }) {
  const t = s.trend;
  return (
    <StatCard title="Weight trend" icon={<Scale strokeWidth={1.25} />}>
      <div className="flex items-end gap-4 flex-wrap">
        <BigNumber unit="kg">{t.avg7 ?? "—"}</BigNumber>
        {t.rate_per_week !== null && (
          <p className="text-xl text-gray-400 pb-1">{signed(t.rate_per_week, 2)} kg / week</p>
        )}
      </div>
      <p className="text-xs text-gray-500 -mt-1">7-day average, which smooths out daily ups and downs</p>
      <Note tone="info">{t.message}</Note>
    </StatCard>
  );
}

function ConsistencyCard({ s }: { s: DashboardStats }) {
  const { strip, active_days } = s.consistency;
  return (
    <StatCard title="This week" icon={<Check strokeWidth={1.25} />}>
      <p className="text-2xl">
        You showed up <span className="text-green-400">{active_days}</span> of 7 days
        {active_days >= 5 ? " 🔥" : active_days > 0 ? "" : ". A new week is a new start."}
      </p>
      <div className="flex justify-between" role="list" aria-label="Last 7 days">
        {strip.map((d) => {
          const on = d.food || d.workout;
          return (
            <div key={d.date} role="listitem" className="flex flex-col items-center gap-1">
              <span
                className={`h-8 w-8 rounded-full flex items-center justify-center border ${on ? "bg-green-500 border-green-500" : "border-neutral-600"}`}
                title={`${d.date}${d.workout ? " · workout" : ""}${d.food ? " · food logged" : ""}`}
              >
                {on && <Check size={16} />}
              </span>
              <span className="text-[11px] text-gray-500">{weekday(d.date)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-sm text-gray-300 flex-wrap">
        <span className="flex items-center gap-1">
          <Flame size={16} color="#ffb434" /> Workout streak {s.streaks.workout.current}
          <span className="text-gray-500">(best {s.streaks.workout.best})</span>
        </span>
        <span className="flex items-center gap-1">
          <Flame size={16} color="#6bcfed" /> Logging streak {s.streaks.food.current}
          <span className="text-gray-500">(best {s.streaks.food.best})</span>
        </span>
      </div>
    </StatCard>
  );
}

function EnergyCard({ s }: { s: DashboardStats }) {
  const e = s.energy;
  const tone = e.status === "low" ? "care" : "info";
  return (
    <StatCard title="Energy balance" icon={<Zap strokeWidth={1.25} />}>
      {e.avg_intake !== null ? (
        <>
          <div className="flex items-end gap-3 flex-wrap">
            <BigNumber unit="kcal/day">{e.avg_intake}</BigNumber>
          </div>
          <p className="text-sm text-gray-400">
            7-day average intake{e.target ? ` · target ${e.target}` : ""}
            {e.maintenance ? ` · maintenance ${Math.round(e.maintenance)}` : ""}
          </p>
          {e.projected_kg_per_week !== undefined && (
            <p className="text-stone-300">
              At this pace: <span className="text-stone-50">{signed(e.projected_kg_per_week, 2)} kg / week</span>
              <span className="text-gray-500 text-sm"> (estimate)</span>
            </p>
          )}
        </>
      ) : null}
      <Note tone={tone}>{e.message}</Note>
    </StatCard>
  );
}

function WinsCard({ s }: { s: DashboardStats }) {
  return (
    <StatCard title="This week's wins" icon={<Trophy strokeWidth={1.25} color="#f1c232" />} className="md:col-span-2">
      <ul className="flex flex-col gap-2">
        {s.wins.map((w) => (
          <li key={w} className="flex items-start gap-2">
            <Check size={18} className="mt-1 text-green-400 shrink-0" />
            <span>{w}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-start gap-3 rounded-xl bg-white/5 px-4 py-3">
        <Lightbulb size={22} strokeWidth={1.25} color="#ffb434" className="shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-gray-400">Next focus</p>
          <p>{s.focus}</p>
        </div>
      </div>
    </StatCard>
  );
}

export default function DashboardInsights() {
  const { userData } = useAuth();
  const { data, loading, error, refetch } = useApi<DashboardStats>(userData?.uid ? "/api/me/stats/dashboard" : null, {
    tz: userTimezone(),
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (loading || !data) {
    return (
      <div className="grid gap-5 md:grid-cols-2 w-full max-w-[64rem]" aria-busy>
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
      </div>
    );
  }

  return (
    <div className={`${poiret.className} grid gap-5 md:grid-cols-2 w-full max-w-[64rem]`}>
      <GoalCard s={data} />
      <TrendCard s={data} />
      <ConsistencyCard s={data} />
      <EnergyCard s={data} />
      <WinsCard s={data} />
    </div>
  );
}
