/* eslint-disable @typescript-eslint/no-explicit-any */
/** Helpers for reading the Firestore profile, which stores metrics under `currentData` (legacy docs: top level). */

export const current = (userData: any): Record<string, any> =>
  userData?.currentData && typeof userData.currentData === "object" ? userData.currentData : userData ?? {};

export const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const fmt = (v: unknown, digits = 1): string => {
  const n = toNum(v);
  return n === null ? "N/A" : String(Number.isInteger(n) ? n : n.toFixed(digits));
};

export const GOALS = [
  { value: "lose_weight", label: "Lose Weight – Burn fat and slim down" },
  { value: "build_muscle", label: "Build Muscle – Gain strength and muscle mass" },
  { value: "increase_endurance", label: "Increase Endurance – Improve stamina and cardio performance" },
  { value: "improve_flexibility", label: "Improve Flexibility – Increase mobility and reduce stiffness" },
  { value: "tone_body", label: "Tone Body – Lean muscles, firm shape without big bulk" },
  { value: "overall_fitness", label: "Improve Overall Fitness – General health and wellness" },
  { value: "recover", label: "Rehabilitation / Recover – Recover from injury or improve mobility" },
] as const;

/** Legacy free-text / misspelled goal values map onto the enum so selects always show a valid option. */
export const normalizeGoal = (goal: unknown): string => {
  const g = String(goal ?? "").toLowerCase().trim().replace(/\s+/g, "_");
  if (g === "improve_flexibilty") return "improve_flexibility";
  if (GOALS.some((o) => o.value === g)) return g;
  if (g.includes("lose") || g.includes("fat")) return "lose_weight";
  if (g.includes("muscle") || g.includes("gain")) return "build_muscle";
  return "";
};

export const BODY_TYPES = [
  { value: "ectomorph", label: "Ectomorph – Naturally thin, finds it hard to gain weight or muscle" },
  { value: "mesomorph", label: "Mesomorph – Naturally fit and muscular, gains muscle easily" },
  { value: "endomorph", label: "Endomorph – Broader body, gains fat easily and loses it slowly" },
  { value: "mixed", label: "Mixed Type – A mix of two body types (e.g., slim but gains fat easily)" },
] as const;

export const ACTIVITY_LEVELS = [
  { value: "no", label: "No Exercise" },
  { value: "light", label: "Light Exercise/walking or jogging only (1-2 times a week)" },
  { value: "medium", label: "Medium Exercise (3-4 times a week)" },
  { value: "regular", label: "Daily workout (5-6 times a week)" },
] as const;

export const bmiCategory = (bmi: number | null): string => {
  if (bmi === null) return "";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal Weight";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obesity Level 1";
  if (bmi < 40) return "Obesity Level 2";
  return "Obesity Level 3";
};
