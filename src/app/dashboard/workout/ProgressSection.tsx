"use client";
import React from "react";
import { Activity, BedDouble, Check, Flame, Medal, Scale, TrendingUp } from "lucide-react";
import { ResponsiveLine } from "@nivo/line";
import { ErrorState } from "@/components/ui/Loader";
import { CardSkeleton } from "@/components/ui/Skeletons";
import { Bar, BigNumber, Note, Ring, StatCard } from "@/components/ui/Stats";
import { localDate } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { useApi } from "@/lib/useApi";
import { Stats } from "./types";

const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const GUIDELINE_MIN = 150;
const GROUP_COLORS: Record<string, string> = { push: "#6bcfed", pull: "#f1c232", legs: "#f57c7c", core: "#aaff00" };

function WeeklyBars({ data, label, unit }: { data: { key: string; value: number }[]; label: string; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div
        className="flex items-end gap-1.5 h-28"
        role="img"
        aria-label={`${label}: ${data.map((d) => `${d.key} ${d.value}${unit}`).join(", ")}`}
      >
        {data.map((d) => (
          <div key={d.key} className="flex-1 flex flex-col items-center justify-end h-full group">
            <span className="text-[11px] text-gray-400 opacity-0 group-hover:opacity-100 transition">
              {d.value}
              {unit}
            </span>
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
    </div>
  );
}

function E1rmChart({ name, points }: { name: string; points: { date: string; e1rm: number }[] }) {
  if (points.length < 2) return null;
  return (
    <div>
      <p className="text-sm text-gray-300 mb-1">{name}: estimated max</p>
      <div style={{ height: 120 }} role="img" aria-label={`${name} estimated one-rep max trend`}>
        <ResponsiveLine
          data={[{ id: name, data: points.map((p) => ({ x: shortDate(p.date), y: p.e1rm })) }]}
          margin={{ top: 8, right: 12, bottom: 24, left: 36 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: "auto", max: "auto" }}
          curve="monotoneX"
          colors={["#ffffff"]}
          lineWidth={2}
          pointSize={6}
          pointColor="#ffffff"
          pointBorderWidth={1}
          pointBorderColor="#000000"
          enableGridX={false}
          gridYValues={3}
          axisBottom={{ tickSize: 0, tickPadding: 6 }}
          axisLeft={{ tickSize: 0, tickPadding: 6, tickValues: 3 }}
          useMesh
          theme={{
            background: "transparent",
            axis: { ticks: { text: { fill: "#adadad", fontSize: 10, fontFamily: poiret.style.fontFamily } } },
            grid: { line: { stroke: "#333", strokeWidth: 1 } },
            tooltip: { container: { background: "#1f1f1f", color: "#f0f0f0", fontSize: 12 } },
          }}
        />
      </div>
    </div>
  );
}

export default function ProgressSection({ refreshKey }: { refreshKey?: number }) {
  const { data, loading, error, refetch } = useApi<Stats>("/api/workout/stats", { today: localDate(), k: refreshKey ?? 0 });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (loading || !data) {
    return (
      <div className="grid gap-5 md:grid-cols-2" aria-busy>
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
      </div>
    );
  }

  const weekRatio = data.target_per_week ? data.sessions_this_week / data.target_per_week : 0;
  const minutesRatio = data.active_minutes_week / GUIDELINE_MIN;
  const balanceTotal = data.balance.reduce((s, b) => s + b.sets, 0);
  const vol = data.volume_change_pct;

  return (
    <section className={`${poiret.className} text-stone-50 flex flex-col gap-5`} aria-labelledby="progress-h">
      <h2 id="progress-h" className="text-2xl sm:text-3xl font-normal">
        Your progress
      </h2>

      <div className="grid gap-5 md:grid-cols-2">
        <StatCard title="This week" icon={<Check strokeWidth={1.25} />}>
          <div className="flex items-center gap-5">
            <Ring value={weekRatio} color="#4ade80" label="Workouts this week" size={110}>
              <span className="text-2xl">
                {data.sessions_this_week}/{data.target_per_week}
              </span>
            </Ring>
            <div>
              <p className="text-lg leading-tight">
                {weekRatio >= 1 ? "Weekly goal hit! 🎉" : data.sessions_this_week > 0 ? "Great start this week" : "A fresh week is a fresh start"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {data.consistent_weeks} of the last 7 weeks on target
              </p>
            </div>
          </div>
          <div className="flex justify-between" role="list" aria-label="Last 7 days">
            {data.strip.map((d) => (
              <div key={d.date} role="listitem" className="flex flex-col items-center gap-1" title={shortDate(d.date)}>
                <span className={`h-7 w-7 rounded-full flex items-center justify-center border ${d.done ? "bg-green-500 border-green-500" : "border-neutral-600"}`}>
                  {d.done && <Check size={14} />}
                </span>
                <span className="text-[10px] text-gray-500">
                  {new Date(`${d.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
        </StatCard>

        <StatCard title="Streaks" icon={<Flame strokeWidth={1.25} color="#ffb434" />}>
          <div className="flex items-end gap-6">
            <div>
              <BigNumber>{data.streak}</BigNumber>
              <p className="text-sm text-gray-400 mt-1">current {data.streak === 1 ? "day" : "days"}</p>
            </div>
            <div>
              <p className="text-3xl text-stone-300">{data.best_streak}</p>
              <p className="text-sm text-gray-400">best ever</p>
            </div>
          </div>
          <Note>
            {data.streak === 0 && data.best_streak > 0
              ? `Your best is ${data.best_streak} days. Any session starts a new streak.`
              : data.streak > 0 && data.streak === data.best_streak
                ? "This is your longest streak yet. Keep it rolling!"
                : "Rest days are part of training; your streak counts days you trained."}
          </Note>
        </StatCard>

        <StatCard title="Active minutes" icon={<Activity strokeWidth={1.25} color="#6bcfed" />}>
          <BigNumber unit={`/ ${GUIDELINE_MIN} min`}>{data.active_minutes_week}</BigNumber>
          <Bar label="Weekly activity guideline" value={data.active_minutes_week} max={GUIDELINE_MIN} unit="min" color="#6bcfed" />
          <p className="text-sm text-gray-400">
            {data.calories_week} kcal burned this week
            {minutesRatio >= 1 ? ". You've met the 150-minute guideline 🎯" : ""}
          </p>
        </StatCard>

        <StatCard title="Volume" icon={<TrendingUp strokeWidth={1.25} color="#aaff00" />}>
          {vol === null ? (
            <Note>Log two weeks of weighted workouts to see your volume trend.</Note>
          ) : (
            <>
              <BigNumber unit="% vs last week">{vol > 0 ? `+${vol}` : vol}</BigNumber>
              <Note>
                {vol >= 0
                  ? "You're lifting more than last week. Progressive overload at work!"
                  : "A lighter week than last. That's normal; recovery weeks help you come back stronger."}
              </Note>
            </>
          )}
          <WeeklyBars label="Weekly volume" unit="kg" data={data.weekly.map((w) => ({ key: shortDate(w.week), value: Math.round(w.volume) }))} />
        </StatCard>

        <StatCard title="Personal records" icon={<Medal strokeWidth={1.25} color="#f1c232" />}>
          {data.prs.length ? (
            <ul className="flex flex-col gap-2">
              {data.prs.map((p) => (
                <li key={`${p.exercise}-${p.date}`} className="flex justify-between gap-3 border border-neutral-700 rounded-lg px-3 py-2">
                  <span>🏆 {p.exercise}</span>
                  <span className="text-gray-300 text-right">
                    {p.kind === "weight" ? `${p.weight} kg × ${p.reps}` : `${p.reps} reps`}
                    <span className="text-gray-500 text-xs block">{shortDate(p.date)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Note>Your records will appear here. Beat a previous best on any exercise and it&apos;s celebrated.</Note>
          )}
          {data.e1rm.map((e) => (
            <E1rmChart key={e.name} name={e.name} points={e.points} />
          ))}
        </StatCard>

        <StatCard title="Muscle balance" icon={<Scale strokeWidth={1.25} />}>
          {balanceTotal >= 6 ? (
            <>
              <div className="flex h-3 rounded-full overflow-hidden" role="img" aria-label="Sets by muscle group, last 4 weeks">
                {data.balance.map((b) => (
                  <div key={b.group} style={{ width: `${(b.sets / balanceTotal) * 100}%`, background: GROUP_COLORS[b.group] }} title={`${b.group} ${b.sets} sets`} />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-1 text-sm text-gray-300">
                {data.balance.map((b) => (
                  <li key={b.group} className="flex items-center gap-1.5 capitalize">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: GROUP_COLORS[b.group] }} />
                    {b.group}: {b.sets} sets
                  </li>
                ))}
              </ul>
              <Note>
                {data.neglected
                  ? `Your ${data.neglected} work is a bit behind. One extra session would round things out.`
                  : "A nicely balanced mix over the last 4 weeks."}
              </Note>
            </>
          ) : (
            <Note>Log a few sessions and we&apos;ll show how your training is balanced (last 4 weeks).</Note>
          )}
        </StatCard>

        <StatCard title="Recovery" icon={<BedDouble strokeWidth={1.25} color="#b28cff" />} className="md:col-span-2">
          <p className="text-xl">
            {data.recovery.days_since === null
              ? "No sessions yet"
              : data.recovery.days_since === 0
                ? "Trained today"
                : `${data.recovery.days_since} day${data.recovery.days_since === 1 ? "" : "s"} since your last session`}
          </p>
          <Note>{data.recovery.message}</Note>
        </StatCard>
      </div>
    </section>
  );
}
