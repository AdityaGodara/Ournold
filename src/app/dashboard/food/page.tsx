"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/Context/AuthContext";
import { useRouter } from "next/navigation";
import ClickSpark from "@/components/ClickSpark";
import { Poiret_One } from "next/font/google";
import {
    ChevronLeft,
    ChartLine,
    BicepsFlexed,
    Camera,
    Laugh,
    Smile,
    Frown,
    ThumbsDown,
    PlusCircle,
    Sparkles,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { bounceIn, slideAnimation } from "@/app/config/motion";
import ChatBox from "../ChatBox";
import axios from "axios";
import DailyMacro from "@/app/Components/DailyMacro";
import MacroPie from "../Dash_Comp/MacroPie";
import ProteinChart from "../Dash_Comp/ProteinChart";

const fontPoiretOne = Poiret_One({
    subsets: ["latin"],
    weight: ["400"],
});

interface ActiveItemState {
    food: boolean;
    workout: boolean;
    dashboard: boolean;
}

interface Meal {
    id?: string;
    meal_name?: string;
    meal_time?: string;
    timestamp?: string;
    protein?: number;
    carbs?: number;
    fats?: number;
    cals?: number;
    rating?: string;
    rating_explain?: string;
}

interface TodayFood {
    meal_plan: {
        breakfast?: string[];
        lunch?: string[];
        snack?: string[];
        dinner?: string[];
        late_night_meal?: string[];
    };
    total_daily_macros: {
        calories?: string;
        protein?: string;
        carbs?: string;
        fats?: string;
    };
}

export default function FoodPage() {
    const { userData } = useAuth();
    const [mealData, setMealData] = useState<Meal[]>([]);
    const [todayFood, setTodayFood] = useState<TodayFood>({
        meal_plan: {},
        total_daily_macros: {},
    });
    const [activeItem, setActiveItem] = useState<ActiveItemState>({
        dashboard: false,
        workout: false,
        food: true,
    });

    // NEW: collapsible state
    const [openSection, setOpenSection] = useState<string | null>(null);

    const router = useRouter();

    const mouseIn = (item: keyof ActiveItemState) =>
        setActiveItem((prev) => ({ ...prev, [item]: true }));
    const mouseOut = (item: keyof ActiveItemState) =>
        setActiveItem((prev) => ({ ...prev, [item]: false }));

    useEffect(() => {
        const fetchMealData = async () => {
            if (!userData?.uid) return;
            try {
                const res = await axios.get(
                    `http://localhost:8000/api/user/meals/${userData.uid}`
                );
                if (res.data?.data) setMealData(res.data.data);
            } catch (error) {
                console.error("Error fetching meal data:", error);
            }
        };

        const getTodaysDate = () => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        };

        const fetchTodayFood = async () => {
            if (!userData?.uid) return;

            const todaysDate = getTodaysDate();
            const cacheKey = `todayFood_${userData.uid}`;
            const cachedDateKey = `todayFoodDate_${userData.uid}`;

            try {
                // Check if we have cached data for today
                const cachedData = localStorage.getItem(cacheKey);
                const cachedDate = localStorage.getItem(cachedDateKey);

                if (cachedData && cachedDate === todaysDate) {
                    // Use cached data if it's from today
                    console.log("✅ Using cached today's food data");
                    setTodayFood(JSON.parse(cachedData));
                    return;
                }

                // If no cache or it's a new day, fetch fresh data
                console.log("🔄 Fetching fresh today's food data...");
                const res = await axios.get(
                    `http://localhost:8000/api/todayFood/${userData.uid}`
                );

                if (res.data?.meal_plan) {
                    // Store in state
                    setTodayFood(res.data);

                    // Cache the data with today's date
                    localStorage.setItem(cacheKey, JSON.stringify(res.data));
                    localStorage.setItem(cachedDateKey, todaysDate);
                    console.log("💾 Cached today's food data");
                }
            } catch (error) {
                console.error("Error fetching today's food:", error);

                // Fallback to cached data even if it's old (better than nothing)
                const cachedData = localStorage.getItem(cacheKey);
                if (cachedData) {
                    console.log("⚠️ Using old cached data as fallback");
                    setTodayFood(JSON.parse(cachedData));
                }
            }
        };

        fetchMealData();
        fetchTodayFood();
    }, [userData]);

    const handleRating = (rating: string) => {
        switch (rating) {
            case "best":
                return <Laugh size={40} color="#00ff11" strokeWidth={1.25} />;
            case "good":
                return <Smile size={40} color="#aaff00" strokeWidth={1.25} />;
            case "bad":
                return <Frown size={40} color="#ff6600" strokeWidth={1.25} />;
            case "worst":
                return <ThumbsDown size={40} color="#ff0000" strokeWidth={1.25} />;
            default:
                return null;
        }
    };

    const toggleSection = (section: string) => {
        setOpenSection((prev) => (prev === section ? null : section));
    };

    const renderMealSection = (title: string, items?: string[]) => {
        if (!items || items.length === 0) return null;

        const isOpen = openSection === title;

        return (
            <div className="w-full">
                <div
                    onClick={() => toggleSection(title)}
                    className="flex justify-between items-center cursor-pointer py-2 border-b border-gray-300"
                >
                    <p className="font-semibold text-lg">{title}</p>
                    {isOpen ? (
                        <ChevronUp size={22} color="#ffb434" />
                    ) : (
                        <ChevronDown size={22} color="#ffb434" />
                    )}
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden mt-2 pl-2"
                        >
                            {items.map((item, index) => (
                                <p key={index} className="mb-1 text-sm">
                                    <span className="font-semibold">{item.split("(")[0].trim()}</span>{" "}
                                    ({item.match(/\(.*\)/)?.[0].replace(/[()]/g, "")})
                                </p>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <ClickSpark>
            {/* Back Button */}
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

            <div className="flex flex-col items-center px-4 sm:px-6 md:px-8">
                {/* Navigation Tabs */}
                <div
                    className={`flex flex-wrap justify-center mb-5 gap-3 sm:gap-5 md:gap-10 text-stone-50 mt-5 ${fontPoiretOne.className}`}
                >
                    <span
                        className="text-lg sm:text-xl text-gray-500 hover:text-stone-50 flex justify-center items-center transition cursor-pointer relative"
                        onMouseOver={() => mouseIn("dashboard")}
                        onMouseOut={() => mouseOut("dashboard")}
                        onClick={() => router.push("/dashboard")}
                    >
                        Dashboard
                        {activeItem.dashboard && (
                            <motion.span
                                variants={slideAnimation("right")}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="inline-block mr-30 absolute"
                            >
                                <ChartLine color="#ffffff" strokeWidth={1.25} />
                            </motion.span>
                        )}
                    </span>

                    <span
                        className="text-2xl sm:text-3xl flex justify-center items-center transition cursor-pointer relative"
                        onMouseOver={() => mouseIn("food")}
                        onMouseOut={() => mouseOut("food")}
                        onClick={() => router.push("/dashboard/food")}
                    >
                        Food
                    </span>

                    <span
                        className="text-lg sm:text-xl text-gray-500 hover:text-stone-50 flex justify-center items-center transition cursor-pointer relative"
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
                                exit="exit"
                                className="inline-block ml-30 absolute"
                            >
                                <BicepsFlexed color="#ffffff" strokeWidth={1.25} />
                            </motion.span>
                        )}
                    </span>
                </div>

                {/* Upload Buttons */}
                <div
                    className={`${fontPoiretOne.className} flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 w-full sm:w-auto`}
                >
                    <motion.button
                        variants={bounceIn}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        viewport={{ once: false, amount: 0.3 }}
                        className="max-h-fit px-4 py-3 rounded-md bg-green-500 hover:bg-green-600 duration-200 cursor-pointer text-stone-50 flex gap-2 items-center justify-center"
                        onClick={() => router.push("/dashboard/food/imageFood")}
                    >
                        <Camera color="#ffffff" strokeWidth={1.25} /> Upload food image
                    </motion.button>

                    <motion.div
                        variants={bounceIn}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        viewport={{ once: false, amount: 0.3 }}
                        className="max-h-fit px-4 py-3 rounded-md border-1 border-stone-50 flex justify-center text-stone-50 gap-3 hover:border-gray-500 transition cursor-pointer"
                        onClick={() => router.push("/dashboard/food/manual")}
                    >
                        <PlusCircle color="#ffffff" strokeWidth={1.25} /> Add manually
                    </motion.div>
                </div>

                {/* Main Layout */}
                <div className="mt-6 flex flex-col lg:flex-row justify-start gap-6 w-full">
                    {/* Meals List */}
                    <div className="w-full lg:w-[30%]">
                        <h1 className={`${fontPoiretOne.className} text-2xl sm:text-3xl text-stone-50`}>
                            Meals
                        </h1>
                        {mealData.length > 0 ? (
                            <ul
                                className={`${fontPoiretOne.className} mt-3 text-stone-300 flex flex-col gap-3`}
                            >
                                {mealData.slice(0, 5).map((meal, index) => (
                                    <li
                                        key={meal.id || index}
                                        className="flex flex-col gap-3 border-1 border-stone-50 rounded-xl p-3"
                                    >
                                        <div>
                                            <span className="text-lg sm:text-xl font-bold">
                                                {meal.meal_name
                                                    ? meal.meal_name.length > 40
                                                        ? `${meal.meal_name.slice(0, 40)} ...`
                                                        : meal.meal_name
                                                    : "Unknown Meal"}
                                            </span>
                                            <p className="text-base sm:text-lg text-gray-500">
                                                {meal.meal_time
                                                    ? `${meal.meal_time} | ${meal.timestamp?.slice(0, 10)}`
                                                    : ""}
                                            </p>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                                            <div className="flex flex-col gap-2 w-full sm:w-auto justify-center items-center">
                                                {handleRating(meal.rating ?? "")}
                                                <span className="text-sm text-center">{meal.rating_explain}</span>
                                            </div>
                                            <div className="text-left w-full sm:w-auto text-sm sm:text-base">
                                                {<p>Protein: {meal.protein} g</p>}
                                                {<p>Carbs: {meal.carbs} g</p>}
                                                {<p>Fat: {meal.fats} g</p>}
                                                {<p>Calories: {meal.cals} KCal</p>}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-400 mt-2 text-sm">
                                No meals logged yet (if you have added meals, wait for some time
                                to load.)
                            </p>
                        )}
                    </div>

                    {/* Right Side Content */}
                    <div className="w-full lg:w-[70%]">
                        <div className="flex flex-col xl:flex-row gap-5 justify-around">
                            <div className="w-full xl:w-auto">
                                <DailyMacro />
                            </div>

                            {/* Today's Menu (Collapsible) */}
                            <div className="w-full xl:w-[50%] text-stone-50">
                                <div
                                    className={`w-full flex flex-col gap-2 justify-start items-center border-2 border-stone-50 rounded-md py-3 px-4 text-stone-50 transition ${fontPoiretOne.className}`}
                                >
                                    <div className="flex gap-2 items-center">
                                        <span className="text-lg sm:text-xl">Your today's menu!</span>
                                        <Sparkles size={30} color="#ffb434" strokeWidth={1.25} />
                                    </div>

                                    <div className="flex flex-col gap-2 w-full">
                                        {!todayFood.meal_plan?.breakfast ? (
                                            <>
                                                {[...Array(4)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className="bg-gray-500 animate-pulse rounded-xl w-full h-[25px]"
                                                    ></div>
                                                ))}
                                            </>
                                        ) : (
                                            <>
                                                {renderMealSection(
                                                    "Breakfast",
                                                    todayFood.meal_plan.breakfast
                                                )}
                                                {renderMealSection("Lunch", todayFood.meal_plan.lunch)}
                                                {renderMealSection("Snack", todayFood.meal_plan.snack)}
                                                {renderMealSection("Dinner", todayFood.meal_plan.dinner)}
                                                {renderMealSection(
                                                    "Late Night Meal",
                                                    todayFood.meal_plan.late_night_meal
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Always visible total macros */}
                                    <div className="mt-3 pt-2 text-sm text-stone-50 w-full">
                                        <p>
                                            <span className="font-semibold">Total Daily Calories:</span>{" "}
                                            {todayFood.total_daily_macros.calories}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Protein:</span>{" "}
                                            {todayFood.total_daily_macros.protein}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Carbs:</span>{" "}
                                            {todayFood.total_daily_macros.carbs}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Fats:</span>{" "}
                                            {todayFood.total_daily_macros.fats}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className=" flex flex-col md:flex-row gap-5 justify-between mt-10">
                            <MacroPie />
                            <ProteinChart />
                        </div>
                    </div>
                </div>

                {/* ChatBox */}
                <div className="mt-5 w-full flex justify-center">
                    <ChatBox convo="diet" />
                </div>
            </div>
        </ClickSpark>
    );
}