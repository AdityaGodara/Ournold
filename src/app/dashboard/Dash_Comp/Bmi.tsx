"use client";
import React, { useEffect, useState } from 'react'
import { Poiret_One } from 'next/font/google'
import { useAuth } from '@/app/Context/AuthContext'
import { Info } from 'lucide-react'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion';
import { slideAnimation } from '@/app/config/motion';
import { updateDoc, doc, collection } from 'firebase/firestore';

const fontPoiretOne = Poiret_One({
    subsets: ['latin'],
    weight: ['400'],
})

function Bmi() {
    const { userData, userDocRef } = useAuth();
    const [aiRes, setAiRes] = useState({});
    const [aiLoading, setAiLoading] = useState(true);
    const [comment, setComment] = useState('');

    useEffect(() => {
        // Early return if userData is not available
        if (!userData?.currentData || !userData?.uid || !userDocRef) {
            setAiLoading(false);
            return;
        }

        const fetchBMI = async () => {
            try {
                setAiLoading(true);

                // Check if ideal_bmi exists and has a value
                const idealBmi = userData.currentData.ideal_bmi;

                if (!idealBmi || idealBmi === '' || idealBmi === null || idealBmi === undefined) {
                    console.log("Fetching ideal_bmi from API...");

                    // Call API to get ideal_bmi
                    const res = await axios.get(`http://localhost:8000/api/user/${userData.uid}/bmi`);

                    // Update state with API response
                    setAiRes(res.data);

                    // Update Firestore - merge with existing currentData to preserve other fields
                    await updateDoc(userDocRef, {
                        "currentData.ideal_bmi": res.data.ideal_bmi
                    });

                    console.log("Updated Firestore with ideal_bmi:", res.data.ideal_bmi);
                }

                setAiLoading(false);
            } catch (error) {
                setAiLoading(false);
                console.error("Error fetching BMI:", error);
                // Optionally set error state to show user-friendly message
            }
        }

        fetchBMI();
        const comment_on_bmi = (current: number) => {

            if (current < 18.5) {
                setComment("Underweight")
            }
            else if (current >= 18.5 && current <= 24.9) {
                setComment("Normal Weight")
            }
            else if (current >= 25 && current <= 29.9) {
                setComment("Overweight")
            }
            else if (current >= 30 && current <= 34.9) {
                setComment("Obesity Level 1")
            }
            else if (current >= 35 && current <= 39.9) {
                setComment("Obesity Level 2")
            }
            else if (current >= 40) {
                setComment("Obesity Level 3")
            }
        }
        comment_on_bmi(userData.currentData.bmi);
    }, [userData?.uid, userDocRef]); // Only depend on uid and userDocRef, not entire userData



    return (
        <AnimatePresence>
            <motion.div
                variants={slideAnimation("up")}
                initial="initial"
                exit="exit"
                whileInView="animate"
                viewport={{ once: false, amount: 0.25 }}
                className={`text-stone-50 border-2 border-stone-50 p-5 rounded-xl min-w-[20rem] flex flex-col justify-around gap-2 max-w-[30rem] ${fontPoiretOne.className}`}
            >
                <span className="text-xl flex justify-between">
                    <span>Body Mass Index (BMI)</span>
                    <div className="relative group">
                        <Info
                            color="#939393ff"
                            strokeWidth={1}
                            className="cursor-pointer"
                        />
                        <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 w-72 text-sm bg-stone-900 text-stone-100 p-3 rounded-lg shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                            BMI, or Body Mass Index, is a simple calculation that estimates body fat
                            based on a person's weight and height.
                        </div>
                    </div>
                </span>

                <div className='flex gap-2 items-end'>
                    {aiLoading ? (
                        <div className='min-w-[10rem] h-[3rem] rounded-md bg-gray-500 animate-pulse'></div>
                    ) : (
                        <p className="text-5xl">{userData?.currentData?.bmi}</p>
                    )}

                    {aiLoading ? (
                        <div className='min-w-[4rem] h-[3rem] rounded-md bg-gray-500 animate-pulse'></div>
                    ) : (
                        <p className="text-2xl text-gray-500">
                            {userData?.currentData?.ideal_bmi || 'N/A'}
                        </p>
                    )}
                </div>

                {aiLoading ? (
                    <p className='min-w-[10rem] h-[20px] rounded-md bg-gray-500 animate-pulse'></p>
                ) : (
                    <p>{comment}</p>
                )}
            </motion.div>
        </AnimatePresence>
    )
}

export default Bmi