import { designTokens } from "@/lib/design/tokens";

export const pageFadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: designTokens.motion.slow / 1000, ease: designTokens.easing.settle },
};

export const staggerListReveal = {
  container: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.05 },
    },
  },
  item: {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: designTokens.motion.normal / 1000, ease: designTokens.easing.smooth },
    },
  },
};

export const hoverLift = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -3,
    scale: 1.01,
    transition: { duration: designTokens.motion.fast / 1000, ease: designTokens.easing.swift },
  },
};

export const focusGlowPulse = {
  initial: { boxShadow: "0 0 0 0 rgba(79, 140, 255, 0)" },
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(79, 140, 255, 0)",
      "0 0 0 8px rgba(79, 140, 255, 0.12)",
      "0 0 0 0 rgba(79, 140, 255, 0)",
    ],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  },
};

export const successCheckReveal = {
  initial: { scale: 0.75, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 240, damping: 16 },
  },
};

export const cardFloatIdle = {
  animate: {
    y: [0, -2, 0],
    transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
  },
};

export const subtleParallaxScroll = {
  translateY: [0, -6],
  transition: { duration: designTokens.motion.hero / 1000, ease: designTokens.easing.smooth },
};
