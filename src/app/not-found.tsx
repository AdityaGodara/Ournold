"use client";
import React from 'react'
import FuzzyText from '@/components/FuzzyText';
import { Poiret_One } from 'next/font/google';
import Particles from '@/components/Particles';

const fontPoiretOne = Poiret_One({
    subsets: ['latin'],
    weight: ['400']
})

export default function NotFound() {

    const hoverIntensity = 0.5
    const enableHover = true
    return (
        <div className='min-h-screen' style={{ width: '100%', height: '600px', }}>
            
            <div className={`z-1000 flex flex-col gap-5 justify-center items-center top-[30%] left-[20%] md:top-[50%] md:left-[50%] absolute ${fontPoiretOne.className}`}>
                <FuzzyText
                    baseIntensity={0.1}
                    hoverIntensity={hoverIntensity}
                    enableHover={enableHover}
                >
                    404
                </FuzzyText>
                <FuzzyText
                    baseIntensity={0.1}
                    hoverIntensity={hoverIntensity}
                    enableHover={enableHover}
                    fontSize={50}
                >
                    NOT FOUND
                </FuzzyText>

            </div>
            <Particles
                particleColors={['#ffffff', '#ffffff']}
                particleCount={200}
                particleSpread={10}
                speed={0.1}
                particleBaseSize={100}
                moveParticlesOnHover={true}
                alphaParticles={false}
                disableRotation={false}
            />
        </div>
    )
}
