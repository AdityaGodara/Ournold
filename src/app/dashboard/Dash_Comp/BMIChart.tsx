"use client";
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { ResponsiveLine } from "@nivo/line";
import { useAuth } from "@/app/Context/AuthContext";
import { Poiret_One } from "next/font/google";

const fontPoiretOne = Poiret_One({
    subsets: ["latin"],
    weight: ["400"],
});

interface BMIEntry {
    date: string;
    bmi: number;
}

export default function BMIChart() {
    const { userData } = useAuth();
    const [data, setData] = useState<BMIEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!userData?.uid) {
                setError("User not authenticated");
                setLoading(false);
                return;
            }

            try {
                const res = await axios.get<{
                    data: Array<{ date: string; bmi: number | string }>;
                }>(`http://localhost:8000/api/user/${userData.uid}/bmiGraph`, {
                    withCredentials: true,
                });

                const normalized = (res.data.data || [])
                    .map((entry) => ({
                        date: entry.date.split("T")[0],
                        bmi:
                            typeof entry.bmi === "number"
                                ? entry.bmi
                                : Number(entry.bmi),
                    }))
                    .filter((d) => !isNaN(d.bmi))
                    .sort(
                        (a, b) =>
                            new Date(a.date).getTime() -
                            new Date(b.date).getTime()
                    );

                setData(normalized);
            } catch (err) {
                console.error(err);
                setError("Failed to fetch BMI data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userData?.uid]);

    const chartData = useMemo(() => {
        if (!data.length) return [];
        return [
            {
                id: "BMI Progress",
                color: "#ffffff",
                data: data.map((d) => ({ x: d.date, y: d.bmi })),
            },
        ];
    }, [data]);

    if (error)
        return <div className="text-red-500">{String(error)}</div>;

    if (!data.length)
        return (
            <div className={`${fontPoiretOne.className} text-stone-50`}>
                No BMI data available.
            </div>
        );

    const latest = data[data.length - 1].bmi;
    const first = data[0].bmi;
    const change = latest - first;

    return (
        <div className="bg-transparent dark:bg-neutral-900 rounded-xl shadow p-4 md:p-6">
            {loading ? (
                <div className="w-[100px] h-[30px] bg-gray-500 animate-pulse rounded-lg"></div>
            ) : (
                <h2
                    className={`font-semibold mb-4 tracking-tight text-2xl text-stone-50 ${fontPoiretOne.className}`}
                >
                    BMI Progress
                </h2>
            )}

            {loading ? (
                <div className="w-[450px] h-[250px] rounded-lg bg-gray-500 animate-pulse"></div>
            ) : (
                <div style={{ height: 250, width: 450 }}>
                    <ResponsiveLine
                        data={chartData}
                        margin={{
                            top: 20,
                            right: 30,
                            bottom: 50,
                            left: 50,
                        }}
                        xScale={{ type: "point" }}
                        yScale={{
                            type: "linear",
                            min: "auto",
                            max: "auto",
                        }}
                        curve="monotoneX"
                        axisBottom={{
                            tickRotation: -30,
                            legend: "Date",
                            legendOffset: 45,
                            legendPosition: "middle",
                        }}
                        axisLeft={{
                            legend: "BMI",
                            legendOffset: -45,
                            legendPosition: "middle",
                        }}
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
                                domain: {
                                    line: {
                                        stroke: "#ffffff",
                                        strokeWidth: 1,
                                    },
                                },
                                ticks: {
                                    line: {
                                        stroke: "#84b5ff",
                                        strokeWidth: 1,
                                    },
                                    text: {
                                        fill: "#ffffff",
                                        fontSize: 13,
                                        fontFamily:
                                            fontPoiretOne.style.fontFamily,
                                    },
                                },
                                legend: {
                                    text: {
                                        fill: "#adadad",
                                        fontSize: 12,
                                        fontFamily:
                                            fontPoiretOne.style.fontFamily,
                                    },
                                },
                            },

                            grid: {
                                line: {
                                    stroke: "#e5e5e5",
                                    strokeWidth: 1,
                                },
                            },

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
            )}

            <div
                className={`${fontPoiretOne.className} text-stone-50 mt-6 flex flex-wrap gap-4 text-sm md:text-base`}
            >
                <div>
                    <strong>Current BMI:</strong> {latest.toFixed(1)}
                </div>
                <div>
                    <strong>Change:</strong>{" "}
                    {change >= 0
                        ? `+${change.toFixed(1)}`
                        : change.toFixed(1)}
                </div>
            </div>
        </div>
    );
}
