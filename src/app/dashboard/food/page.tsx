"use client";
import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronDown, ChevronUp, Frown, Laugh, PlusCircle, RefreshCw, Smile, Sparkles, ThumbsDown } from "lucide-react";
import { bounceIn } from "@/app/config/motion";
import { useAuth } from "@/app/Context/AuthContext";
import DailyMacro from "@/app/Components/DailyMacro";
import DashboardShell from "@/components/DashboardShell";
import { ErrorState, Skeleton } from "@/components/ui/Loader";
import { userTimezone } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { useApi } from "@/lib/useApi";
import MacroPie from "../Dash_Comp/MacroPie";
import ProteinChart from "../Dash_Comp/ProteinChart";

interface Meal {
  doc_id: string;
  meal_name?: string;
  meal_time?: string;
  timestamp?: string;
  protein?: number;
  carbs?: number;
  fats?: number;
  cals?: number;
  rating?: string;
  rating_explain?: string;
}

interface TodayFood {
  meal_plan: Record<string, string[] | undefined>;
  total_daily_macros?: { calories?: string; protein?: string; carbs?: string; fats?: string };
}

const SECTIONS: [string, string][] = [
  ["Breakfast", "breakfast"],
  ["Lunch", "lunch"],
  ["Snack", "snack"],
  ["Dinner", "dinner"],
  ["Late Night Meal", "late_night_meal"],
];

const RATING_ICON: Record<string, React.ReactNode> = {
  best: <Laugh size={40} color="#00ff11" strokeWidth={1.25} />,
  good: <Smile size={40} color="#aaff00" strokeWidth={1.25} />,
  bad: <Frown size={40} color="#ff6600" strokeWidth={1.25} />,
  worst: <ThumbsDown size={40} color="#ff0000" strokeWidth={1.25} />,
};

/** "Paneer Bowl (Calories: 400, Protein: 30g)" → name + macro detail, tolerating missing parentheses. */
function splitOption(item: string): { name: string; detail?: string } {
  const m = item.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { name: m[1].trim(), detail: m[2] } : { name: item.trim() };
}

function MealPlan() {
  const { userData } = useAuth();
  const { data, loading, error, refetch } = useApi<TodayFood>(userData?.uid ? "/api/me/todayFood" : null, {
    tz: userTimezone(),
  });
  const [open, setOpen] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const regenerate = async () => {
    setRegenerating(true);
    await refetch({ refresh: true });
    setRegenerating(false);
  };

  return (
    <div
      className={`w-full flex flex-col gap-2 justify-start items-center border-2 border-stone-50 rounded-md py-3 px-4 text-stone-50 ${poiret.className}`}
    >
      <div className="flex gap-2 items-center w-full justify-center relative">
        <span className="text-lg sm:text-xl">Your today&apos;s menu!</span>
        <Sparkles size={30} color="#ffb434" strokeWidth={1.25} />
        {data && (
          <button
            onClick={regenerate}
            disabled={regenerating}
            aria-label="Generate a new menu"
            title="Generate a new menu"
            className="absolute right-0 p-1 text-gray-400 hover:text-stone-50 transition disabled:animate-spin"
          >
            <RefreshCw size={20} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : loading || !data?.meal_plan ? (
        <div className="flex flex-col gap-2 w-full" aria-busy>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="rounded-xl w-full h-[25px]" />
          ))}
          <p className="text-sm text-gray-400 text-center">Cooking up your plan…</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 w-full">
            {SECTIONS.map(([title, key]) => {
              const items = data.meal_plan[key];
              if (!items?.length) return null;
              const isOpen = open === title;
              return (
                <div key={title} className="w-full">
                  <button
                    onClick={() => setOpen(isOpen ? null : title)}
                    aria-expanded={isOpen}
                    className="w-full flex justify-between items-center py-2 border-b border-gray-300"
                  >
                    <span className="font-semibold text-lg">{title}</span>
                    {isOpen ? <ChevronUp size={22} color="#ffb434" /> : <ChevronDown size={22} color="#ffb434" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden mt-2 pl-2"
                      >
                        {items.map((item, i) => {
                          const { name, detail } = splitOption(item);
                          return (
                            <p key={i} className="mb-1 text-sm">
                              <span className="font-semibold">{name}</span>
                              {detail && ` (${detail})`}
                            </p>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          {data.total_daily_macros && (
            <div className="mt-3 pt-2 text-sm w-full">
              {(["calories", "protein", "carbs", "fats"] as const).map((k) => (
                <p key={k}>
                  <span className="font-semibold">
                    {k === "calories" ? "Total Daily Calories" : k[0].toUpperCase() + k.slice(1)}:
                  </span>{" "}
                  {data.total_daily_macros?.[k] ?? "—"}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MealList() {
  const { userData } = useAuth();
  const { data, loading, error, refetch } = useApi<{ data: Meal[] }>(userData?.uid ? "/api/me/meals" : null);
  const meals = data?.data ?? [];

  return (
    <div className="w-full lg:w-[30%]">
      <h2 className={`${poiret.className} text-2xl sm:text-3xl text-stone-50 font-normal`}>Meals</h2>
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : loading ? (
        <div className="flex flex-col gap-3 mt-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : meals.length ? (
        <ul className={`${poiret.className} mt-3 text-stone-300 flex flex-col gap-3`}>
          {meals.map((meal) => (
            <li key={meal.doc_id} className="flex flex-col gap-3 border border-stone-50 rounded-xl p-3">
              <div>
                <span className="text-lg sm:text-xl font-bold">
                  {meal.meal_name ? (meal.meal_name.length > 40 ? `${meal.meal_name.slice(0, 40)} ...` : meal.meal_name) : "Unknown Meal"}
                </span>
                <p className="text-base sm:text-lg text-gray-500">
                  {meal.meal_time ? `${meal.meal_time} | ${meal.timestamp?.slice(0, 10)}` : ""}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="flex flex-col gap-2 w-full sm:w-auto justify-center items-center">
                  {RATING_ICON[meal.rating ?? ""]}
                  <span className="text-sm text-center">{meal.rating_explain}</span>
                </div>
                <div className="text-left w-full sm:w-auto text-sm sm:text-base">
                  <p>Protein: {meal.protein ?? 0} g</p>
                  <p>Carbs: {meal.carbs ?? 0} g</p>
                  <p>Fat: {meal.fats ?? 0} g</p>
                  <p>Calories: {meal.cals ?? 0} KCal</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400 mt-2 text-sm">No meals logged yet. Add one with a photo or manually.</p>
      )}
    </div>
  );
}

export default function FoodPage() {
  return (
    <DashboardShell active="food" chat="diet">
      <div className="flex flex-col items-center px-4 sm:px-6 md:px-8">
        <div className={`${poiret.className} flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 w-full sm:w-auto`}>
          <motion.div variants={bounceIn} initial="initial" animate="animate">
            <Link
              href="/dashboard/food/imageFood"
              className="px-4 py-3 rounded-md bg-green-500 hover:bg-green-600 duration-200 text-stone-50 flex gap-2 items-center justify-center"
            >
              <Camera color="#ffffff" strokeWidth={1.25} /> Upload food image
            </Link>
          </motion.div>
          <motion.div variants={bounceIn} initial="initial" animate="animate">
            <Link
              href="/dashboard/food/manual"
              className="px-4 py-3 rounded-md border border-stone-50 flex justify-center text-stone-50 gap-3 hover:border-gray-500 transition"
            >
              <PlusCircle color="#ffffff" strokeWidth={1.25} /> Add manually
            </Link>
          </motion.div>
        </div>

        <div className="mt-6 flex flex-col lg:flex-row justify-start gap-6 w-full">
          <MealList />
          <div className="w-full lg:w-[70%]">
            <div className="flex flex-col xl:flex-row gap-5 justify-around">
              <div className="w-full xl:w-auto">
                <DailyMacro />
              </div>
              <div className="w-full xl:w-[50%] text-stone-50">
                <MealPlan />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-5 justify-between mt-10">
              <MacroPie />
              <ProteinChart />
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
