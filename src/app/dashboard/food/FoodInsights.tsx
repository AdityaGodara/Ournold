"use client";
import React from "react";
import { Apple, BarChart3, Beef, Flame, Smile } from "lucide-react";
import { useAuth } from "@/app/Context/AuthContext";
import { ErrorState } from "@/components/ui/Loader";
import { CardSkeleton } from "@/components/ui/Skeletons";
import { Bar, BigNumber, Note, Ring, StatCard } from "@/components/ui/Stats";
import { userTimezone } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { FoodStats } from "@/lib/statsTypes";
import { useApi } from "@/lib/useApi";

const MEAL_COLORS: Record<string, string> = {
  breakfast: "#f1c232",
  lunch: "#6bcfed",
  snack: "#aaff00",
  dinner: "#f57c7c",
  "late-night": "#b28cff",
};

export function useFoodStats() {
  const { userData } = useAuth();
  return useApi<FoodStats>(userData?.uid ? "/api/me/stats/food" : null, { tz: userTimezone() });
}

type FoodState = ReturnType<typeof useFoodStats>;

/** Today's calories ring with remaining kcal and macro progress bars. */
export function TodayRing({ state }: { state: FoodState }) {
  const { data, loading, error, refetch } = state;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (loading || !data) return <CardSkeleton lines={4} />;

  const { today, targets } = data;
  const target = targets.calories;
  const remaining = target ? Math.round(target - today.cals) : null;

  return (
    <div className={`${poiret.className} flex flex-col gap-4 w-full`}>
      <h2 className="text-3xl text-stone-50 font-normal text-center">Today&apos;s</h2>
      <StatCard title="Calories" icon={<Flame strokeWidth={1.25} color="#ffb434" />}>
        <div className="flex items-center gap-5">
          <Ring value={target ? today.cals / target : 0} label="Calories eaten today" color="#f3f3f3" size={130}>
            <span className="text-2xl">{Math.round(today.cals)}</span>
            <span className="text-xs text-gray-400">kcal</span>
          </Ring>
          <div>
            {remaining === null ? (
              <p className="text-gray-400">Set your height, weight and activity in Update Profile to get a target.</p>
            ) : remaining >= 0 ? (
              <>
                <BigNumber>{remaining}</BigNumber>
                <p className="text-gray-400 text-sm mt-1">kcal left of {target}</p>
              </>
            ) : (
              <>
                <p className="text-xl">Target reached 🎯</p>
                <p className="text-gray-400 text-sm mt-1">{Math.abs(remaining)} kcal over, which is completely fine now and then.</p>
              </>
            )}
          </div>
        </div>
      </StatCard>
      <StatCard title="Macros" icon={<Beef strokeWidth={1.25} />}>
        <Bar label="Protein" value={today.protein} max={targets.protein} color="#6bcfed" />
        <Bar label="Carbs" value={today.carbs} max={targets.carbs} color="#f1c232" />
        <Bar label="Fat" value={today.fat} max={targets.fat} color="#f57c7c" />
      </StatCard>
    </div>
  );
}

/** Habit and quality stats shown beside the meal list. */
export function FoodHabits({ state }: { state: FoodState }) {
  const { data, loading, error } = state;
  if (error) return null; // TodayRing already shows the retry
  if (loading || !data) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 w-full" aria-busy>
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
      </div>
    );
  }

  const p7 = data.protein_days.d7;
  const p30 = data.protein_days.d30;
  const q = data.quality;
  const log = data.logging;

  return (
    <div className={`${poiret.className} grid gap-5 sm:grid-cols-2 w-full`}>
      <StatCard title="Protein days" icon={<Beef strokeWidth={1.25} color="#6bcfed" />}>
        <BigNumber unit={`/ ${p7.logged || 7} days`}>{p7.hit}</BigNumber>
        <p className="text-sm text-gray-400">
          protein target hit this week
          {p30.logged > 0 && ` · ${p30.hit} of ${p30.logged} logged days this month`}
        </p>
        {p7.logged === 0 && <Note>Log a meal to start tracking your protein.</Note>}
      </StatCard>

      <StatCard title="Meal quality" icon={<Smile strokeWidth={1.25} color="#aaff00" />}>
        {q.rated > 0 ? (
          <>
            <BigNumber unit={`of ${q.rated}`}>{q.supportive}</BigNumber>
            <p className="text-sm text-gray-400">recent meals supported your goal</p>
            {q.supportive / q.rated < 0.5 && <Note>Small swaps, like more protein or less oil, can lift these quickly.</Note>}
          </>
        ) : (
          <Note>Your meals are rated against your goal once you&apos;ve logged a few.</Note>
        )}
      </StatCard>

      <StatCard title="Logging streak" icon={<Apple strokeWidth={1.25} color="#ffb434" />}>
        <BigNumber unit={log.current === 1 ? "day" : "days"}>{log.current}</BigNumber>
        <p className="text-sm text-gray-400">
          Best: {log.best} · {log.days_7} of the last 7 days logged
        </p>
        {log.current === 0 && log.best > 0 && <Note>Your best is {log.best} days. Log a meal today to start a new streak.</Note>}
      </StatCard>

      <StatCard title="Where your calories land" icon={<BarChart3 strokeWidth={1.25} />}>
        {data.distribution.length ? (
          <>
            <div className="flex h-3 rounded-full overflow-hidden" role="img" aria-label="Calories by meal">
              {data.distribution.map((d) => (
                <div key={d.meal} title={`${d.meal} ${d.pct}%`} style={{ width: `${d.pct}%`, background: MEAL_COLORS[d.meal] ?? "#999" }} />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-300">
              {data.distribution.map((d) => (
                <li key={d.meal} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: MEAL_COLORS[d.meal] ?? "#999" }} />
                  {d.meal} {d.pct}%
                </li>
              ))}
            </ul>
            {data.distribution_note && <Note>{data.distribution_note}</Note>}
          </>
        ) : (
          <Note>Log a few meals to see how your day is distributed.</Note>
        )}
      </StatCard>

      {data.safety_note && (
        <div className="sm:col-span-2">
          <Note tone="care">{data.safety_note}</Note>
        </div>
      )}
    </div>
  );
}
