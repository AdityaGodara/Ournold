"use client";
import React from "react";
import dynamic from "next/dynamic";
import DashboardShell from "@/components/DashboardShell";
import Loader from "@/components/ui/Loader";

// TensorFlow.js + the pose model are heavy: only load them on this page, and only in the browser.
const RepCounterView = dynamic(() => import("./RepCounterView"), {
  ssr: false,
  loading: () => <Loader fullscreen={false} />,
});

export default function RepCounterPage() {
  return (
    <DashboardShell active="workout">
      <RepCounterView />
    </DashboardShell>
  );
}
