"use client";
import React from 'react'
import BackButton from '@/components/BackButton'
import { Poiret_One } from 'next/font/google';
import InfiniteMenu from '@/components/InfiniteMenu'

const fontPoiretOne = Poiret_One({
    subsets: ['latin'],
    weight: ['400']
})

export default function ContactPage() {

    const items = [
        {
            image: '/ournold_logo.png',
            link: 'https://ournold.vercel.app/',
            title: 'OURNOLD',
            description: 'The watcher of your fitness!'
        },
        {
            image: '/aditya.jpg',
            link: 'https://aditya-godara.netlify.app/',
            title: 'Created by',
            description: 'Aditya Godara'
        },
        {
            image: '/aditya_linkedin.jpeg',
            link: 'https://www.linkedin.com/in/aditya-godara-b858751ab/',
            title: 'LinkedIn',
            description: '3D Full Stack Developer\n with BI'
        },
        {
            image: '/aditya_github.jpeg',
            link: 'https://github.com/AdityaGodara',
            title: 'GitHub',
            description: 'Worked on Gen AI, TypeScript, FastAPI and more...'
        },
    ];

    return (
        <div>
            <BackButton />
            <div style={{ height: '100vh', position: 'relative' }} className={`${fontPoiretOne.className} text-stone-50`}>
                <InfiniteMenu items={items} />
            </div>

        </div>
    )
}
