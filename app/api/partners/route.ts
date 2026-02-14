import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  website: z.string().url().optional(),
});

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const partner = await prisma.partnerCompany.findUnique({
    where: { userId: user.id },
  });
  if (!partner) {
    return NextResponse.json({ partner: null, stats: null });
  }

  const jobs = await prisma.job.findMany({
    where: { partnerCompanyId: partner.id },
    select: { id: true },
  });
  const jobIds = jobs.map((j) => j.id);
  const [applicants, interviews, offers] = await Promise.all([
    prisma.application.count({ where: { jobId: { in: jobIds } } }),
    prisma.application.count({ where: { jobId: { in: jobIds }, status: "INTERVIEW" } }),
    prisma.application.count({ where: { jobId: { in: jobIds }, status: "OFFER" } }),
  ]);

  return NextResponse.json({
    partner,
    stats: {
      jobs: jobs.length,
      applicants,
      interviews,
      offers,
    },
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

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const partner = await prisma.partnerCompany.upsert({
    where: { userId: user.id },
    update: {
      name: body.data.name,
      website: body.data.website,
    },
    create: {
      userId: user.id,
      name: body.data.name,
      website: body.data.website,
    },
  });

  if (user.role === "CANDIDATE") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "PARTNER" },
    });
  }

  await createNotification({
    userId: user.id,
    type: "PARTNER",
    title: "Partner profile submitted",
    body: "Your company profile is pending admin approval.",
    href: "/partners",
  });

  return NextResponse.json({ partner }, { status: 201 });
}
