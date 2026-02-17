export const designTokens = {
  colors: {
    bg: "#F6F8FB",
    surface: "#FFFFFF",
    surface2: "#F1F4F9",
    border: "rgba(15,23,42,0.08)",
    text: "#0B1220",
    muted: "#56637A",
    brand1: "#4F7CFF",
    brand2: "#6A5BFF",
    brand3: "#9B6DFF",
    applied: "#6C8BFF",
    screening: "#8C6EFF",
    interview: "#FFB347",
    offer: "#22C55E",
    risk: "#FF6B6B",
  },
  radii: {
    md: 12,
    lg: 16,
    xl: 20,
  },
  shadows: {
    subtle: "0 1px 2px rgba(15,23,42,0.04), 0 6px 20px rgba(15,23,42,0.06)",
    elevated: "0 2px 6px rgba(15,23,42,0.05), 0 14px 36px rgba(15,23,42,0.08)",
    glass: "0 1px 1px rgba(255,255,255,0.55) inset, 0 12px 30px rgba(15,23,42,0.08)",
  },
  spacing: {
    1: 4,
    2: 8,
    3: 16,
    4: 24,
    5: 32,
    6: 48,
  },
  typography: {
    hero: "clamp(1.9rem, 3vw, 2.5rem)",
    section: "1.4rem",
    cardTitle: "1.03rem",
    body: "0.95rem",
    meta: "0.82rem",
  },
} as const;

export type StageTone = "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | "WITHDRAWN";

export const stageToneMap: Record<StageTone, string> = {
  APPLIED: designTokens.colors.applied,
  SCREENING: designTokens.colors.screening,
  INTERVIEW: designTokens.colors.interview,
  OFFER: designTokens.colors.offer,
  REJECTED: designTokens.colors.risk,
  WITHDRAWN: designTokens.colors.muted,
};
