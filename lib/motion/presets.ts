import { motionTokens } from "@/lib/motion/tokens";

export const motionPresets = {
  pageFade: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionTokens.duration.slow, ease: motionTokens.easing.soft },
  },
  listStagger: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.03 },
    },
  },
  listItem: {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.standard },
    },
  },
  hoverLift: {
    initial: { y: 0, rotateX: 0, rotateY: 0 },
    whileHover: {
      y: -2,
      rotateX: 0.3,
      rotateY: -0.3,
      transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.standard },
    },
  },
  drawerSlide: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: motionTokens.spring.drawer },
    exit: { x: 16, opacity: 0, transition: { duration: motionTokens.duration.fast } },
  },
  dropPulse: {
    initial: { scale: 1 },
    animate: { scale: [1, 1.015, 1], transition: motionTokens.spring.drop },
  },
} as const;
