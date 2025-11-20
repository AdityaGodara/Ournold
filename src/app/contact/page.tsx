"use client";
import React from 'react'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Poiret_One } from 'next/font/google';
import LightRays from '@/components/LightRays';
import InfiniteMenu from '@/components/InfiniteMenu'

const fontPoiretOne = Poiret_One({
    subsets: ['latin'],
    weight: ['400']
})

export default function page() {

    const router = useRouter();

    const items = [
        {
            image: 'ournold_logo.png',
            link: '',
            title: 'OURNOLD',
            description: 'The watcher of your fitness!'
        },
        {
            image: 'aditya.jpg',
            link: 'https://aditya-godara.netlify.app/',
            title: 'Created by',
            description: 'Aditya Godara'
        },
        {
            image: 'aditya_linkedin.jpeg',
            link: 'https://www.linkedin.com/in/aditya-godara-b858751ab/',
            title: 'LinkedIn',
            description: '3D Full Stack Developer\n with BI'
        },
        {
            image: 'aditya_github.jpeg',
            link: 'https://github.com/AdityaGodara',
            title: 'GitHub',
            description: 'Worked on Gen AI, TypeScript, FastAPI and more...'
        },
    ];

    return (
        <div>
            <div style={{ height: '100%', position: 'relative' }} className={`${fontPoiretOne.className} text-stone-50`}>
                <InfiniteMenu items={items} />
            </div>

        </div>
    )
}
