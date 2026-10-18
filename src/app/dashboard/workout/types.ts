export interface PlanExercise {
  name: string;
  sets: number;
  reps: string;
  rest_sec: number;
  notes: string;
}

export interface PlanDay {
  day: string;
  focus: string;
  rest: boolean;
  exercises: PlanExercise[];
}

export interface PlanDoc {
  plan: { title: string; summary: string; days: PlanDay[] };
  params: { equipment: "gym" | "home" | "bodyweight"; days_per_week: number; minutes_per_session: number };
  created_at: string;
}

export interface Stats {
  streak: number;
  today_done: boolean;
  total_sessions: number;
  strip: { date: string; done: boolean }[];
  weekly: { week: string; sessions: number; volume: number; reps: number }[];
  best: { name: string; max_weight: number; max_reps: number }[];
}

export interface SessionDoc {
  id: string;
  name: string;
  local_date: string;
  duration_min: number;
  calories: number;
  total_reps: number;
  volume: number;
  source: string;
  exercises: { name: string; sets: { reps: number; weight: number; done: boolean }[] }[];
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const todayName = () => WEEKDAYS[new Date().getDay()];

/** "8-12" → 8, "30s" → 30, "AMRAP" → 10 (a sensible default row target). */
export const firstNumber = (reps: string, fallback = 10) => {
  const m = reps.match(/\d+/);
  return m ? Number(m[0]) : fallback;
};
