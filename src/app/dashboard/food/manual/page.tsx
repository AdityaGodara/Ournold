"use client";

import React, { useState } from "react";
import axios from "axios";
import { db } from "@/app/firebase/config";
import {
  collection,
  addDoc,
} from "firebase/firestore";
import { Poiret_One } from "next/font/google";
import { useAuth } from "@/app/Context/AuthContext";
import ClickSpark from "@/components/ClickSpark";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type Macros = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number | null;
};

const fontPoiretOne = Poiret_One({
  subsets: ["latin"],
  weight: ["400"],
});

export default function MacrosForm() {
  // userId prop: pass the authenticated Firebase user uid here.
  // If omitted, items will be stored under "users/anonymous/meals"
  const [query, setQuery] = useState("");
  const [macros, setMacros] = useState<Macros | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { userData } = useAuth();
  const router = useRouter();

  // helper to auto-calc meal time based on local hour
  const getMealTime = (date = new Date()) => {
    const hour = date.getHours();
    // Basic heuristic (local time)
    if (hour >= 5 && hour < 10) return "breakfast";
    if (hour >= 10 && hour < 15) return "lunch";
    if (hour >= 15 && hour < 18) return "snack";
    if (hour >= 18 && hour < 23) return "dinner";
    return "snack";
  };

  const fetchMacros = async () => {
    if (!query.trim()) return setError("Enter a food name");
    setLoading(true);
    setError("");
    setMacros(null);

    try {
      const res = await axios.post("http://localhost:8000/api/macros", { name: query.trim() });
      const data = res.data;
      if (data.error) {
        setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
        return;
      }
      // data: { found: boolean, name, calories, protein, carbs, fat, confidence }
      setMacros({
        name: data.name || query,
        calories: Number(data.calories || 0),
        protein: Number(data.protein || 0),
        carbs: Number(data.carbs || 0),
        fat: Number(data.fat || 0),
        confidence: data.confidence ?? null,
      });
      // If not found, still set macros (all zeros) so user can enter manual values
      if (!data.found) {
        setError("No reliable API result; you can enter values manually.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || err?.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Macros, value: string) => {
    if (!macros) {
      setMacros({
        name: query,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    }
    setMacros((m) => {
      if (!m) return null;
      return { ...m, [field]: field === "name" ? value : Number(value) };
    });
  };

  const saveToFirestore = async () => {
    if (!macros) return setError("No macros to save");
    setSaving(true);
    setError("");

    try {
      const uid = userData.uid;
      const meal_time = getMealTime();
      const mealDoc = {
        meal_name: macros.name,
        cals: Number(macros.calories || 0),
        protein: Number(macros.protein || 0),
        carbs: Number(macros.carbs || 0),
        fat: Number(macros.fat || 0),
        timestamp: new Date().toISOString(),
        meal_time,
      };

      const colRef = collection(db, "users", uid, "meals");
      await addDoc(colRef, mealDoc);

      // optionally clear UI
      setQuery("");
      setMacros(null);
      setError("");
      alert("Saved meal!");
    } catch (err: any) {
      console.error(err);
      setError("Failed to save meal: " + (err?.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ClickSpark>

      <div>
                <ChevronLeft
                    size={32}
                    color="#ffffff"
                    strokeWidth={1}
                    className="absolute top-4 left-4 sm:top-10 sm:left-10 text-stone-50 hover:text-gray-500 hover:scale-[1.5] transition cursor-pointer"
                    onClick={() => router.back()}
                />
            </div>
      <div className={`max-w-xl flex flex-col mx-auto p-6 rounded-lg text-white mt-10 ${fontPoiretOne.className}`}>
        <h2 className="text-2xl font-semibold mb-4">Add Food / Guess Macros</h2>

        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 p-2 rounded border text-stone-50"
            placeholder="Enter food or recipe name (e.g., chhole rice, banana)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="px-4 rounded bg-stone-50 hover:bg-gray-700 hover:text-stone-50 text-black transition cursor-pointer"
            onClick={fetchMacros}
            disabled={loading}
          >
            {loading ? "Looking..." : "Fetch"}
          </button>
        </div>

        {error && <p className="text-orange-300 mb-2">{error}</p>}

        {/* Editable macro fields */}
        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm">
            Name
            <input
              className="w-full p-2 rounded mt-1 text-stone-50"
              value={macros?.name ?? query}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Calories (kcal)
              <input
                type="number"
                className="w-full p-2 rounded mt-1 text-stone-50"
                value={macros?.calories ?? ""}
                onChange={(e) => handleChange("calories", e.target.value)}
              />
            </label>

            <label className="text-sm">
              Protein (g)
              <input
                type="number"
                className="w-full p-2 rounded mt-1 text-stone-50"
                value={macros?.protein ?? ""}
                onChange={(e) => handleChange("protein", e.target.value)}
              />
            </label>

            <label className="text-sm">
              Carbs (g)
              <input
                type="number"
                className="w-full p-2 rounded mt-1 text-stone-50"
                value={macros?.carbs ?? ""}
                onChange={(e) => handleChange("carbs", e.target.value)}
              />
            </label>

            <label className="text-sm">
              Fat (g)
              <input
                type="number"
                className="w-full p-2 rounded mt-1 text-stone-50"
                value={macros?.fat ?? ""}
                onChange={(e) => handleChange("fat", e.target.value)}
              />
            </label>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 cursor-pointer"
              onClick={saveToFirestore}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save to Meals"}
            </button>

            <div className="text-sm text-gray-300">
              Meal time will be set automatically based on current time.
            </div>
          </div>
        </div>
      </div>
    </ClickSpark>
  );
}
