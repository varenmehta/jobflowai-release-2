import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { z } from "zod";

const onboardingSchema = z.object({
  firstName: z.string().trim().max(80).default(""),
  lastName: z.string().trim().max(80).default(""),
  email: z.string().trim().email().or(z.literal("")).default(""),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default(""),
  primaryResumeId: z.string().default(""),
  completeSetup: z.boolean().default(false),
});

function splitName(name: string | null) {
  const raw = (name ?? "").trim();
  if (!raw) return { firstName: "", lastName: "" };
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function toPrefs(raw: unknown) {
  const base = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
  return {
    firstName: typeof base.firstName === "string" ? base.firstName : "",
    lastName: typeof base.lastName === "string" ? base.lastName : "",
    email: typeof base.email === "string" ? base.email : "",
    dateOfBirth: typeof base.dateOfBirth === "string" ? base.dateOfBirth : "",
    primaryResumeId: typeof base.primaryResumeId === "string" ? base.primaryResumeId : "",
    onboardingCompleted: base.onboardingCompleted === true,
    onboardingCompletedAt: typeof base.onboardingCompletedAt === "string" ? base.onboardingCompletedAt : "",
  };
}

function computeProfileScore(input: ReturnType<typeof toPrefs>, resumeCount: number) {
  let score = 0;
  if (input.firstName) score += 20;
  if (input.lastName) score += 20;
  if (input.email) score += 20;
  if (input.dateOfBirth) score += 20;
  if (resumeCount > 0) score += 20;
  return Math.min(100, score);
}

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  const [userRecord, resumeCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true, preferences: true, profileScore: true },
    }),
    prisma.resume.count({ where: { userId: user.id } }),
  ]);

  const prefs = toPrefs(userRecord?.preferences);
  const split = splitName(userRecord?.name ?? null);

  return NextResponse.json({
    onboarding: {
      ...prefs,
      firstName: prefs.firstName || split.firstName,
      lastName: prefs.lastName || split.lastName,
      email: prefs.email || userRecord?.email || "",
    },
    profileScore: userRecord?.profileScore ?? 0,
    resumeCount,
    completed: prefs.onboardingCompleted,
  });
}

export async function POST(request: Request) {
  const { user } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  const payloadRaw = await request.json().catch(() => ({}));
  const body = onboardingSchema.safeParse(payloadRaw);
  if (!body.success) {
    const issue = body.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? "Invalid onboarding input" }, { status: 400 });
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

  const prefsPayload = {
    firstName: body.data.firstName,
    lastName: body.data.lastName,
    email: body.data.email,
    dateOfBirth: body.data.dateOfBirth,
    primaryResumeId: body.data.primaryResumeId,
    onboardingCompleted: false,
    onboardingCompletedAt: "",
  };

  if (body.data.completeSetup) {
    const hasProfile =
      Boolean(prefsPayload.firstName) &&
      Boolean(prefsPayload.lastName) &&
      Boolean(prefsPayload.email) &&
      Boolean(prefsPayload.dateOfBirth);

    if (!hasProfile) {
      return NextResponse.json({ error: "Complete first name, last name, email, and date of birth." }, { status: 400 });
    }

    if (resumeCount < 1) {
      return NextResponse.json({ error: "Upload at least one resume to finish setup." }, { status: 400 });
    }

    prefsPayload.onboardingCompleted = true;
    prefsPayload.onboardingCompletedAt = new Date().toISOString();
  } else {
    const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { preferences: true } });
    const previous = toPrefs(existing?.preferences);
    if (previous.onboardingCompleted) {
      prefsPayload.onboardingCompleted = true;
      prefsPayload.onboardingCompletedAt = previous.onboardingCompletedAt || new Date().toISOString();
    }
  }

  const profileScore = computeProfileScore(prefsPayload, resumeCount);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: `${prefsPayload.firstName} ${prefsPayload.lastName}`.trim(),
        email: prefsPayload.email,
        preferences: prefsPayload,
        profileScore,
      },
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "That email is already used by another account." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to save onboarding details." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    profileScore,
    completed: prefsPayload.onboardingCompleted,
  });
}
