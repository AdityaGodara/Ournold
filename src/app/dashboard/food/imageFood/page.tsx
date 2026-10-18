"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CloudUpload, RotateCcw, Sparkles } from "lucide-react";
import { useAuth } from "@/app/Context/AuthContext";
import DashboardShell from "@/components/DashboardShell";
import MacroFields, { MacroValues } from "@/components/food/MacroFields";
import { Skeleton } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { api, toApiError } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { saveMeal } from "@/lib/meals";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;

/** Downscale to <=1280px JPEG so uploads are fast and always under the server's 5 MB limit. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", 0.85)
  );
}

export default function ImageFoodPage() {
  const router = useRouter();
  const toast = useToast();
  const { userData } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [macros, setMacros] = useState<MacroValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  // release the object URL when it changes / on unmount
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setMacros(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Please choose an image file.");
    if (f.size > MAX_INPUT_BYTES) return setError("That image is too large (max 15 MB).");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMacros(null);
    setError(null);
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", await compress(file), "meal.jpg");
      const { data } = await api.post("/api/me/analyzeFood", body);
      setMacros({
        name: data.food_name,
        calories: String(Math.round(data.total_calories)),
        protein: String(Math.round(data.protein_g)),
        carbs: String(Math.round(data.carbs_g)),
        fat: String(Math.round(data.fat_g)),
      });
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const add = async () => {
    if (!macros || !userData?.uid) return;
    setSaving(true);
    try {
      await saveMeal(userData.uid, {
        name: macros.name,
        calories: Number(macros.calories),
        protein: Number(macros.protein),
        carbs: Number(macros.carbs),
        fat: Number(macros.fat),
      });
      toast("Meal added", "success");
      router.push("/dashboard/food");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save the meal.", "error");
      setSaving(false);
    }
  };

  return (
    <DashboardShell active="food">
      <div className={`${poiret.className} flex flex-col lg:flex-row items-center lg:items-start justify-center text-white gap-8 p-6`}>
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <h1 className="text-2xl sm:text-3xl font-semibold">Upload Food Image</h1>

          {!preview ? (
            <label className="w-full flex flex-col items-center gap-3 border-2 border-dashed border-gray-500 hover:border-stone-50 rounded-xl p-8 cursor-pointer transition text-center focus-within:border-stone-50">
              <CloudUpload strokeWidth={1.25} size={40} />
              <span className="text-gray-300">Tap to take or choose a photo</span>
              <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="sr-only" />
            </label>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Selected food" className="w-64 h-64 object-cover rounded-xl shadow-lg" />
          )}

          {preview && !macros && (
            <button
              onClick={analyze}
              disabled={analyzing}
              className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-semibold disabled:opacity-50 transition flex items-center gap-2"
            >
              <Sparkles size={18} /> {analyzing ? "Analyzing…" : "Analyze"}
            </button>
          )}
          {preview && (
            <button onClick={reset} className="text-sm text-gray-400 hover:text-stone-50 transition flex items-center gap-1">
              <RotateCcw size={14} /> Choose a different photo
            </button>
          )}
          {error && (
            <p className="text-red-400 text-center" role="alert">
              {error}
            </p>
          )}
        </div>

        {analyzing && (
          <div className="bg-gray-800 p-4 rounded-xl shadow-md w-full max-w-sm" aria-busy>
            <Skeleton className="w-full h-[30px] mb-6 rounded-xl" />
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-1/2 h-[20px] mb-2 rounded-xl" />
            ))}
          </div>
        )}

        {macros && (
          <div className="bg-gray-800 p-4 rounded-xl shadow-md w-full max-w-sm">
            <p className="text-sm text-gray-400 mb-3">AI estimate, adjust anything that looks off.</p>
            <MacroFields value={macros} onChange={setMacros} />
            <div className="flex gap-3 mt-5">
              <button
                className="flex-1 p-3 rounded-lg bg-green-500 hover:bg-green-600 transition flex gap-2 justify-center items-center disabled:opacity-50"
                onClick={add}
                disabled={saving || !macros.name.trim()}
              >
                <Check color="#ffffff" strokeWidth={1.25} />
                <span>{saving ? "Saving…" : "Add to meals"}</span>
              </button>
              <button
                className="flex-1 p-3 rounded-lg bg-red-500 hover:bg-red-600 transition flex gap-2 justify-center items-center"
                onClick={reset}
              >
                <RotateCcw color="#ffffff" strokeWidth={1.25} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
