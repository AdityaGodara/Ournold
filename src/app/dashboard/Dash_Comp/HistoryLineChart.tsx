"use client";
import React, { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { useAuth } from "@/app/Context/AuthContext";
import { useApi } from "@/lib/useApi";
import { poiret } from "@/lib/fonts";
import { ErrorState, Skeleton } from "@/components/ui/Loader";

interface Props {
  endpoint: string;
  field: "weight" | "bmi";
  title: string;
  legend: string;
  unit?: string;
  empty: string;
}

/** Line chart of a profile metric over time (shared by Weight and BMI). Same theme as before. */
export default function HistoryLineChart({ endpoint, field, title, legend, unit = "", empty }: Props) {
  const { userData } = useAuth();
  const { data, loading, error, refetch } = useApi<{ data: Array<Record<string, string | number>> }>(
    userData?.uid ? endpoint : null
  );

  const points = useMemo(
    () =>
      (data?.data ?? [])
        .map((r) => ({ x: String(r.date).split("T")[0], y: Number(r[field]) }))
        .filter((p) => Number.isFinite(p.y)),
    [data, field]
  );

  if (error) return <ErrorState message={`Couldn't load ${title.toLowerCase()}.`} onRetry={() => refetch()} />;

  if (loading) {
    return (
      <div className="p-4 md:p-6 w-full max-w-[34rem]">
        <Skeleton className="w-[100px] h-[30px] mb-4" />
        <Skeleton className="w-full h-[250px] rounded-lg" />
      </div>
    );
  }

  if (!points.length) return <div className={`${poiret.className} text-stone-50 p-4`}>{empty}</div>;

  const latest = points[points.length - 1].y;
  const change = latest - points[0].y;

  return (
    <div className="bg-transparent rounded-xl shadow p-4 md:p-6 w-full max-w-[34rem]">
      <h2 className={`font-semibold mb-4 tracking-tight text-2xl text-stone-50 ${poiret.className}`}>{title}</h2>
      <div style={{ height: 250 }} role="img" aria-label={`${title} chart. Latest ${latest.toFixed(1)} ${unit}`}>
        <ResponsiveLine
          data={[{ id: title, color: "#ffffff", data: points }]}
          margin={{ top: 20, right: 30, bottom: 50, left: 50 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
          curve="monotoneX"
          axisBottom={{ tickRotation: -30, legend: "Date", legendOffset: 45, legendPosition: "middle" }}
          axisLeft={{ legend, legendOffset: -45, legendPosition: "middle" }}
          enableGridX={false}
          enableGridY={true}
          gridYValues={5}
          colors={["#ffffff"]}
          lineWidth={2}
          enablePoints={true}
          pointSize={10}
          pointColor="#ffffff"
          pointBorderWidth={2}
          pointBorderColor="#000000"
          useMesh={true}
          theme={{
            background: "#1b1b1b",
            axis: {
              domain: { line: { stroke: "#ffffff", strokeWidth: 1 } },
              ticks: {
                line: { stroke: "#84b5ff", strokeWidth: 1 },
                text: { fill: "#ffffff", fontSize: 13, fontFamily: poiret.style.fontFamily },
              },
              legend: { text: { fill: "#adadad", fontSize: 12, fontFamily: poiret.style.fontFamily } },
            },
            grid: { line: { stroke: "#e5e5e5", strokeWidth: 1 } },
            tooltip: {
              container: {
                background: "#1f1f1f",
                color: "#f0f0f0",
                border: "1px solid #000",
                fontFamily: "'Poppins', sans-serif",
                fontSize: 13,
              },
            },
          }}
        />
      </div>
      <div className={`${poiret.className} text-stone-50 mt-6 flex flex-wrap gap-4 text-sm md:text-base`}>
        <div>
          <strong>Current {field === "bmi" ? "BMI" : "Weight"}:</strong> {latest.toFixed(1)}
          {unit && ` ${unit}`}
        </div>
        <div>
          <strong>Change:</strong> {change >= 0 ? "+" : ""}
          {change.toFixed(1)}
          {unit && ` ${unit}`}
        </div>
      </div>
    </div>
  );
}
