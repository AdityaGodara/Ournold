"use client";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../Context/AuthContext";
import { slideAnimation } from "../config/motion";
import { poiret } from "@/lib/fonts";
import { userTimezone } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useCalorieTarget } from "@/lib/useCalorieTarget";
import { fmt } from "@/lib/profile";
import { ErrorState, Skeleton } from "@/components/ui/Loader";

interface Row {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function DailyMacro() {
  const { userData } = useAuth();
  const { target } = useCalorieTarget();
  const { data, loading, error, refetch } = useApi<{ data: Row[] }>(
    userData?.uid ? "/api/me/todayNutrition" : null,
    { tz: userTimezone() }
  );

  const total = useMemo(
    () =>
      (data?.data ?? []).reduce(
        (a, r) => ({ calories: a.calories + r.calories, protein: a.protein + r.protein, carbs: a.carbs + r.carbs, fats: a.fats + r.fat }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      ),
    [data]
  );

  const card = "text-stone-50 border-2 border-stone-50 p-4 sm:p-5 rounded-xl flex flex-col gap-2";
  const motionProps = {
    variants: slideAnimation("up"),
    initial: "initial",
    whileInView: "animate",
    viewport: { once: false, amount: 0.25 },
  } as const;
  const value = (text: string) =>
    loading ? <Skeleton className="min-w-[8rem] sm:min-w-[10rem] h-[2.5rem] sm:h-[3rem]" /> : <p className="text-4xl sm:text-5xl">{text}</p>;

  if (error) return <ErrorState message="Couldn't load today's nutrition." onRetry={() => refetch()} />;

  const pct = target ? Math.min(100, Math.round((total.calories / target) * 100)) : null;

  return (
    <div className={`flex flex-col gap-5 items-center w-full px-4 sm:px-8 ${poiret.className}`}>
      <h2 className="text-3xl text-stone-50 font-normal">Today&apos;s</h2>

      <motion.div {...motionProps} className={`${card} w-full sm:min-w-[20rem]`}>
        <span className="text-xl">Calories</span>
        <div className="flex gap-2 items-end flex-wrap">
          {value(`${Math.round(total.calories)} KCal`)}
          <div className="text-xl sm:text-2xl text-gray-500"> / {target ? fmt(target, 0) : "N/A"}</div>
        </div>
        {pct !== null && (
          <div
            className="h-1.5 w-full rounded-full bg-neutral-700 overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Calories eaten today"
          >
            <div className="h-full bg-stone-50 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        )}
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center w-full sm:w-fit">
        {(["Protein", "Fats"] as const).map((label) => (
          <motion.div key={label} {...motionProps} className={`${card} flex-1 sm:flex-none min-w-[10rem]`}>
            <span className="text-xl">{label}</span>
            {value(`${Math.round(total[label.toLowerCase() as "protein" | "fats"])} g`)}
          </motion.div>
        ))}
      </div>

      <motion.div {...motionProps} className={`${card} w-full sm:min-w-[20rem]`}>
        <span className="text-xl">Carbs</span>
        {value(`${Math.round(total.carbs)} g`)}
      </motion.div>
    </div>
  );
}
