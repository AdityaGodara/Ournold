"use client";
import React from "react";
import { motion } from "framer-motion";
import { slideAnimation } from "@/app/config/motion";
import { poiret } from "@/lib/fonts";

/** Outline card shared by BMI / BMR / calorie metrics (same look as before). */
export default function MetricCard({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      variants={slideAnimation("up")}
      initial="initial"
      exit="exit"
      whileInView="animate"
      viewport={{ once: false, amount: 0.25 }}
      className={`text-stone-50 border-2 border-stone-50 p-5 rounded-xl w-full md:w-auto md:min-w-[20rem] flex flex-col justify-around gap-2 ${poiret.className} ${className}`}
    >
      <h2 className="text-xl flex justify-between gap-3 font-normal">
        <span>{title}</span>
        {action}
      </h2>
      {children}
    </motion.section>
  );
}
