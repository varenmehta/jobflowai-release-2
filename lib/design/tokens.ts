export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
} as const;

export const motion = {
  instant: 80,
  fast: 140,
  base: 220,
  medium: 320,
  hero: 520,
} as const;

export const depth = {
  0: "none",
  1: "0 4px 10px rgba(10, 21, 42, 0.08)",
  2: "0 10px 24px rgba(10, 21, 42, 0.12)",
  3: "0 18px 38px rgba(10, 21, 42, 0.18)",
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const easing = {
  swift: "cubic-bezier(0.2, 0.7, 0.2, 1)",
  settle: "cubic-bezier(0.16, 1, 0.3, 1)",
  smooth: "cubic-bezier(0.32, 0.72, 0, 1)",
  springy: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

export const color = {
  aiGradient: "linear-gradient(135deg, #36d5ff 0%, #4f8cff 46%, #7a7bff 100%)",
  glass: "rgba(255, 255, 255, 0.62)",
  focusGlow: "0 0 0 4px rgba(68, 130, 255, 0.18)",
} as const;

export const designTokens = {
  spacing,
  motion,
  depth,
  radius,
  easing,
  color,
} as const;

