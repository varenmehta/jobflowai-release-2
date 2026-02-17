export const motionTokens = {
  duration: {
    fast: 0.12,
    normal: 0.22,
    slow: 0.34,
    hero: 0.5,
  },
  easing: {
    standard: [0.2, 0.8, 0.2, 1] as [number, number, number, number],
    soft: [0.22, 1, 0.36, 1] as [number, number, number, number],
    emphasize: [0.16, 1, 0.3, 1] as [number, number, number, number],
  },
  spring: {
    settle: { type: "spring", stiffness: 320, damping: 28, mass: 0.72 } as const,
    drop: { type: "spring", stiffness: 420, damping: 30, mass: 0.6 } as const,
    drawer: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const,
  },
} as const;
