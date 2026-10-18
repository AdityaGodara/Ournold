"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import { Camera, CameraOff, Play, RotateCcw, Save, Square } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { api, localDate, toApiError } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { EXERCISES, ExerciseKey, Point, RepCounter, SKELETON, measure } from "@/lib/reps";

type Status = "idle" | "loading-model" | "running" | "error";

// Minimal structural type for the detector so tfjs types are not needed at module scope (it is lazy-loaded).
interface Detector {
  estimatePoses: (video: HTMLVideoElement) => Promise<{ keypoints: Point[] }[]>;
  dispose: () => void;
}

export default function RepCounterView() {
  const router = useRouter();
  const toast = useToast();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<Detector | null>(null);
  const rafRef = useRef<number>(0);
  const counterRef = useRef<RepCounter>(new RepCounter(EXERCISES.squat));
  const startedAt = useRef<number>(0);
  const exerciseRef = useRef<ExerciseKey>("squat");

  const [exercise, setExerciseState] = useState<ExerciseKey>("squat");
  const setExercise = (k: ExerciseKey) => {
    exerciseRef.current = k;
    setExerciseState(k);
  };
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [reps, setReps] = useState(0);
  const [phase, setPhase] = useState("—");
  const [hint, setHint] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setStatus((s) => (s === "running" || s === "loading-model" ? "idle" : s));
  }, []);

  // full cleanup on unmount: stop the loop and free the model's GPU memory
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      detectorRef.current?.dispose();
      detectorRef.current = null;
    },
    []
  );

  const draw = useCallback((keypoints: Point[]) => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const by = new Map(keypoints.map((k) => [k.name, k]));
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    for (const [a, b] of SKELETON) {
      const p = by.get(a);
      const q = by.get(b);
      if (p && q && (p.score ?? 0) > 0.3 && (q.score ?? 0) > 0.3) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#84b5ff";
    for (const k of keypoints) {
      if ((k.score ?? 0) > 0.3) {
        ctx.beginPath();
        ctx.arc(k.x, k.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  const loop = useCallback(async () => {
    const video = webcamRef.current?.video;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    try {
      const poses = await detector.estimatePoses(video);
      const kps = poses[0]?.keypoints ?? [];
      draw(kps);
      const angle = measure(EXERCISES[exerciseRef.current], kps);
      if (angle === null) {
        setVisible(false);
      } else {
        setVisible(true);
        const s = counterRef.current.update(angle);
        setReps(s.reps);
        setPhase(s.phase === "moving" ? "…" : s.phase === "high" ? "extended" : "contracted");
        setHint(s.hint);
      }
    } catch (e) {
      console.error(e);
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  const start = async () => {
    setMessage(null);
    setStatus("loading-model");
    try {
      if (!detectorRef.current) {
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
        await tf.ready();
        const pd = await import("@tensorflow-models/pose-detection");
        detectorRef.current = (await pd.createDetector(pd.SupportedModels.MoveNet, {
          modelType: pd.movenet.modelType.SINGLEPOSE_LIGHTNING,
        })) as unknown as Detector;
      }
      if (!startedAt.current) startedAt.current = Date.now(); // pausing then starting again continues the count
      setStatus("running");
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      console.error(e);
      setMessage("Couldn't load the pose model. Check your connection and try again.");
      setStatus("error");
    }
  };

  const pickExercise = (key: ExerciseKey) => {
    cancelAnimationFrame(rafRef.current);
    setExercise(key);
    counterRef.current = new RepCounter(EXERCISES[key]);
    setReps(0);
    setHint(null);
    setPhase("—");
    if (status === "running") {
      startedAt.current = Date.now();
      rafRef.current = requestAnimationFrame(loop);
    }
  };

  // keep the loop bound to the latest `exercise` after switching
  useEffect(() => {
    if (status !== "running") return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, status]);

  const reset = () => {
    counterRef.current.reset();
    startedAt.current = running ? Date.now() : 0;
    setReps(0);
    setHint(null);
  };

  const save = async () => {
    if (reps <= 0) return;
    setSaving(true);
    stop();
    try {
      const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
      await api.post("/api/workout/sessions", {
        name: `${EXERCISES[exercise].label} (rep counter)`,
        local_date: localDate(),
        duration_min: minutes,
        source: "rep_counter",
        exercises: [{ name: EXERCISES[exercise].label, sets: [{ reps, weight: 0, done: true }] }],
      });
      toast("Session saved to your log", "success");
      router.push("/dashboard/workout");
    } catch (e) {
      toast(toApiError(e).message, "error");
      setSaving(false);
    }
  };

  const cfg = EXERCISES[exercise];
  const running = status === "running";

  return (
    <div className={`${poiret.className} max-w-3xl mx-auto px-4 text-stone-50 flex flex-col gap-4`}>
      <h1 className="text-2xl sm:text-3xl text-center">Rep Counter</h1>
      <p className="text-center text-gray-400 text-sm -mt-2">
        Everything runs on your device. Video never leaves your browser.
      </p>

      <div role="radiogroup" aria-label="Exercise" className="flex flex-wrap justify-center gap-2">
        {(Object.keys(EXERCISES) as ExerciseKey[]).map((k) => (
          <button
            key={k}
            role="radio"
            aria-checked={exercise === k}
            onClick={() => pickExercise(k)}
            className={`px-4 py-1.5 rounded-full border transition ${
              exercise === k ? "bg-stone-50 text-black border-stone-50" : "border-neutral-600 hover:border-stone-50"
            }`}
          >
            {EXERCISES[k].label}
          </button>
        ))}
      </div>

      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 border-stone-50 bg-black">
        {status === "idle" || status === "error" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Camera size={48} strokeWidth={1} />
            <p className="text-gray-300">{cfg.tip}</p>
            {message && <p className="text-red-400">{message}</p>}
          </div>
        ) : (
          <div className="absolute inset-0" style={{ transform: "scaleX(-1)" }}>
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
              onUserMediaError={() => {
                setMessage("Camera access was blocked. Allow the camera in your browser settings and try again.");
                setStatus("error");
              }}
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}

        {status === "loading-model" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg">Loading pose model…</div>
        )}

        {running && (
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
            <div className="bg-black/60 rounded-xl px-4 py-2">
              <p className="text-5xl leading-none" aria-live="polite">
                {reps}
              </p>
              <p className="text-xs text-gray-300">reps · {phase}</p>
            </div>
            {!visible && (
              <p className="bg-orange-300 text-black rounded-xl px-3 py-1 text-sm">Step back so your body is in frame</p>
            )}
          </div>
        )}
        {running && hint && (
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 rounded-xl px-4 py-1 text-yellow-300">{hint}</p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {!running ? (
          <button
            onClick={start}
            disabled={status === "loading-model"}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 transition px-5 py-2 rounded-lg flex items-center gap-2"
          >
            <Play size={18} /> {status === "error" ? "Try again" : "Start"}
          </button>
        ) : (
          <button onClick={stop} className="bg-neutral-700 hover:bg-neutral-600 transition px-5 py-2 rounded-lg flex items-center gap-2">
            <Square size={18} /> Pause
          </button>
        )}
        <button
          onClick={reset}
          disabled={reps === 0}
          className="border border-stone-50 hover:bg-stone-50 hover:text-black disabled:opacity-40 transition px-5 py-2 rounded-lg flex items-center gap-2"
        >
          <RotateCcw size={18} /> Reset
        </button>
        <button
          onClick={save}
          disabled={reps === 0 || saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition px-5 py-2 rounded-lg flex items-center gap-2"
        >
          <Save size={18} /> {saving ? "Saving…" : "Save to log"}
        </button>
      </div>
      {status === "idle" && reps > 0 && (
        <p className="text-center text-gray-400 text-sm flex items-center justify-center gap-2">
          <CameraOff size={14} /> Paused. Save your {reps} reps or press Start to continue.
        </p>
      )}
    </div>
  );
}
