"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { ResponsiveLine } from "@nivo/line";
import { useAuth } from "@/app/Context/AuthContext";
import { Poiret_One } from "next/font/google";

const fontPoiretOne = Poiret_One({
  subsets: ["latin"],
  weight: ["400"],
});

interface ProteinDataPoint {
  date: string;
  protein: number;
}

interface ProteinChartData {
  id: string;
  data: { x: string; y: number }[];
}

export default function ProteinChart() {
  const { userData } = useAuth();
  const [data, setData] = useState<ProteinChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProtein, setTotalProtein] = useState(0);
  const [avgProtein, setAvgProtein] = useState(0);

  useEffect(() => {
    const fetchProteinHistory = async () => {
      if (!userData?.uid) return;
      try {
        setLoading(true);
        const res = await axios.get<{ data: ProteinDataPoint[] }>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/proteinHistory/${userData.uid}`
        );

        const proteinData = res.data.data;

        if (proteinData && proteinData.length > 0) {
          // Sort data by date to ensure chronological order
          const sortedData = proteinData.sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          // Transform data for Nivo line chart with formatted dates
          const chartData: ProteinChartData[] = [
            {
              id: "Protein Intake",
              data: sortedData.map((point) => ({
                x: new Date(point.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                }),
                y: point.protein,
              })),
            },
          ];

          setData(chartData);

          // Calculate totals and averages
          const total = proteinData.reduce((sum, point) => sum + point.protein, 0);
          setTotalProtein(total);
          setAvgProtein(total / proteinData.length);
        } else {
          // Clear data if no results
          setData([]);
          setTotalProtein(0);
          setAvgProtein(0);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch protein history data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProteinHistory();
  }, [userData?.uid]);

  if (error)
    return <div className="text-red-400 text-center mt-4">{error}</div>;

  if (loading)
    return (
      <div className="w-full h-[400px] bg-gray-500 animate-pulse rounded-xl"></div>
    );

  if (!data || data.length === 0 || data[0].data.length === 0)
    return (
      <div className={`${fontPoiretOne.className} text-stone-50 text-center p-8`}>
        No protein intake history available.
      </div>
    );

  return (
    <div className="bg-transparent dark:bg-neutral-900 rounded-xl shadow p-4 md:p-6 flex flex-col w-full">
      <h2
        className={`text-2xl font-semibold text-stone-50 mb-4 ${fontPoiretOne.className}`}
      >
        Protein Consumption Over Time
      </h2>

      <div style={{ height: 400, width: "100%" }}>
        <ResponsiveLine
          data={data}
          margin={{ top: 30, right: 40, bottom: 80, left: 60 }}
          xScale={{ type: "point" }}
          yScale={{
            type: "linear",
            min: 0,
            max: "auto",
            stacked: false,
          }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: "Date",
            legendOffset: 60,
            legendPosition: "middle",
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: "Protein (g)",
            legendOffset: -50,
            legendPosition: "middle",
          }}
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
              domain: {
                line: {
                  stroke: "#555",
                  strokeWidth: 1,
                },
              },
              ticks: {
                line: {
                  stroke: "#555",
                  strokeWidth: 1,
                },
                text: {
                  fill: "#fff",
                  fontSize: 12,
                  fontFamily: fontPoiretOne.style.fontFamily,
                },
              },
              legend: {
                text: {
                  fill: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: fontPoiretOne.style.fontFamily,
                },
              },
            },

            grid: {
              line: {
                stroke: "#333",
                strokeWidth: 1,
              },
            },

            tooltip: {
              container: {
                background: "#1f1f1f",
                color: "#fff",
                borderRadius: "8px",
                padding: "8px 12px",
                fontFamily: fontPoiretOne.style.fontFamily,
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

      <div
        className={`${fontPoiretOne.className} text-stone-300 mt-6 text-sm flex gap-6 flex-wrap justify-center`}
      >
        <p>
          <span className="text-stone-400">Total Protein:</span>{" "}
          <span className="text-stone-50 font-semibold">
            {totalProtein.toFixed(1)} g
          </span>
        </p>
        <p>
          <span className="text-stone-400">Average Daily:</span>{" "}
          <span className="text-stone-50 font-semibold">
            {avgProtein.toFixed(1)} g
          </span>
        </p>
        <p>
          <span className="text-stone-400">Data Points:</span>{" "}
          <span className="text-stone-50 font-semibold">
            {data[0].data.length}
          </span>
        </p>
      </div>
    </div>
  );
}