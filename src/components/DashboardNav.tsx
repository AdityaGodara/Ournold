"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BicepsFlexed, ChevronLeft, LineChart, Salad } from "lucide-react";
import { slideAnimation } from "@/app/config/motion";
import { poiret } from "@/lib/fonts";

export type NavKey = "food" | "dashboard" | "workout";

const ITEMS: { key: NavKey; label: string; href: string; Icon: typeof Salad; dir: "left" | "right" }[] = [
  { key: "food", label: "Food", href: "/dashboard/food", Icon: Salad, dir: "right" },
  { key: "dashboard", label: "Dashboard", href: "/dashboard", Icon: LineChart, dir: "right" },
  { key: "workout", label: "Workout", href: "/dashboard/workout", Icon: BicepsFlexed, dir: "left" },
];

/** Shared top navigation (back + logo + Food / Dashboard / Workout tabs). */
export default function DashboardNav({ active }: { active: NavKey }) {
  const router = useRouter();
  const [hovered, setHovered] = useState<NavKey | null>(null);

  return (
    <>
      <div className="absolute top-4 left-4 sm:top-10 sm:left-10 flex items-center gap-3 sm:gap-5 z-10">
        <button
          aria-label="Go back"
          onClick={() => router.back()}
          className="text-stone-50 hover:text-gray-500 hover:scale-[1.3] transition focus-visible:outline-2 focus-visible:outline-white rounded"
        >
          <ChevronLeft size={32} color="#ffffff" strokeWidth={1} />
        </button>
        <Link href="/" aria-label="Ournold home" className="hover:scale-[1.3] transition">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="Ournold logo" width={40} height={40} />
        </Link>
      </div>

      <nav
        aria-label="Primary"
        className={`flex justify-center items-end mb-5 gap-5 md:gap-10 text-stone-50 mt-16 sm:mt-5 ${poiret.className}`}
      >
        {ITEMS.map(({ key, label, href, Icon, dir }) => {
          const isActive = key === active;
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? "page" : undefined}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(key)}
              onBlur={() => setHovered(null)}
              className={`relative flex items-center gap-2 transition rounded focus-visible:outline-2 focus-visible:outline-white ${
                isActive ? "text-3xl" : "text-xl text-gray-400 hover:text-stone-50"
              }`}
            >
              {hovered === key && !isActive && (
                <motion.span
                  variants={slideAnimation(dir)}
                  initial="initial"
                  animate="animate"
                  className="hidden sm:inline-block"
                  aria-hidden
                >
                  <Icon color="#ffffff" strokeWidth={1.25} />
                </motion.span>
              )}
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
