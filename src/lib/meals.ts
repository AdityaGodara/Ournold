import { addDoc, collection } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { invalidateAll } from "@/lib/apiCache";

export interface MealInput {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** When it was eaten; defaults to now. */
  at?: Date;
}

/** Single definition of meal-time buckets (manual and photo flows used to disagree). */
export function mealTimeFor(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 16) return "lunch";
  if (h >= 16 && h < 19) return "snack";
  if (h >= 19 && h < 23) return "dinner";
  return "late-night";
}

export const clampNum = (v: unknown, max: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
};

/** Validates and stores a meal. `timestamp` stays an ISO string: the backend range-queries it. */
export async function saveMeal(uid: string, meal: MealInput) {
  const name = meal.name.trim();
  if (!name) throw new Error("Give the meal a name.");
  const at = meal.at ?? new Date();
  if (at.getTime() > Date.now() + 5 * 60_000) throw new Error("A meal can't be in the future.");
  const ref = await addDoc(collection(db, "users", uid, "meals"), {
    meal_name: name.slice(0, 120),
    cals: clampNum(meal.calories, 10000),
    protein: clampNum(meal.protein, 1000),
    carbs: clampNum(meal.carbs, 2000),
    fat: clampNum(meal.fat, 1000),
    meal_time: mealTimeFor(at),
    timestamp: at.toISOString(),
  });
  invalidateAll(); // stats / meal lists must reflect the new meal
  return ref;
}
