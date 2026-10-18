"use client";
import React from "react";
import { useAuth } from "@/app/Context/AuthContext";
import { current, fmt } from "@/lib/profile";
import InfoTip from "./InfoTip";
import MetricCard from "./MetricCard";

export default function Bmr() {
  const { userData } = useAuth();
  const cur = current(userData);

  return (
    <MetricCard
      title="Basal Metabolic Rate (BMR)"
      action={
        <InfoTip
          label="What is BMR?"
          text="It represents the minimum amount of energy your body uses to stay alive, even when you are completely at rest and not digesting any food."
        />
      }
    >
      <div className="flex gap-2 items-end">
        <p className="text-5xl">{fmt(cur.bmr, 0)}</p>
        <p className="text-xl text-gray-500 pb-1">kcal/day</p>
      </div>
    </MetricCard>
  );
}
