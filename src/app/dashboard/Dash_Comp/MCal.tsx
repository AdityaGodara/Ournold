"use client";
import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/app/Context/AuthContext";
import { useApi } from "@/lib/useApi";
import { current, fmt, toNum } from "@/lib/profile";
import { Skeleton } from "@/components/ui/Loader";
import MetricCard from "./MetricCard";

export default function MCal() {
  const { userData } = useAuth();
  const cur = current(userData);
  const maintenance = toNum(cur.maintenanceCalories);
  const req = useApi<{ req_intake: number | null }>(userData?.uid ? "/api/me/reqCal" : null);
  const target = toNum(req.data?.req_intake) ?? toNum(cur.daily_calorie_target);
  const percent = maintenance && target ? ((target - maintenance) / maintenance) * 100 : null;

  return (
    <MetricCard title="Required Calorie intake for next 30 Days">
      <div className="flex gap-2 items-end">
        {req.loading && target === null ? (
          <Skeleton className="min-w-[10rem] h-[3rem]" />
        ) : (
          <p className="text-5xl">{target !== null ? `${fmt(target, 0)} KCal` : "N/A"}</p>
        )}
      </div>
      <p className="text-xl text-gray-500">
        Your maintenance calories: {maintenance !== null ? `${fmt(maintenance, 0)} KCal` : "N/A"}
      </p>
      {percent !== null && (
        <div className="flex gap-2 items-center">
          <p>{percent.toFixed(2)} %</p>
          {percent >= 0 ? (
            <ChevronUp size={20} color="#ffffff" strokeWidth={1} aria-label="surplus" />
          ) : (
            <ChevronDown size={20} color="#ffffff" strokeWidth={1} aria-label="deficit" />
          )}
        </div>
      )}
    </MetricCard>
  );
}
