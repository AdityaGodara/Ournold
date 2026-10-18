"use client";
import React from "react";
import { useAuth } from "@/app/Context/AuthContext";
import { useApi } from "@/lib/useApi";
import { bmiCategory, current, fmt, toNum } from "@/lib/profile";
import { Skeleton } from "@/components/ui/Loader";
import InfoTip from "./InfoTip";
import MetricCard from "./MetricCard";

export default function Bmi() {
  const { userData } = useAuth();
  const cur = current(userData);
  const bmi = toNum(cur.bmi);
  // AI "ideal" value is cached server-side per profile snapshot, so this is cheap after the first call.
  const ideal = useApi<{ ideal_bmi: number | null }>(userData?.uid ? "/api/me/bmi" : null);
  const idealValue = ideal.data?.ideal_bmi ?? toNum(cur.ideal_bmi);

  return (
    <MetricCard
      title="Body Mass Index (BMI)"
      action={
        <InfoTip
          label="What is BMI?"
          text="BMI, or Body Mass Index, is a simple calculation that estimates body fat based on a person's weight and height."
        />
      }
    >
      <div className="flex gap-2 items-end">
        <p className="text-5xl">{fmt(bmi)}</p>
        {ideal.loading && idealValue === null ? (
          <Skeleton className="min-w-[4rem] h-[2rem]" />
        ) : (
          <p className="text-2xl text-gray-500" title="Ideal BMI for your goal (AI estimate)">
            {idealValue !== null ? fmt(idealValue) : "N/A"}
          </p>
        )}
      </div>
      <p>{bmiCategory(bmi)}</p>
    </MetricCard>
  );
}
