"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { ResponsivePie } from "@nivo/pie";
import { useAuth } from "@/app/Context/AuthContext";
import { Poiret_One } from "next/font/google";

const fontPoiretOne = Poiret_One({
  subsets: ["latin"],
  weight: ["400"],
});

interface MacroData {
  protein: number;
  carbs: number;
  fats: number;
}

export default function MacroPie() {
  const { userData } = useAuth();
  const [data, setData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMacros = async () => {
      if (!userData?.uid) return;
      try {
        setLoading(true);
        const res = await axios.get<{ data: MacroData }>(
          `http://localhost:8000/api/user/macroHistory/${userData.uid}`
        );
        setData(res.data.data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch macro history data.");
      } finally {
        setLoading(false);
      }
    };

    fetchMacros();
  }, [userData?.uid]);

  if (error)
    return <div className="text-red-400 text-center mt-4">{error}</div>;
  if (loading)
    return (
      <div className="w-[300px] h-[300px] bg-gray-500 animate-pulse rounded-full"></div>
    );
  if (!data)
    return (
      <div className={`${fontPoiretOne.className} text-stone-50`}>
        No macro history available.
      </div>
    );

  const total = data.protein + data.carbs + data.fats;
  if (total === 0)
    return (
      <div className={`${fontPoiretOne.className} text-stone-50`}>
        No macro intake recorded this year.
      </div>
    );

  const pieData = [
    { id: "Protein", value: data.protein, color: "#6bcfed" },
    { id: "Carbs", value: data.carbs, color: "#f1c232" },
    { id: "Fats", value: data.fats, color: "#f57c7c" },
  ];

  return (
    <div className="bg-transparent dark:bg-neutral-900 rounded-xl shadow p-4 md:p-6 flex flex-col items-center w-[70%]">
      <h2
        className={`text-2xl font-semibold text-stone-50 mb-4 ${fontPoiretOne.className}`}
      >
        Yearly Macro Ratio
      </h2>

      <div style={{ height: 300, width: 300 }}>
        <ResponsivePie
          data={pieData}
          margin={{ top: 30, right: 40, bottom: 40, left: 40 }}
          innerRadius={0.55}
          padAngle={1.5}
          cornerRadius={3}
          activeOuterRadiusOffset={6}
          colors={({ data }) => data.color}
          borderWidth={2}
          borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="#fff"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: "color" }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor="#000"
          theme={{
            background: "transparent",
            text: {
              fontSize: 14,
              fill: "#fff",
            },
            tooltip: {
              container: {
                background: "#1f1f1f",
                color: "#fff",
                borderRadius: "8px",
                padding: "6px 10px",
              },
            },
          }}
          tooltip={({ datum }) => (
            <div className="bg-neutral-900 text-white px-3 py-2 rounded-md text-sm">
              <strong>{datum.id}</strong>: {datum.value.toFixed(1)} g (
              {((datum.value / total) * 100).toFixed(1)}%)
            </div>
          )}
        />
      </div>

      <div
        className={`${fontPoiretOne.className} text-stone-300 mt-4 text-sm flex gap-4 flex-wrap justify-center`}
      >
        <p>Protein: {data.protein.toFixed(1)} g</p>
        <p>Carbs: {data.carbs.toFixed(1)} g</p>
        <p>Fats: {data.fats.toFixed(1)} g</p>
      </div>
    </div>
  );
}