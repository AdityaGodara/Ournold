"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/Context/AuthContext";
import { useRouter } from "next/navigation";
import ClickSpark from "@/components/ClickSpark";
import { Poiret_One } from "next/font/google";
import { ChevronLeft, Salad, BicepsFlexed } from "lucide-react";
import Bmi from "./Dash_Comp/Bmi";
import Bmr from "./Dash_Comp/Bmr";
import WeightChart from "./Dash_Comp/WeightChart";
import MCal from "./Dash_Comp/MCal";
import { motion } from "framer-motion";
import { slideAnimation } from "../config/motion";
import BMIChart from "./Dash_Comp/BMIChart";
import ChatBox from "./ChatBox";

const fontPoiretOne = Poiret_One({
    subsets: ["latin"],
    weight: ["400"],
});

interface ActiveItemState {
    food: boolean;
    workout: boolean;
    dashboard: boolean;
}

export default function Page() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // ✅ Hooks MUST come before any conditional return
    const [activeItem, setActiveItem] = useState<ActiveItemState>({
        dashboard: true,
        workout: false,
        food: false,
    });

    // ✅ Redirect safely inside useEffect
    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [loading, user, router]);

    // ❗ Do NOT return before hooks. Only return JSX below.
    if (loading || !user) {
        return <div className="w-full h-screen flex justify-center items-center bg-black">
            <div className="honeycomb">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
        </div>;
    }

    const mouseIn = (item: keyof ActiveItemState) => {
        setActiveItem((prev) => ({ ...prev, [item]: true }));
    };

    const mouseOut = (item: keyof ActiveItemState) => {
        setActiveItem((prev) => ({ ...prev, [item]: false }));
    };

    return (
        <ClickSpark sparkColor="#fff" sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
            <div>
                <ChevronLeft
                    size={32}
                    color="#ffffff"
                    strokeWidth={1}
                    className="absolute top-4 left-4 sm:top-10 sm:left-10 text-stone-50 hover:text-gray-500 hover:scale-[1.5] transition cursor-pointer"
                    onClick={() => router.back()}
                />
                <img src="../../icon.png" alt="ournold-logo"
                    className="absolute top-4 left-10 sm:top-10 sm:left-20 text-stone-50 hover:text-gray-500 hover:scale-[1.5] transition cursor-pointer"
                    onClick={() => router.push("/")} width={40} />
            </div>

            <div className="flex flex-col md:flex-row gap-5 mt-5">
                <div className="w-full h-screen flex flex-col items-center gap-2">
                    {/* Nav */}
                    <div className={`flex mb-5 gap-5 md:gap-10 text-stone-50 mt-2 ${fontPoiretOne.className}`}>
                        <span
                            className="text-xl text-gray-500 hover:text-stone-50 flex justify-center items-center transition cursor-pointer"
                            onMouseOver={() => mouseIn("food")}
                            onMouseOut={() => mouseOut("food")}
                            onClick={() => router.push("/dashboard/food")}
                        >
                            Food
                            {activeItem.food && (
                                <motion.span
                                    variants={slideAnimation("right")}
                                    initial="initial"
                                    exit="exit"
                                    whileInView="animate"
                                    viewport={{ once: false, amount: 0.25 }}
                                    className="inline-block mr-25 absolute"
                                >
                                    <Salad color="#ffffff" strokeWidth={1.25} />
                                </motion.span>
                            )}
                        </span>

                        <span className="text-3xl hover:text-gray-500 transition cursor-pointer">Dashboard</span>

                        <span
                            className="text-xl text-gray-500 hover:text-stone-50 transition cursor-pointer"
                            onMouseOver={() => mouseIn("workout")}
                            onMouseOut={() => mouseOut("workout")}
                            onClick={() => router.push("/dashboard/workout")}
                        >
                            Workout
                            {activeItem.workout && (
                                <motion.span
                                    variants={slideAnimation("left")}
                                    initial="initial"
                                    animate="animate"
                                    className="inline-block absolute"
                                >
                                    <BicepsFlexed color="#ffffff" strokeWidth={1.25} />
                                </motion.span>
                            )}
                        </span>
                    </div>

                    {/* Metrics */}
                    <div className="flex flex-col md:flex-row gap-8">
                        <Bmi />
                        <Bmr />
                        <MCal />
                    </div>

                    <div className="flex flex-col md:flex-row gap-10 items-center">
                        <WeightChart />
                        <BMIChart />
                    </div>
                </div>

                <ChatBox convo="general" />
            </div>
        </ClickSpark>
    );
}
