"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Poiret_One } from "next/font/google";
import { useAuth } from "../Context/AuthContext";
import axios from "axios";
import { motion } from "framer-motion";
import { slideAnimation } from "../config/motion";

const fontPoiretOne = Poiret_One({
  subsets: ["latin"],
  weight: ["400"],
});

export default function DailyMacro() {
  const { userData } = useAuth();
  const [total, setTotal] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.uid) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/todayNutrition/${userData.uid}`
        );

        const data = res.data?.data || [];

        const totals = data.reduce(
          (acc: any, item: any) => ({
            calories: acc.calories + (item.cals || item.calories || 0),
            protein: acc.protein + (item.protein || 0),
            carbs: acc.carbs + (item.carbs || 0),
            fats: acc.fats + (item.fat || item.fats || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );

        setTotal(totals);
      } catch (error) {
        console.error("Error fetching daily macros:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userData?.uid]);

  const macroCards = useMemo(
    () => [
      { label: "Calories", value: `${Math.round(total.calories)} KCal` },
      { label: "Protein", value: `${Math.round(total.protein)} g` },
      { label: "Fats", value: `${Math.round(total.fats)} g` },
      { label: "Carbs", value: `${Math.round(total.carbs)} g` },
    ],
    [total]
  );

  return (
    <div
      className={`flex flex-col gap-5 items-center w-full px-4 sm:px-8 ${fontPoiretOne.className}`}
    >
      <h1 className="text-3xl text-stone-50">Today&apos;s</h1>

      {/* Calories Card */}
      <motion.div
        key="cal_goal"
        variants={slideAnimation("up")}
        initial="initial"
        whileInView="animate"
        viewport={{ once: false, amount: 0.25 }}
        className="text-stone-50 border-2 border-stone-50 p-4 sm:p-5 rounded-xl w-full sm:min-w-[20rem] flex flex-col gap-2"
      >
        <span className="text-xl flex justify-between">
          <span>Calories</span>
        </span>
        <div className="flex gap-2 items-end flex-wrap">
          {loading ? (
            <div className="min-w-[8rem] sm:min-w-[10rem] h-[2.5rem] sm:h-[3rem] rounded-md bg-gray-500 animate-pulse" />
          ) : (
            <p className="text-4xl sm:text-5xl">
              {Math.round(total.calories)} KCal
            </p>
          )}
          <div className="text-xl sm:text-2xl text-gray-500">
            {" / "}
            {userData?.currentData?.req_cal_intake || "N/A"}
          </div>
        </div>
      </motion.div>

      {/* Protein & Fat Row */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center w-full sm:w-fit">
        {["Protein", "Fats"].map((label) => {
          const key = label.toLowerCase() as "protein" | "fats";
          const value = total[key] || 0;

          return (
            <motion.div
              key={label}
              variants={slideAnimation("up")}
              initial="initial"
              whileInView="animate"
              viewport={{ once: false, amount: 0.25 }}
              className="text-stone-50 border-2 border-stone-50 p-4 sm:p-5 rounded-xl flex-1 sm:flex-none flex flex-col gap-2 min-w-[10rem]"
            >
              <span className="text-xl flex justify-between">
                <span>{label}</span>
              </span>
              <div className="flex gap-2 items-end">
                {loading ? (
                  <div className="min-w-[8rem] sm:min-w-[10rem] h-[2.5rem] sm:h-[3rem] rounded-md bg-gray-500 animate-pulse" />
                ) : (
                  <p className="text-4xl sm:text-5xl">{Math.round(value)} g</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Carbs Card */}
      <motion.div
        key="carb_goal"
        variants={slideAnimation("up")}
        initial="initial"
        whileInView="animate"
        viewport={{ once: false, amount: 0.25 }}
        className="text-stone-50 border-2 border-stone-50 p-4 sm:p-5 rounded-xl w-full sm:min-w-[20rem] flex flex-col gap-2"
      >
        <span className="text-xl flex justify-between">
          <span>Carbs</span>
        </span>
        <div className="flex gap-2 items-end flex-wrap">
          {loading ? (
            <div className="min-w-[8rem] sm:min-w-[10rem] h-[2.5rem] sm:h-[3rem] rounded-md bg-gray-500 animate-pulse" />
          ) : (
            <p className="text-4xl sm:text-5xl">{Math.round(total.carbs)} g</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}