"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useAuth } from "@/app/Context/AuthContext";
import DashboardShell from "@/components/DashboardShell";
import MacroFields, { MacroValues, emptyMacros } from "@/components/food/MacroFields";
import { useToast } from "@/components/ui/Toast";
import { api, toApiError } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { saveMeal } from "@/lib/meals";

/** Local `YYYY-MM-DDTHH:mm` for the datetime-local input. */
const localInputValue = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function ManualFoodPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [macros, setMacros] = useState<MacroValues>(emptyMacros);
  const [when, setWhen] = useState(() => localInputValue(new Date()));
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState("");

  const lookup = async () => {
    const q = query.trim();
    if (!q) return;
    setLooking(true);
    setHint("");
    try {
      const { data } = await api.post("/api/macros", { name: q });
      setMacros({
        name: data.name || q,
        calories: String(Math.round(data.calories || 0)),
        protein: String(Math.round(data.protein || 0)),
        carbs: String(Math.round(data.carbs || 0)),
        fat: String(Math.round(data.fat || 0)),
      });
      if (!data.found) setHint("No reliable match found. Please enter the values manually.");
    } catch (e) {
      setMacros((m) => ({ ...m, name: m.name || q }));
      setHint(`${toApiError(e).message} You can still enter the values manually.`);
    } finally {
      setLooking(false);
    }
  };

  const save = async () => {
    if (!userData?.uid) return;
    setSaving(true);
    try {
      await saveMeal(userData.uid, {
        name: macros.name,
        calories: Number(macros.calories),
        protein: Number(macros.protein),
        carbs: Number(macros.carbs),
        fat: Number(macros.fat),
        at: new Date(when),
      });
      toast("Meal saved", "success");
      router.push("/dashboard/food");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save the meal.", "error");
      setSaving(false);
    }
  };

  const canSave = macros.name.trim() && macros.calories !== "" && !saving;

  return (
    <DashboardShell active="food">
      <div className={`max-w-xl flex flex-col mx-auto px-6 text-white mt-6 ${poiret.className}`}>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-4">Add Food / Guess Macros</h1>

        <form
          className="flex gap-2 mb-3"
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
        >
          <input
            aria-label="Food or recipe name"
            className="flex-1 p-2 rounded border border-stone-500 focus:border-stone-50 focus:outline-none bg-transparent text-stone-50 transition"
            placeholder="Food or recipe (e.g., chhole rice, banana)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={120}
          />
          <button
            type="submit"
            className="px-4 rounded bg-stone-50 hover:bg-gray-700 hover:text-stone-50 text-black transition flex items-center gap-2 disabled:opacity-50"
            disabled={looking || !query.trim()}
          >
            <Search size={18} />
            {looking ? "Looking…" : "Fetch"}
          </button>
        </form>

        {hint && (
          <p className="text-orange-300 mb-3" role="status">
            {hint}
          </p>
        )}

        <MacroFields value={macros} onChange={setMacros} />

        <label className="text-sm mt-3" htmlFor="meal-when">
          When did you eat this?
          <input
            id="meal-when"
            type="datetime-local"
            max={localInputValue(new Date())}
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full p-2 rounded mt-1 text-stone-50 bg-transparent border border-stone-500 focus:border-stone-50 focus:outline-none"
          />
        </label>

        <div className="flex items-center gap-3 mt-4">
          <button
            className="px-5 py-2 bg-green-600 rounded hover:bg-green-700 transition disabled:opacity-50"
            onClick={save}
            disabled={!canSave}
          >
            {saving ? "Saving…" : "Save to Meals"}
          </button>
          <span className="text-sm text-gray-300">Meal time is set from the time above.</span>
        </div>
      </div>
    </DashboardShell>
  );
}
