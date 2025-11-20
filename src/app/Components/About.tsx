import { Poiret_One } from "next/font/google"

const fontPoiretOne = Poiret_One({
  subsets: ['latin'],
  weight: ['400']
})

export default function About() {

  return (
    <div className={`w-full h-screen flex flex-col justify-center items-center text-stone-50 border-2 border-stone-50 rounded-4xl ${fontPoiretOne.className}`}>
      <h1 className="text-5xl">About us</h1>
      <div className="w-3/4 h-3/4 flex flex-col justify-center items-center text-center text-lg mt-10">
        <p>Ournold is an AI-powered health coach designed to support your fitness journey in a smart and personalized way. It helps you track your daily macros, suggests diet plans tailored to your current condition, and recommends exercises that fit your goals. Beyond just planning, Ournold also keeps an eye on your posture during workouts to ensure safe and effective training. To keep things fun and engaging, it even shares random health and fitness facts along the way, making your path to a healthier lifestyle both guided and enjoyable.</p>
      </div>
    </div>
  )
}
