import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { discoverJobs } from "@/lib/job-discovery";

const schema = z.object({
  limit: z.number().int().min(5).max(100).optional(),
});

function extractPreferences(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return { targetRoles: [] as string[], locations: [] as string[] };
  }
  const prefs = raw as Record<string, unknown>;
  return {
    targetRoles: Array.isArray(prefs.targetRoles) ? prefs.targetRoles.map(String).filter(Boolean) : [],
    locations: Array.isArray(prefs.locations) ? prefs.locations.map(String).filter(Boolean) : [],
  };
}

export async function POST(request: Request) {
  const { user } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  const bodyRaw = await request.json().catch(() => ({}));
  const body = schema.safeParse(bodyRaw);
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const userPrefs = await prisma.user.findUnique({
    where: { id: user.id },
    select: { preferences: true },
  });
  const prefs = extractPreferences(userPrefs?.preferences);

  const targetRoles = prefs.targetRoles.length ? prefs.targetRoles : ["software engineer", "product manager"];
  const locations = prefs.locations;
  const limit = body.data.limit ?? 40;

  const discovered = await discoverJobs({
    targetRoles,
    locations,
    limit,
  });

  let created = 0;
  for (const item of discovered) {
    const company = await prisma.company.upsert({
      where: { name: item.companyName },
      update: {},
      create: { name: item.companyName },
      select: { id: true },
    });

    const existing = item.url
      ? await prisma.job.findFirst({
          where: { url: item.url },
          select: { id: true },
        })
      : await prisma.job.findFirst({
          where: { title: item.title, companyId: company.id, source: item.source },
          select: { id: true },
        });

    if (existing) continue;

    await prisma.job.create({
      data: {
        title: item.title,
        description: [
          item.description ?? "",
          item.location ? `Location: ${item.location}` : "",
          item.city ? `City: ${item.city}` : "",
          item.country ? `Country: ${item.country}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        url: item.url,
        source: item.source,
        companyId: company.id,
        isVerified: Boolean(item.isVerified),
      },
    });
    created += 1;
  }

  return NextResponse.json({
    ok: true,
    discovered: discovered.length,
    created,
    targetRoles,
    locations,
  });
}
