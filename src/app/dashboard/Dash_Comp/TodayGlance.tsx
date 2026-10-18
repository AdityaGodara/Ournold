"use client";
import React from "react";
import Link from "next/link";
import { BicepsFlexed, Flame, Utensils } from "lucide-react";
import { useAuth } from "@/app/Context/AuthContext";
import { localDate, userTimezone } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useCalorieTarget } from "@/lib/useCalorieTarget";
import { poiret } from "@/lib/fonts";
import { Skeleton } from "@/components/ui/Loader";

interface Stats {
  streak: number;
  today_done: boolean;
}

/** "Today at a glance": calories vs target, workout status, streak, with quick links. */
export default function TodayGlance() {
  const { userData } = useAuth();
  const uid = userData?.uid;
  const { target } = useCalorieTarget();
  const food = useApi<{ data: { calories: number }[] }>(uid ? "/api/me/todayNutrition" : null, { tz: userTimezone() });
  const stats = useApi<Stats>(uid ? "/api/workout/stats" : null, { today: localDate() });

  const eaten = Math.round((food.data?.data ?? []).reduce((s, r) => s + r.calories, 0));
  const item = "flex items-center gap-3 border border-neutral-700 hover:border-stone-50 transition rounded-xl px-4 py-3";

  return (
    <section aria-label="Today at a glance" className={`w-full max-w-[64rem] px-4 grid gap-3 sm:grid-cols-3 text-stone-50 ${poiret.className}`}>
      <Link href="/dashboard/food" className={item}>
        <Utensils strokeWidth={1.25} />
        <div>
          <p className="text-gray-400 text-sm">Calories today</p>
          {food.loading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <p className="text-xl">
              {eaten} <span className="text-gray-500">/ {target ? Math.round(target) : "—"} kcal</span>
            </p>
          )}
        </div>
      </Link>
      <Link href="/dashboard/workout" className={item}>
        <BicepsFlexed strokeWidth={1.25} />
        <div>
          <p className="text-gray-400 text-sm">Workout</p>
          {stats.loading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <p className="text-xl">{stats.data?.today_done ? "Done today ✓" : "Not yet today"}</p>
          )}
        </div>
      </Link>
      <Link href="/dashboard/workout" className={item}>
        <Flame strokeWidth={1.25} color="#ffb434" />
        <div>
          <p className="text-gray-400 text-sm">Streak</p>
          {stats.loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <p className="text-xl">{stats.data?.streak ?? 0} day{(stats.data?.streak ?? 0) === 1 ? "" : "s"}</p>
          )}
        </div>
      </Link>
    </section>
  );
}
