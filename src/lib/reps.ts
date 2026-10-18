/**
 * Pure rep-counting logic for the webcam rep counter (no browser APIs, so it is unit-testable).
 * A rep is a full excursion of a joint angle between two thresholds, with hysteresis to avoid double counts.
 */

export type ExerciseKey = "squat" | "pushup" | "curl" | "press";

export interface Point {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export interface ExerciseConfig {
  key: ExerciseKey;
  label: string;
  /** Joint triplets (a, b, c): the angle is measured at `b`, for left and right sides. */
  joints: { left: [string, string, string]; right: [string, string, string] };
  /** Angle below this = "contracted", above `high` = "extended". */
  low: number;
  high: number;
  /** Which end the movement starts from. */
  startsAt: "high" | "low";
  /** Camera placement tip shown to the user. */
  tip: string;
  hintShallow: string;
  /** Rough MET value for calorie estimates. */
  met: number;
}

export const EXERCISES: Record<ExerciseKey, ExerciseConfig> = {
  squat: {
    key: "squat",
    label: "Squat",
    joints: {
      left: ["left_hip", "left_knee", "left_ankle"],
      right: ["right_hip", "right_knee", "right_ankle"],
    },
    low: 100,
    high: 160,
    startsAt: "high",
    tip: "Stand side-on, 2-3 m from the camera, full body in frame.",
    hintShallow: "Go a little deeper",
    met: 5,
  },
  pushup: {
    key: "pushup",
    label: "Push-up",
    joints: {
      left: ["left_shoulder", "left_elbow", "left_wrist"],
      right: ["right_shoulder", "right_elbow", "right_wrist"],
    },
    low: 90,
    high: 155,
    startsAt: "high",
    tip: "Place the camera side-on at floor level so your whole body is visible.",
    hintShallow: "Lower your chest more",
    met: 6,
  },
  curl: {
    key: "curl",
    label: "Bicep curl",
    joints: {
      left: ["left_shoulder", "left_elbow", "left_wrist"],
      right: ["right_shoulder", "right_elbow", "right_wrist"],
    },
    low: 55,
    high: 150,
    startsAt: "high",
    tip: "Face the camera with your upper body and both arms in frame.",
    hintShallow: "Curl all the way up",
    met: 3.5,
  },
  press: {
    key: "press",
    label: "Shoulder press",
    joints: {
      left: ["left_shoulder", "left_elbow", "left_wrist"],
      right: ["right_shoulder", "right_elbow", "right_wrist"],
    },
    low: 100,
    high: 160,
    startsAt: "low",
    tip: "Face the camera with your upper body and both arms in frame.",
    hintShallow: "Press all the way overhead",
    met: 4,
  },
};

/** Angle at b (degrees, 0-180) formed by a-b-c. */
export function angleAt(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (mag === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

const MIN_SCORE = 0.3;

/** Mean angle across the visible sides, or null when the joints are not reliably detected. */
export function measure(cfg: ExerciseConfig, keypoints: Point[]): number | null {
  const byName = new Map(keypoints.map((k) => [k.name, k]));
  const angles: number[] = [];
  for (const side of [cfg.joints.left, cfg.joints.right]) {
    const pts = side.map((n) => byName.get(n));
    if (pts.every((p) => p && (p.score ?? 0) >= MIN_SCORE)) {
      angles.push(angleAt(pts[0]!, pts[1]!, pts[2]!));
    }
  }
  return angles.length ? angles.reduce((s, v) => s + v, 0) / angles.length : null;
}

export interface RepState {
  reps: number;
  phase: "high" | "low" | "moving";
  hint: string | null;
}

export class RepCounter {
  private cfg: ExerciseConfig;
  private smoothed: number | null = null;
  private seen: "high" | "low" | null = null; // last extreme reached
  private reachedFar = false; // reached the "far" extreme during this rep
  private excursionMin = 180;
  private excursionMax = 0;
  state: RepState = { reps: 0, phase: "moving", hint: null };

  constructor(cfg: ExerciseConfig) {
    this.cfg = cfg;
    this.seen = null;
  }

  reset() {
    this.smoothed = null;
    this.seen = null;
    this.reachedFar = false;
    this.excursionMin = 180;
    this.excursionMax = 0;
    this.state = { reps: 0, phase: "moving", hint: null };
  }

  /** Feed one measured angle; returns the updated state. */
  update(rawAngle: number): RepState {
    this.smoothed = this.smoothed === null ? rawAngle : this.smoothed * 0.5 + rawAngle * 0.5;
    const a = this.smoothed;
    const { low, high, startsAt } = this.cfg;
    const home = startsAt; // extreme where each rep begins and ends
    const far = startsAt === "high" ? "low" : "high";

    this.excursionMin = Math.min(this.excursionMin, a);
    this.excursionMax = Math.max(this.excursionMax, a);

    const atHigh = a >= high;
    const atLow = a <= low;
    let hint = this.state.hint;
    let reps = this.state.reps;

    if (atHigh || atLow) {
      const at: "high" | "low" = atHigh ? "high" : "low";
      if (at === far) {
        this.reachedFar = true;
        hint = null;
      } else if (at === home) {
        if (this.reachedFar) {
          reps += 1;
          hint = null;
        } else if (this.seen === home && this.excursionMax - this.excursionMin > 30) {
          hint = this.cfg.hintShallow; // moved a lot but never reached the far end
        }
        this.reachedFar = false;
        this.excursionMin = 180;
        this.excursionMax = 0;
      }
      this.seen = at;
    }

    this.state = { reps, phase: atHigh ? "high" : atLow ? "low" : "moving", hint };
    return this.state;
  }
}

/** Skeleton edges for drawing the overlay (MoveNet keypoint names). */
export const SKELETON: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];
