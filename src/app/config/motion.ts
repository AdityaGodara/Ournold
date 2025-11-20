// Define Variants type locally since it's not exported in newer framer-motion versions
type Variants = {
  [key: string]: any;
};

// Base transition object
export const transition = { type: "spring", duration: 0.8 };

// Slide animation
type Direction = "left" | "right" | "up" | "down";

export const slideAnimation = (direction: Direction): Variants => ({
  initial: {
    x: direction === "left" ? -100 : direction === "right" ? 100 : 0,
    y: direction === "up" ? 100 : direction === "down" ? -100 : 0,
    opacity: 0,
    transition: { ...transition, delay: 0.5 },
  },
  animate: {
    x: 0,
    y: 0,
    opacity: 1,
    transition: { ...transition, delay: 0 },
  },
  exit: {
    x: direction === "left" ? -100 : direction === "right" ? 100 : 0,
    y: direction === "up" ? 100 : direction === "down" ? -100 : 0,
    transition: { ...transition, delay: 0 },
  },
});

// Fade animation
export const fadeAnimation: Variants = {
  initial: { opacity: 0, transition: { ...transition, delay: 0.5 } },
  animate: { opacity: 1, transition: { ...transition, delay: 0 } },
  exit: { opacity: 0, transition: { ...transition, delay: 0 } },
};

// Head text animation
export const headTextAnimation: Variants = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { type: "spring", damping: 5, stiffness: 40, restDelta: 0.001, duration: 0.3 },
};

// Head content animation
export const headContentAnimation: Variants = {
  initial: { y: 100, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { type: "spring", damping: 7, stiffness: 30, restDelta: 0.001, duration: 0.6, delay: 0.2, delayChildren: 0.2 },
};

// Head container animation
export const headContainerAnimation: Variants = {
  initial: { x: -100, opacity: 0, transition: { ...transition, delay: 0.5 } },
  animate: { x: 0, opacity: 1, transition: { ...transition, delay: 0 } },
  exit: { x: -100, opacity: 0, transition: { ...transition, delay: 0 } },
};

// Fade + zoom
export const fadeZoomAnimation: Variants = {
  initial: { opacity: 0, scale: 0.9, transition: { ...transition, delay: 0.3 } },
  animate: { opacity: 1, scale: 1, transition: { ...transition, delay: 0 } },
  exit: { opacity: 0, scale: 0.9, transition: { ...transition, delay: 0 } },
};

// Rotate in
export const rotateInAnimation: Variants = {
  initial: { rotate: -180, opacity: 0, scale: 0.8 },
  animate: { rotate: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 60, damping: 10 } },
  exit: { rotate: 180, opacity: 0, transition: { duration: 0.4 } },
};

// Staggered container
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
};

// Bounce in
export const bounceIn: Variants = {
  initial: { y: 100, opacity: 0, scale: 0.8 },
  animate: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200, damping: 12 } },
  exit: { y: 100, opacity: 0, transition: { duration: 0.3 } },
};

// Floating (infinite subtle animation)
export const floatingAnimation: Variants = {
  animate: { y: [0, -10, 0], transition: { duration: 2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } },
};

// Fade in + up
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};