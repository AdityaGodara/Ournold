import React, { useEffect, useState } from 'react'
import { Poiret_One } from 'next/font/google'
import { useAuth } from '@/app/Context/AuthContext'
import { ChevronUp, ChevronDown } from 'lucide-react'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { slideAnimation } from '@/app/config/motion'
import { updateDoc } from 'firebase/firestore'

const fontPoiretOne = Poiret_One({
    subsets: ['latin'],
    weight: ['400'],
})

export default function MCal() {

    const { userData, userDocRef } = useAuth();
    const [aiRes, setAiRes] = useState({});
    const [aiLoading, setAiLoading] = useState(true);

    useEffect(() => {
        // Early return if userData is not available
        if (!userData?.currentData || !userData?.uid || !userDocRef) {
            setAiLoading(false);
            return;
        }

        const fetchCal = async () => {
            try {
                setAiLoading(true);

                // Check if ideal_bmi exists and has a value
                const req_cal_intake = userData.currentData.req_cal_intake;

                if (!req_cal_intake || req_cal_intake === '' || req_cal_intake === null || req_cal_intake === undefined) {
                    console.log("Fetching req_cal_intake from API...");

                    // Call API to get ideal_bmi
                    const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/reqCal/${userData.uid}`);

                    // Update state with API response
                    setAiRes(res.data);

                    // Update Firestore - merge with existing currentData to preserve other fields
                    await updateDoc(userDocRef, {
                        "currentData.req_cal_intake": res.data.req_intake
                    });

                    console.log("Updated Firestore with req_cal_intake:", res.data.req_intake);
                }

                setAiLoading(false);
            } catch (error) {
                setAiLoading(false);
                console.error("Error fetching BMI:", error);
                // Optionally set error state to show user-friendly message
            }
        }

        fetchCal();
    }, [userData?.uid, userDocRef]);

    const getPercent = (mCal: number, rCal: number) => {
        const result = ((rCal - mCal) / mCal) * 100
        return result.toFixed(2)
    }

    return (
        <AnimatePresence>
            <motion.div
                variants={slideAnimation("up")}
                initial="initial"
                exit="exit"
                whileInView="animate"
                viewport={{ once: false, amount: 0.25 }}
                className={`text-stone-50 border-2 border-stone-50 p-5 rounded-xl min-w-[20rem] flex flex-col gap-2 ${fontPoiretOne.className}`} >
                <span className={`text-xl flex justify-between`}>
                    <span>Required Calorie intake for next 30 Days</span>
                    {/* <div className="relative group">
                        <Info
                            color="#939393ff"
                            strokeWidth={1}
                            className="cursor-pointer"
                        />

                        <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 w-72 text-sm bg-stone-900 text-stone-100 p-3 rounded-lg shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Caloric intake is the total amount of energy, measured in calories,
                            that a person consumes through food and beverages
                        </div>
                    </div> */}
                </span>
                <div className='flex gap-2 items-end'>
                    {aiLoading ? <div className='min-w-[10rem] h-[3rem] rounded-md bg-gray-500 animate-pulse'></div> : <p className={`text-5xl`}>{userData?.currentData?.req_cal_intake || 'N/A'} KCal</p>}
                </div>
                {aiLoading ? (
                    <p className='min-w-[2rem] h-[2rem] rounded-md bg-gray-500 animate-pulse'></p>
                ) : (
                    <p className='text-xl text-gray-500'>
                        Your maintenance calories:{" "}
                        {userData.currentData.maintenanceCalories
                            ? `${userData.currentData.maintenanceCalories} KCal`
                            : "N/A"}
                    </p>

                )}
                {aiLoading ? (
                    <p className='min-w-[10rem] h-[20px] rounded-md bg-gray-500 animate-pulse'></p>
                ) : (
                    <div className='flex gap-2 items-center'>
                        <p>{getPercent(userData.currentData.maintenanceCalories, userData.currentData.req_cal_intake)} %</p>
                        {userData.currentData.maintenanceCalories < userData.currentData.req_cal_intake ? <ChevronUp size={20} color="#ffffff" strokeWidth={1} /> : <ChevronDown size={20} color="#ffffff" strokeWidth={1} />}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    )
}
