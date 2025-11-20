import { useEffect, useState, createContext, useContext } from 'react'
import Lenis from 'lenis';

const SmoothScrollContext = createContext();

export const useSmoothScroll = () => useContext(SmoothScrollContext);

export default function ScrollContext({ children }) {

    const [lenisRef, setLenis] = useState(null);
    const [rafState, setRafState] = useState(null);

    useEffect(() => {
        const scroller = new Lenis();
        let rf;

        function raf(time) {
            scroller.raf(time);
            requestAnimationFrame(raf);
        }

        rf = requestAnimationFrame(raf);
        setRafState(rf);
        setLenis(scroller);

        return () => {
            if (lenisRef) {
                cancelAnimationFrame(rafState);
                lenisRef?.destroy();
            }
        }
    }, [])

    return (
        <SmoothScrollContext.Provider value={lenisRef}>
            {children}
        </SmoothScrollContext.Provider> 
    )
}
