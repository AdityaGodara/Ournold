import { createContext, useContext, useEffect, useState } from "react";
import Lenis from "lenis";

const SmoothScrollContext = createContext(null);

export const useSmoothScroll = () => useContext(SmoothScrollContext);

/** Lenis smooth scrolling for the landing page. Disabled for users who prefer reduced motion. */
export default function ScrollContext({ children }) {
  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const scroller = new Lenis();
    let frame = requestAnimationFrame(function raf(time) {
      scroller.raf(time);
      frame = requestAnimationFrame(raf);
    });
    setLenis(scroller);

    return () => {
      cancelAnimationFrame(frame);
      scroller.destroy();
    };
  }, []);

  return <SmoothScrollContext.Provider value={lenis}>{children}</SmoothScrollContext.Provider>;
}
