"use client";
import React from "react";
import HistoryLineChart from "./HistoryLineChart";

export default function WeightChart() {
  return (
    <HistoryLineChart
      endpoint="/api/me/weight"
      field="weight"
      title="Weight Progress"
      legend="Weight (kg)"
      unit="kg"
      empty="No weight data available."
    />
  );
}
