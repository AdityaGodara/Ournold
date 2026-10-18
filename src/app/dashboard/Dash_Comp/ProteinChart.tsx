"use client";
import React, { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { useAuth } from "@/app/Context/AuthContext";
import { useApi } from "@/lib/useApi";
import { userTimezone } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { ErrorState, Skeleton } from "@/components/ui/Loader";

export default function ProteinChart() {
  const { userData } = useAuth();
  const { data, loading, error, refetch } = useApi<{ data: { date: string; protein: number }[] }>(
    userData?.uid ? "/api/me/proteinHistory" : null,
    { tz: userTimezone() }
  );

  const points = useMemo(() => data?.data ?? [], [data]);
  const chartData = useMemo(
    () => [
      {
        id: "Protein Intake",
        data: points.map((p) => ({
          x: new Date(`${p.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          y: p.protein,
        })),
      },
    ],
    [points]
  );

  if (error) return <ErrorState message="Couldn't load protein history." onRetry={() => refetch()} />;
  if (loading) return <Skeleton className="w-full h-[400px] rounded-xl" />;
  if (!points.length)
    return (
      <div className={`${poiret.className} text-stone-50 text-center p-8`}>No protein intake history available.</div>
    );

  const total = points.reduce((s, p) => s + p.protein, 0);
  const avg = total / points.length;

  return (
    <div className="bg-transparent rounded-xl shadow p-4 md:p-6 flex flex-col w-full">
      <h2 className={`text-2xl font-semibold text-stone-50 mb-4 ${poiret.className}`}>Protein Consumption Over Time</h2>

      <div style={{ height: 400, width: "100%" }} role="img" aria-label={`Protein intake over the last 30 days, average ${avg.toFixed(0)} grams`}>
        <ResponsiveLine
          data={chartData}
          margin={{ top: 30, right: 40, bottom: 80, left: 60 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: 0, max: "auto", stacked: false }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: -45, legend: "Date", legendOffset: 60, legendPosition: "middle" }}
          axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: "Protein (g)", legendOffset: -50, legendPosition: "middle" }}
          colors={["#6bcfed"]}
          pointSize={8}
          pointColor={{ theme: "background" }}
          pointBorderWidth={2}
          pointBorderColor={{ from: "serieColor" }}
          pointLabelYOffset={-12}
          enableArea={true}
          areaOpacity={0.15}
          useMesh={true}
          theme={{
            background: "transparent",
            axis: {
              domain: { line: { stroke: "#555", strokeWidth: 1 } },
              ticks: {
                line: { stroke: "#555", strokeWidth: 1 },
                text: { fill: "#fff", fontSize: 12, fontFamily: poiret.style.fontFamily },
              },
              legend: { text: { fill: "#fff", fontSize: 14, fontWeight: 600, fontFamily: poiret.style.fontFamily } },
            },
            grid: { line: { stroke: "#333", strokeWidth: 1 } },
            tooltip: {
              container: {
                background: "#1f1f1f",
                color: "#fff",
                borderRadius: "8px",
                padding: "8px 12px",
                fontFamily: poiret.style.fontFamily,
                fontSize: 12,
              },
            },
          }}
          tooltip={({ point }) => (
            <div className="bg-neutral-900 text-white px-3 py-2 rounded-md text-sm">
              <strong>Date:</strong> {point.data.xFormatted}
              <br />
              <strong>Protein:</strong> {point.data.yFormatted} g
            </div>
          )}
        />
      </div>

      <div className={`${poiret.className} text-stone-300 mt-6 text-sm flex gap-6 flex-wrap justify-center`}>
        <p>
          <span className="text-stone-400">Total Protein:</span>{" "}
          <span className="text-stone-50 font-semibold">{total.toFixed(1)} g</span>
        </p>
        <p>
          <span className="text-stone-400">Average Daily:</span>{" "}
          <span className="text-stone-50 font-semibold">{avg.toFixed(1)} g</span>
        </p>
        <p>
          <span className="text-stone-400">Days Logged:</span>{" "}
          <span className="text-stone-50 font-semibold">{points.length}</span>
        </p>
      </div>
    </div>
  );
}
