import { prisma } from "@/lib/db";
import { ApplicationStatus } from "@prisma/client";

export type FunnelCounts = Record<ApplicationStatus, number>;

export type FunnelDateRange = {
  from?: Date;
  to?: Date;
};

export type FunnelTransition = {
  source: "Applied" | "Screening" | "Interview";
  target: "Screening" | "Interview" | "Offer" | "Rejected" | "Withdrawn";
  value: number;
};

const emptyCounts: FunnelCounts = {
  APPLIED: 0,
  SCREENING: 0,
  INTERVIEW: 0,
  OFFER: 0,
  REJECTED: 0,
  WITHDRAWN: 0,
};

function buildWhere(candidateId: string, dateRange?: FunnelDateRange) {
  return {
    userId: candidateId,
    ...(dateRange?.from || dateRange?.to
      ? {
          createdAt: {
            ...(dateRange.from ? { gte: dateRange.from } : {}),
            ...(dateRange.to ? { lte: dateRange.to } : {}),
          },
        }
      : {}),
  };
}

export async function getFunnelCounts(candidateId: string, dateRange?: FunnelDateRange): Promise<FunnelCounts> {
  const grouped = await prisma.application.groupBy({
    by: ["status"],
    where: buildWhere(candidateId, dateRange),
    _count: { status: true },
  });

  return grouped.reduce<FunnelCounts>((acc, row) => {
    acc[row.status] = row._count.status;
    return acc;
  }, { ...emptyCounts });
}

export function mapCountsToTransitions(counts: FunnelCounts): FunnelTransition[] {
  const totalApplied = Object.values(counts).reduce((sum, value) => sum + Math.max(0, value), 0);
  const fromApplied = Math.max(totalApplied, counts.APPLIED);

  const appliedToScreening = Math.min(Math.max(counts.SCREENING + counts.INTERVIEW + counts.OFFER, 0), fromApplied);
  const appliedToRejected = Math.min(Math.max(counts.REJECTED, 0), Math.max(fromApplied - appliedToScreening, 0));
  const appliedToWithdrawn = Math.min(
    Math.max(counts.WITHDRAWN, 0),
    Math.max(fromApplied - appliedToScreening - appliedToRejected, 0),
  );

  const screeningBase = Math.max(appliedToScreening, 0);
  const screeningToInterview = Math.min(Math.max(counts.INTERVIEW + counts.OFFER, 0), screeningBase);

  const interviewBase = Math.max(screeningToInterview, 0);
  const interviewToOffer = Math.min(Math.max(counts.OFFER, 0), interviewBase);

  return [
    { source: "Applied", target: "Screening", value: appliedToScreening },
    { source: "Screening", target: "Interview", value: screeningToInterview },
    { source: "Interview", target: "Offer", value: interviewToOffer },
    { source: "Applied", target: "Rejected", value: appliedToRejected },
    { source: "Applied", target: "Withdrawn", value: appliedToWithdrawn },
  ];
}

export async function getFunnelTransitions(
  candidateId: string,
  dateRange?: FunnelDateRange,
): Promise<FunnelTransition[]> {
  const counts = await getFunnelCounts(candidateId, dateRange);
  return mapCountsToTransitions(counts);
}

export function mapCountsToSankey(counts: FunnelCounts) {
  const nodes = [
    { name: "Applied" },
    { name: "Screening" },
    { name: "Interview" },
    { name: "Offer" },
    { name: "Rejected" },
    { name: "Withdrawn" },
  ];

  const transitions = mapCountsToTransitions(counts);

  const nodeIndex: Record<string, number> = {
    Applied: 0,
    Screening: 1,
    Interview: 2,
    Offer: 3,
    Rejected: 4,
    Withdrawn: 5,
  };

  const links = transitions
    .filter((t) => t.value > 0)
    .map((t) => ({ source: nodeIndex[t.source], target: nodeIndex[t.target], value: t.value }));

  return { nodes, links };
}

export function getFunnelInsight(counts: FunnelCounts) {
  const totalApplied = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (totalApplied < 3) return null;

  const transitions = mapCountsToTransitions(counts);
  const biggest = transitions.sort((a, b) => b.value - a.value)[0];

  if (!biggest) return null;

  if (biggest.source === "Applied" && biggest.target === "Screening") {
    return `Your biggest drop is Applied -> Screening (${totalApplied} -> ${biggest.value}). Improve resume targeting.`;
  }

  if (biggest.source === "Applied" && biggest.target === "Rejected") {
    return `Most losses happen at Applied -> Rejected (${totalApplied} -> ${biggest.value}). Tighten role-fit filtering.`;
  }

  return `Interview -> Offer conversion is ${counts.INTERVIEW ? Math.round((counts.OFFER / counts.INTERVIEW) * 100) : 0}%.`;
}
