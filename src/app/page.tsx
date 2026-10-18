"use client";

import HeroSection from "./Components/HeroSection";
import ScrollContext from "./Context/ScrollContext";
import ClickSpark from "@/components/ClickSpark";
import Particles from "@/components/Particles";
import Footer from "@/components/Footer";

export default function Home() {

  return (
    <ClickSpark
      sparkColor='#fff'
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
    >
      <ScrollContext>
        <div className="w-full h-screen relative p-5">

          <HeroSection />
          {/* <About /> */}
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
        <div className="absolute bottom-0 left-0 right-0 z-[1000]">
          <Footer />
        </div>
      </ScrollContext>
    </ClickSpark>
  );
}
