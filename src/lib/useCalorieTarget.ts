"use client";
import { useAuth } from "@/app/Context/AuthContext";
import { useApi } from "@/lib/useApi";
import { current, toNum } from "@/lib/profile";

/** Daily calorie target: AI recommendation (cached server-side) → stored target → maintenance calories. */
export function useCalorieTarget() {
  const { userData } = useAuth();
  const cur = current(userData);
  const req = useApi<{ req_intake: number | null }>(userData?.uid ? "/api/me/reqCal" : null);
  const target = toNum(req.data?.req_intake) ?? toNum(cur.daily_calorie_target) ?? toNum(cur.maintenanceCalories);
  return { target, loading: req.loading && target === null };
}
