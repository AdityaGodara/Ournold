import React, { useEffect, useState } from 'react'
import { Poiret_One } from 'next/font/google'
import { useAuth } from '@/app/Context/AuthContext'
import { Info } from 'lucide-react'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { slideAnimation } from '@/app/config/motion'

const fontPoiretOne = Poiret_One({
    subsets: ['latin'],
    weight: ['400'],
})

function Bmr() {

    const { userData } = useAuth();

    return (
        <AnimatePresence>
            <motion.div
                variants={slideAnimation("up")}
                initial="initial"
                exit="exit"
                whileInView="animate"
                viewport={{ once: false, amount: 0.25 }}
                className={`text-stone-50 border-2 border-stone-50 p-5 rounded-xl min-w-[20rem] flex flex-col justify-around gap-2 ${fontPoiretOne.className}`} >
                <span className={`text-xl flex justify-between`}>
                    <span>Basal Metabolic Rate (BMR)</span>
                    <div className="relative group">
                        <Info
                            color="#939393ff"
                            strokeWidth={1}
                            className="cursor-pointer"
                        />

                        <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 w-72 text-sm bg-stone-900 text-stone-100 p-3 rounded-lg shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            It represents the minimum amount of energy your body uses to stay alive,
                            even when you are completely at rest and not digesting any food.
                        </div>
                    </div>
                </span>
                <div className='flex gap-2 items-end'>
                    <p className={`text-5xl`}>{userData.currentData.bmr}</p>
                </div>

            </motion.div>
        </AnimatePresence>
    )
}

export default Bmr
