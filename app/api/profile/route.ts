import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  headline: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  bio: z.string().max(1000).optional(),
});

function getPrefs(raw: unknown) {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, unknown>;
}

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  const [record, applications, interviews, offers, resumes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, role: true, profileScore: true, preferences: true },
    }),
    prisma.application.count({ where: { userId: user.id } }),
    prisma.application.count({ where: { userId: user.id, status: "INTERVIEW" } }),
    prisma.application.count({ where: { userId: user.id, status: "OFFER" } }),
    prisma.resume.count({ where: { userId: user.id } }),
  ]);

  const prefs = getPrefs(record?.preferences);

  return NextResponse.json({
    profile: {
      id: record?.id,
      name: record?.name ?? "",
      email: record?.email ?? "",
      role: record?.role ?? "CANDIDATE",
      profileScore: record?.profileScore ?? 0,
      headline: typeof prefs.headline === "string" ? prefs.headline : "",
      location: typeof prefs.location === "string" ? prefs.location : "",
      phone: typeof prefs.phone === "string" ? prefs.phone : "",
      linkedinUrl: typeof prefs.linkedinUrl === "string" ? prefs.linkedinUrl : "",
      portfolioUrl: typeof prefs.portfolioUrl === "string" ? prefs.portfolioUrl : "",
      bio: typeof prefs.bio === "string" ? prefs.bio : "",
      targetRoles: Array.isArray(prefs.targetRoles) ? prefs.targetRoles : [],
      onboardingCompleted: prefs.onboardingCompleted === true,
    },
    stats: {
      applications,
      interviews,
      offers,
      resumes,
    },
  });
}

export async function PATCH(request: Request) {
  const { user } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  const body = updateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { preferences: true },
  });

  const prevPrefs = getPrefs(existing?.preferences);
  const nextPrefs = {
    ...prevPrefs,
    headline: body.data.headline ?? (typeof prevPrefs.headline === "string" ? prevPrefs.headline : ""),
    location: body.data.location ?? (typeof prevPrefs.location === "string" ? prevPrefs.location : ""),
    phone: body.data.phone ?? (typeof prevPrefs.phone === "string" ? prevPrefs.phone : ""),
    linkedinUrl:
      body.data.linkedinUrl ??
      (typeof prevPrefs.linkedinUrl === "string" ? prevPrefs.linkedinUrl : ""),
    portfolioUrl:
      body.data.portfolioUrl ??
      (typeof prevPrefs.portfolioUrl === "string" ? prevPrefs.portfolioUrl : ""),
    bio: body.data.bio ?? (typeof prevPrefs.bio === "string" ? prevPrefs.bio : ""),
  };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: body.data.name ?? undefined,
      preferences: nextPrefs,
    },
    select: { id: true, name: true, email: true, role: true, profileScore: true, preferences: true },
  });

  const prefs = getPrefs(updated.preferences);
  return NextResponse.json({
    profile: {
      id: updated.id,
      name: updated.name ?? "",
      email: updated.email ?? "",
      role: updated.role,
      profileScore: updated.profileScore,
      headline: typeof prefs.headline === "string" ? prefs.headline : "",
      location: typeof prefs.location === "string" ? prefs.location : "",
      phone: typeof prefs.phone === "string" ? prefs.phone : "",
      linkedinUrl: typeof prefs.linkedinUrl === "string" ? prefs.linkedinUrl : "",
      portfolioUrl: typeof prefs.portfolioUrl === "string" ? prefs.portfolioUrl : "",
      bio: typeof prefs.bio === "string" ? prefs.bio : "",
      targetRoles: Array.isArray(prefs.targetRoles) ? prefs.targetRoles : [],
      onboardingCompleted: prefs.onboardingCompleted === true,
    },
  });
}
