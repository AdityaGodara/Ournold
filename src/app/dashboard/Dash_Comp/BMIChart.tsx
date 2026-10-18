"use client";
import React from "react";
import HistoryLineChart from "./HistoryLineChart";

export default function BMIChart() {
  return (
    <HistoryLineChart endpoint="/api/me/bmiGraph" field="bmi" title="BMI Progress" legend="BMI" empty="No BMI data available." />
  );
}
