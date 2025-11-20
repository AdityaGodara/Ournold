import { useAuth } from '@/app/Context/AuthContext'
import React, {useState, useEffect} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { slideAnimation } from '@/app/config/motion'
import { Poiret_One } from 'next/font/google'
import axios from 'axios'

const fontPoiretOne = Poiret_One({
    subsets: ['latin'],
    weight: ['400'],
})

type GoalKey =
    | "lose weight"
    | "build muscle"
    | "increase endurance"
    | "improve flexibilty"
    | "tone body"
    | "overall fitness"
    | "recover";

const goalMap: Record<GoalKey, string> = {
    "lose weight": "Lose Weight – Burn fat and slim down",
    "build muscle": "Build Muscle – Gain strength and muscle mass",
    "increase endurance": "Increase Endurance – Improve stamina and cardio performance",
    "improve flexibilty": "Improve Flexibility – Increase mobility and reduce stiffness",
    "tone body": "Tone Body – Lean muscles, firm shape without big bulk",
    "overall fitness": "Improve Overall Fitness – General health and wellness",
    "recover": "Rehabilitation / Recover – Recover from injury or improve mobility"
}

export default function GoalSum() {

    const { userData } = useAuth();
    const goalKey = userData?.currentData?.goal as GoalKey
    const [aiRes, setAiRes] = useState({});
    const [aiLoading, setAiLoading] = useState(true);

    useEffect(() => {
        const fetchBMI = async () => {
            try {
                setAiLoading(true);
                const res = await axios.get(`http://localhost:8000/api/user/healthSummary/${userData.uid}`);
                setAiRes(res.data);
                setAiLoading(false);
            } catch (error) {
                setAiLoading(false)
                console.error(error);
            }
        }

        fetchBMI();
    }, [userData])

    return (
        <AnimatePresence>
            <div className='flex flex-col gap-5'>
                <motion.div
                    variants={slideAnimation("left")}
                    initial="initial"
                    exit="exit"
                    whileInView="animate"
                    viewport={{ once: false, amount: 0.25 }}
                    className={`${fontPoiretOne.className} flex flex-col gap-2`}>
                    <h1 className='text-stone-50 text-2xl'>Your current goal:</h1>
                    <p className='text-stone-50 text-lg ml-8'>{goalMap[goalKey]}</p>
                </motion.div>
                <motion.div
                    variants={slideAnimation("left")}
                    initial="initial"
                    exit="exit"
                    whileInView="animate"
                    viewport={{ once: false, amount: 0.25 }}
                    className={`${fontPoiretOne.className} flex flex-col gap-2`}>
                    <h1 className='text-stone-50 text-2xl'>Current Health Summary by AI:</h1>
                    {aiLoading ? <div className='w-[30rem] h-[3rem] bg-gray-500 rounded-lg animate-pulse'></div> : <p className='text-stone-50 text-lg ml-8 max-w-[30rem]'>{aiRes.ai_response}</p>}
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
