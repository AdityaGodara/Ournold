"use client";
import React from "react";

export interface MacroValues {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export const emptyMacros: MacroValues = { name: "", calories: "", protein: "", carbs: "", fat: "" };

const input =
  "w-full p-2 rounded mt-1 text-stone-50 bg-transparent border border-stone-500 focus:border-stone-50 focus:outline-none transition";

/** Editable name + macro inputs shared by the manual and photo flows. */
export default function MacroFields({
  value,
  onChange,
}: {
  value: MacroValues;
  onChange: (next: MacroValues) => void;
}) {
  const set = (k: keyof MacroValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });

  const num = (label: string, k: Exclude<keyof MacroValues, "name">, max: number) => (
    <label className="text-sm" htmlFor={`macro-${k}`}>
      {label}
      <input
        id={`macro-${k}`}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step="any"
        className={input}
        value={value[k]}
        onChange={set(k)}
      />
    </label>
  );

  return (
    <div className="grid grid-cols-1 gap-3">
      <label className="text-sm" htmlFor="macro-name">
        Name
        <input id="macro-name" maxLength={120} className={input} value={value.name} onChange={set("name")} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        {num("Calories (kcal)", "calories", 10000)}
        {num("Protein (g)", "protein", 1000)}
        {num("Carbs (g)", "carbs", 2000)}
        {num("Fat (g)", "fat", 1000)}
      </div>
    </div>
  );
}
