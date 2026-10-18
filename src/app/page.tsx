"use client";

import HeroSection from "./Components/HeroSection";
import ScrollContext from "./Context/ScrollContext";
import ClickSpark from "@/components/ClickSpark";
import Particles from "@/components/Particles";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <ClickSpark sparkColor="#fff" sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
      <ScrollContext>
        {/* particles sit behind everything; hero fills the space above the footer so they never overlap */}
        <div className="relative min-h-screen flex flex-col">
          <div className="absolute inset-0 z-0" aria-hidden>
            <Particles
              particleColors={["#ffffff", "#ffffff"]}
              particleCount={200}
              particleSpread={10}
              speed={0.1}
              particleBaseSize={100}
              moveParticlesOnHover={true}
              alphaParticles={false}
              disableRotation={false}
            />
          </div>

          <main className="relative z-10 flex-1 flex">
            <HeroSection />
          </main>
          <Footer className="relative z-10 bg-[#1b1b1b]/70 backdrop-blur-sm" />
        </div>
      </ScrollContext>
    </ClickSpark>
  );
}
