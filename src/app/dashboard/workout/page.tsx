"use client";
import React, { useState, useEffect } from 'react'
import { Poiret_One } from 'next/font/google';
import { useAuth } from '@/app/Context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { slideAnimation } from '@/app/config/motion';
import { LineChart, Salad, ChevronLeft, TriangleAlert } from 'lucide-react';
import axios from 'axios';
import InsightCard from '../Dash_Comp/InsightCard';
import InsightSkeleton from '../Dash_Comp/InsightSkeleton';

const fontPoiretOne = Poiret_One({
  subsets: ['latin'],
  weight: ['400']
})

interface ActiveItemState {
  food: boolean;
  workout: boolean;
  dashboard: boolean;
}

export default function page() {

  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const [Insights, setInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  const [activeItem, setActiveItem] = useState<ActiveItemState>({
    dashboard: false,
    workout: true,
    food: false
  })

  useEffect(() => {
    if (!userData?.uid) return;

    const fetchInsights = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/bodyInsights/${userData.uid}`,
          { withCredentials: true }
        );
        setInsights(res.data.insights);
      } catch (err) {
        console.error("Error fetching insights:", err);
      } finally {
        setLoadingInsights(false); // Stop skeleton
      }
    }

    fetchInsights();
  }, [userData?.uid]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="text-white p-10">
        <div className="w-full h-screen flex justify-center items-center bg-black">
          <div className="honeycomb">
            <div></div><div></div><div></div>
            <div></div><div></div><div></div>
            <div></div>
          </div>
        </div>
      </div>
    );
  }

  const mouseIn = (item: keyof ActiveItemState) => {
    setActiveItem((prev) => ({ ...prev, [item]: true }));
  };

  const mouseOut = (item: keyof ActiveItemState) => {
    setActiveItem((prev) => ({ ...prev, [item]: false }));
  };

  return (
    <div>

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

      <div className='flex flex-col justify-center items-center'>
        <div className={`flex mb-5 gap-5 md:gap-10 text-stone-50 mt-5 ${fontPoiretOne.className}`}>
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

          <span className="text-3xl flex justify-center items-center transition cursor-pointer">
            Workout
          </span>

          <span
            className="text-xl text-gray-500 hover:text-stone-50 flex justify-center items-center transition cursor-pointer"
            onMouseOver={() => mouseIn("dashboard")}
            onMouseOut={() => mouseOut("dashboard")}
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
            {activeItem.dashboard && (
              <motion.span
                variants={slideAnimation("left")}
                initial="initial"
                exit="exit"
                whileInView="animate"
                viewport={{ once: false, amount: 0.25 }}
                className="inline-block ml-35 absolute"
              >
                <LineChart color="#ffffff" strokeWidth={1.25} />
              </motion.span>
            )}
          </span>
        </div>

        <div className={`${fontPoiretOne.className} text-stone-50 flex flex-col gap-5 p-5`}>
          <div className='flex flex-col md:flex-row gap-5 justify-center items-center w-full h-[30vh]'>
            <TriangleAlert color="#ffd500" strokeWidth={1.25} size={50} />
            <h1 className='text-xl'>This page is under work. Will be activated soon.
              <br />
              Meanwhile, you can see...
            </h1>
          </div>

          <h1 className='text-2xl'>Your bodily facts: </h1>

          <div className="grid gap-6 md:grid-cols-2 w-full">
            {loadingInsights
              ? Array.from({ length: 4 }).map((_, idx) => <InsightSkeleton key={idx} />)
              : Insights.map((ins, idx) => (
                  <InsightCard
                    key={idx}
                    title={ins.title}
                    description={ins.description}
                  />
                ))}
          </div>

        </div>
      </div>
    </div>
  )
}
