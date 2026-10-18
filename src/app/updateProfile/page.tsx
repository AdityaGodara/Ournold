"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, deleteField, doc, writeBatch } from "firebase/firestore";
import ClickSpark from "@/components/ClickSpark";
import BackButton from "@/components/BackButton";
import GeminiKeyField from "@/components/auth/GeminiKeyField";
import Loader from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/app/Context/AuthContext";
import { db } from "@/app/firebase/config";
import { api, toApiError } from "@/lib/api";
import { invalidateAll } from "@/lib/apiCache";
import { poiret } from "@/lib/fonts";
import { ageFromDob, bmi, bmr, maintenanceCalories } from "@/lib/metrics";
import { ACTIVITY_LEVELS, BODY_TYPES, GOALS, current, normalizeGoal } from "@/lib/profile";
import { useApi } from "@/lib/useApi";

const input = "w-full border border-stone-500 focus:border-stone-50 rounded-md px-3 py-2 bg-transparent outline-none transition";
const opt = "bg-black";

export default function Page() {
  const router = useRouter();
  const toast = useToast();
  const { user, userData, loading } = useAuth();
  const keyStatus = useApi<{ configured: boolean }>(user ? "/api/me/gemini-key/status" : null);

  const [form, setForm] = useState({
    name: "", diet: "", weight: "", height: "", goal: "", explain_goal: "", any_complication: "",
    budget: "", body_type: "", exercise_intensity: "", gender: "", api_key: "",
  });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // populate once when the profile first arrives (not on every live update, which would clobber typing)
  useEffect(() => {
    if (!userData || ready) return;
    const c = current(userData);
    setForm({
      name: userData.name ?? "",
      diet: userData.diet ?? "",
      weight: String(c.weight ?? ""),
      height: String(c.height ?? ""),
      goal: normalizeGoal(c.goal),
      explain_goal: c.explain_goal ?? "",
      any_complication: c.any_complication ?? "",
      budget: String(c.budget ?? ""),
      body_type: c.body_type ?? "",
      exercise_intensity: c.exercise_intensity ?? "",
      gender: userData.gender ?? "male",
      api_key: "",
    });
    setReady(true);
  }, [userData, ready]);

  if (loading || !user || !ready) return <Loader />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(form.weight);
    const height = parseFloat(form.height);
    if (!(weight >= 20 && weight <= 300)) return toast("Weight must be between 20-300 kg.", "error");
    if (!(height >= 50 && height <= 250)) return toast("Height must be between 50-250 cm.", "error");
    if (form.name.trim().length < 2) return toast("Please enter your name.", "error");
    if (!form.goal) return toast("Please choose a goal.", "error");

    setSaving(true);
    try {
      const age = ageFromDob(userData.dob);
      const bmiValue = bmi(weight, height);
      const bmrValue = age ? bmr(weight, height, age, form.gender) : null;
      const now = new Date().toISOString();
      const maintenance = maintenanceCalories(bmrValue, form.exercise_intensity);

      const batch = writeBatch(db);
      batch.update(doc(db, "users", user.uid), {
        name: form.name.trim(),
        diet: form.diet.trim(),
        age: age ?? deleteField(),
        updatedAt: now,
        "currentData.weight": weight,
        "currentData.height": height,
        "currentData.goal": form.goal,
        "currentData.explain_goal": form.explain_goal.trim(),
        "currentData.any_complication": form.any_complication.trim(),
        "currentData.budget": parseFloat(form.budget) || 0,
        "currentData.body_type": form.body_type,
        "currentData.exercise_intensity": form.exercise_intensity,
        "currentData.bmi": bmiValue,
        "currentData.bmr": bmrValue,
        "currentData.maintenanceCalories": maintenance,
        "currentData.updatedAt": now,
        // legacy fields: req_cal_intake used to be overwritten with the money budget, ideal_bmi was hardcoded
        "currentData.req_cal_intake": deleteField(),
        "currentData.ideal_bmi": deleteField(),
        "currentData.ideal_bmr": deleteField(),
      });
      batch.set(doc(collection(db, "users", user.uid, "history")), {
        weight,
        height,
        bmi: bmiValue,
        bmr: bmrValue,
        goal: form.goal,
        timestamp: now,
      });
      await batch.commit();
      invalidateAll(); // targets, trends and AI notes depend on the profile

      if (form.api_key) {
        try {
          await api.put("/api/me/gemini-key", { key: form.api_key });
        } catch (err) {
          toast(`Profile saved, but the key wasn't updated: ${toApiError(err).message}`, "error");
          setSaving(false);
          return;
        }
      }
      toast("Profile updated", "success");
      router.back();
    } catch (err) {
      console.error(err);
      toast("Couldn't save your profile. Please try again.", "error");
      setSaving(false);
    }
  };

  const label = "text-lg";

  return (
    <ClickSpark>
      <BackButton />
      <main className={`w-full min-h-screen flex justify-center items-start py-20 px-3 text-stone-50 ${poiret.className}`}>
        <div className="w-full max-w-xl mx-auto p-6 sm:p-10 border border-stone-700 rounded-2xl backdrop-blur-sm bg-black/40">
          <h1 className="text-4xl text-center mb-8">Update Profile</h1>

          <form onSubmit={handleUpdate} className="flex flex-col gap-5">
            <label className={label} htmlFor="name">Full Name</label>
            <input id="name" className={input} value={form.name} onChange={set("name")} maxLength={80} />

            <label className={label} htmlFor="diet">Diet Preference</label>
            <input id="diet" className={input} value={form.diet} onChange={set("diet")} maxLength={80} placeholder="E.g., veg, non-veg, veg + eggs, vegan..." />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className={label} htmlFor="weight">Weight (kg)</label>
                <input id="weight" type="number" inputMode="decimal" step="0.1" min={20} max={300} className={input} value={form.weight} onChange={set("weight")} />
              </div>
              <div className="flex flex-col gap-2">
                <label className={label} htmlFor="height">Height (cm)</label>
                <input id="height" type="number" inputMode="decimal" min={50} max={250} className={input} value={form.height} onChange={set("height")} />
              </div>
            </div>

            <label className={label} htmlFor="goal">Fitness Goal</label>
            <select id="goal" className={input} value={form.goal} onChange={set("goal")}>
              <option className={opt} value="" disabled>Select goal</option>
              {GOALS.map((o) => (
                <option key={o.value} className={opt} value={o.value}>{o.label}</option>
              ))}
            </select>

            <label className={label} htmlFor="explain_goal">Explain Your Goal</label>
            <textarea id="explain_goal" rows={5} maxLength={500} className={`${input} resize-none`} value={form.explain_goal} onChange={set("explain_goal")} />

            <label className={label} htmlFor="complications">Allergies, injuries or complications</label>
            <textarea id="complications" rows={3} maxLength={500} className={`${input} resize-none`} value={form.any_complication} onChange={set("any_complication")} />

            <label className={label} htmlFor="budget">Monthly Fitness Budget (INR)</label>
            <input id="budget" type="number" inputMode="numeric" min={0} className={input} value={form.budget} onChange={set("budget")} />

            <label className={label} htmlFor="body_type">Body Type</label>
            <select id="body_type" className={input} value={form.body_type} onChange={set("body_type")}>
              <option className={opt} value="">Select</option>
              {BODY_TYPES.map((o) => (
                <option key={o.value} className={opt} value={o.value}>{o.label.split(" – ")[0]}</option>
              ))}
            </select>

            <label className={label} htmlFor="exercise">Exercise Frequency</label>
            <select id="exercise" className={input} value={form.exercise_intensity} onChange={set("exercise_intensity")}>
              <option className={opt} value="">Select</option>
              {ACTIVITY_LEVELS.map((o) => (
                <option key={o.value} className={opt} value={o.value}>{o.label}</option>
              ))}
            </select>

            <GeminiKeyField
              value={form.api_key}
              onChange={(v) => setForm((f) => ({ ...f, api_key: v }))}
              configured={keyStatus.data?.configured}
            />

            <button
              type="submit"
              disabled={saving}
              className="mt-3 py-3 bg-white/20 hover:bg-white/30 disabled:opacity-60 transition rounded-xl text-xl"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      </main>
    </ClickSpark>
  );
}
