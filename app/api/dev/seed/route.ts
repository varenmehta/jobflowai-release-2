import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  const isDemo = process.env.APP_MODE?.toLowerCase() === "demo";
  if (!isDemo && process.env.DEV_BYPASS_AUTH !== "true") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const company = await prisma.company.upsert({
    where: { name: "Dev Company" },
    update: {},
    create: { name: "Dev Company" },
  });

  const job =
    (await prisma.job.findFirst({
      where: { title: "Frontend Engineer", companyId: company.id },
    })) ??
    (await prisma.job.create({
      data: {
        title: "Frontend Engineer",
        description: "Build UI",
        source: "Partner",
        isVerified: true,
        companyId: company.id,
      },
    }));

  const existing = await prisma.application.findFirst({
    where: { userId: "dev-user", jobId: job.id },
  });
  if (!existing) {
    await prisma.application.create({
      data: {
        userId: "dev-user",
        jobId: job.id,
        status: "APPLIED",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
