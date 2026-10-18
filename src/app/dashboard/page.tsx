"use client";
import React from "react";
import DashboardShell from "@/components/DashboardShell";
import Bmi from "./Dash_Comp/Bmi";
import Bmr from "./Dash_Comp/Bmr";
import MCal from "./Dash_Comp/MCal";
import WeightChart from "./Dash_Comp/WeightChart";
import BMIChart from "./Dash_Comp/BMIChart";
import TodayGlance from "./Dash_Comp/TodayGlance";
import DashboardInsights from "./Dash_Comp/DashboardInsights";

export default function Page() {
  return (
    <DashboardShell active="dashboard" chat="general">
      <div className="flex flex-col items-center gap-6 px-4">
        <TodayGlance />

        <DashboardInsights />

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full md:w-auto">
          <Bmi />
          <Bmr />
          <MCal />
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-center lg:items-start w-full justify-center">
          <WeightChart />
          <BMIChart />
        </div>
      </div>
    </DashboardShell>
  );
}
