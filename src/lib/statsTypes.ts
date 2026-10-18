export interface GoalProgress {
  kind: "lose" | "gain" | "maintain";
  target: number;
  low: number;
  high: number;
  start: number;
  current: number;
  progress: number | null;
  in_range?: boolean;
  remaining?: number;
  next_milestone?: number;
  to_milestone?: number;
}

export interface Trend {
  current: number | null;
  avg7: number | null;
  rate_per_week: number | null;
  status: "none" | "unknown" | "on_track" | "steady" | "fast" | "up";
  message: string;
}

export interface Energy {
  status: "insufficient" | "low" | "on_target" | "above" | "below";
  logged_days: number;
  avg_intake: number | null;
  target?: number | null;
  maintenance?: number | null;
  projected_kg_per_week?: number;
  message: string;
}

export interface Targets {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface DashboardStats {
  goal: GoalProgress | null;
  trend: Trend;
  consistency: { strip: { date: string; food: boolean; workout: boolean }[]; active_days: number };
  streaks: { workout: { current: number; best: number }; food: { current: number; best: number } };
  energy: Energy;
  targets: Targets;
  wins: string[];
  focus: string;
}

export interface FoodStats {
  today: { cals: number; protein: number; carbs: number; fat: number };
  targets: Targets;
  protein_days: { d7: { hit: number; logged: number; window: number }; d30: { hit: number; logged: number; window: number } };
  quality: { rated: number; supportive: number };
  logging: { current: number; best: number; days_7: number };
  distribution: { meal: string; pct: number }[];
  distribution_note: string | null;
  safety_note: string | null;
}
