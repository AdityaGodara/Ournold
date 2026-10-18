"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ScanLine } from "lucide-react";
import { useAuth } from "@/app/Context/AuthContext";
import DashboardShell from "@/components/DashboardShell";
import { ErrorState } from "@/components/ui/Loader";
import { poiret } from "@/lib/fonts";
import { useApi } from "@/lib/useApi";
import InsightCard from "../Dash_Comp/InsightCard";
import InsightSkeleton from "../Dash_Comp/InsightSkeleton";
import HistorySection from "./HistorySection";
import PlanSection from "./PlanSection";
import ProgressSection from "./ProgressSection";

function BodyFacts() {
  const { userData } = useAuth();
  const { data, loading, error, refetch } = useApi<{ insights: { title: string; description: string }[] }>(
    userData?.uid ? "/api/me/bodyInsights" : null
  );

  return (
    <section aria-labelledby="facts-h" className={`${poiret.className} text-stone-50`}>
      <h2 id="facts-h" className="text-2xl sm:text-3xl font-normal mb-3">
        Your bodily facts
      </h2>
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 w-full">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <InsightSkeleton key={i} />)
            : (data?.insights ?? []).map((ins, i) => <InsightCard key={i} title={ins.title} description={ins.description} />)}
        </div>
      )}
    </section>
  );
}

export default function WorkoutPage() {
  // bump to refresh stats after a session is deleted
  const [version, setVersion] = useState(0);

  return (
    <DashboardShell active="workout" chat="workout">
      <div className="max-w-4xl mx-auto px-4 flex flex-col gap-8">
        <PlanSection />

        <Link
          href="/dashboard/workout/rep-counter"
          className={`${poiret.className} border border-neutral-700 hover:border-stone-50 transition rounded-xl p-4 flex items-center gap-4 text-stone-50`}
        >
          <ScanLine size={36} strokeWidth={1.25} />
          <div>
            <p className="text-xl">Webcam rep counter</p>
            <p className="text-sm text-gray-400">Squats, push-ups, curls and presses counted automatically, privately on your device.</p>
          </div>
        </Link>

        <ProgressSection refreshKey={version} />
        <HistorySection onChange={() => setVersion((v) => v + 1)} />
        <BodyFacts />
      </div>
    </DashboardShell>
  );
}
