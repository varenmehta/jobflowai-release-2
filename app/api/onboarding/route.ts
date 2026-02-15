import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { z } from "zod";

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}, z.string().url().or(z.literal("")));

const onboardingSchema = z.object({
  targetRoles: z.array(z.string().min(1)).max(10).default([]),
  locations: z.array(z.string().min(1)).max(10).default([]),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  bio: z.string().max(1000).optional(),
  primaryResumeId: z.string().optional(),
  completeSetup: z.boolean().optional(),
});

function toPrefs(raw: unknown) {
  const base = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
  return {
    targetRoles: Array.isArray(base.targetRoles) ? base.targetRoles.map(String) : [],
    locations: Array.isArray(base.locations) ? base.locations.map(String) : [],
    salaryMin: typeof base.salaryMin === "number" ? base.salaryMin : undefined,
    salaryMax: typeof base.salaryMax === "number" ? base.salaryMax : undefined,
    linkedinUrl: typeof base.linkedinUrl === "string" ? base.linkedinUrl : "",
    portfolioUrl: typeof base.portfolioUrl === "string" ? base.portfolioUrl : "",
    bio: typeof base.bio === "string" ? base.bio : "",
    primaryResumeId: typeof base.primaryResumeId === "string" ? base.primaryResumeId : "",
    onboardingCompleted: base.onboardingCompleted === true,
    onboardingCompletedAt:
      typeof base.onboardingCompletedAt === "string" ? base.onboardingCompletedAt : "",
  };
}

function computeProfileScore(input: ReturnType<typeof toPrefs>, resumeCount: number) {
  let score = 0;
  if (input.targetRoles.length > 0) score += 20;
  if (input.locations.length > 0) score += 15;
  if (input.salaryMin && input.salaryMax && input.salaryMax >= input.salaryMin) score += 15;
  if (input.linkedinUrl) score += 15;
  if (input.portfolioUrl) score += 10;
  if (input.bio && input.bio.trim().length >= 30) score += 10;
  if (resumeCount > 0) score += 15;
  return Math.min(100, score);
}

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const [userRecord, resumeCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { preferences: true, profileScore: true },
    }),
    prisma.resume.count({ where: { userId: user.id } }),
  ]);

  const prefs = toPrefs(userRecord?.preferences);
  return NextResponse.json({
    onboarding: prefs,
    profileScore: userRecord?.profileScore ?? 0,
    resumeCount,
    completed: prefs.onboardingCompleted,
  });
}

export async function POST(request: Request) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const body = onboardingSchema.safeParse(await request.json());
  if (!body.success) {
    const firstIssue = body.error.issues[0];
    const message = firstIssue?.message ?? "Invalid onboarding input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (
    body.data.salaryMin !== undefined &&
    body.data.salaryMax !== undefined &&
    body.data.salaryMax < body.data.salaryMin
  ) {
    return NextResponse.json({ error: "salaryMax must be greater than salaryMin" }, { status: 400 });
  }

  if (body.data.primaryResumeId) {
    const resume = await prisma.resume.findUnique({
      where: { id: body.data.primaryResumeId },
      select: { userId: true },
    });
    if (!resume || resume.userId !== user.id) {
      return NextResponse.json({ error: "Invalid primary resume" }, { status: 400 });
    }
  }

  const resumeCount = await prisma.resume.count({ where: { userId: user.id } });
  const payload = {
    targetRoles: body.data.targetRoles ?? [],
    locations: body.data.locations ?? [],
    salaryMin: body.data.salaryMin ?? undefined,
    salaryMax: body.data.salaryMax ?? undefined,
    linkedinUrl: body.data.linkedinUrl ?? "",
    portfolioUrl: body.data.portfolioUrl ?? "",
    bio: body.data.bio ?? "",
    primaryResumeId: body.data.primaryResumeId ?? "",
    onboardingCompleted: false,
    onboardingCompletedAt: "",
  };

  const shouldComplete = body.data.completeSetup === true;
  if (shouldComplete) {
    const hasMinimumProfile =
      payload.targetRoles.length > 0 &&
      payload.locations.length > 0 &&
      Boolean(payload.bio && payload.bio.trim().length >= 20);
    if (!hasMinimumProfile) {
      return NextResponse.json(
        { error: "Complete target roles, location preferences, and a short bio to finish setup." },
        { status: 400 },
      );
    }
    if (resumeCount < 1) {
      return NextResponse.json({ error: "Upload at least one resume to finish setup." }, { status: 400 });
    }
    payload.onboardingCompleted = true;
    payload.onboardingCompletedAt = new Date().toISOString();
  } else {
    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { preferences: true },
    });
    const previous = toPrefs(existing?.preferences);
    if (previous.onboardingCompleted) {
      payload.onboardingCompleted = true;
      payload.onboardingCompletedAt = previous.onboardingCompletedAt || new Date().toISOString();
    }
  }

  const profileScore = computeProfileScore(payload, resumeCount);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      preferences: payload,
      profileScore,
    },
  });

  return NextResponse.json({
    ok: true,
    profileScore,
    completed: payload.onboardingCompleted,
  });
}
