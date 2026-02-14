import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { z } from "zod";

const applicationSchema = z.object({
  jobId: z.string().optional(),
  resumeId: z.string().optional(),
  status: z.enum(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"]).optional(),
  id: z.string().optional(),
}).refine((data) => {
  if (data.id) return Boolean(data.status);
  return Boolean(data.jobId);
}, {
  message: "Status is required when updating and jobId is required when creating",
});

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: { job: true, resume: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const body = applicationSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  if (body.data.id) {
    const existing = await prisma.application.findUnique({
      where: { id: body.data.id },
      select: { id: true, userId: true },
    });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.application.update({
      where: { id: body.data.id },
      data: { status: body.data.status ?? "APPLIED", lastActivityAt: new Date() },
    });
    return NextResponse.json({ application: updated });
  }

  if (!body.data.jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { id: body.data.jobId },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (body.data.resumeId) {
    const resume = await prisma.resume.findUnique({
      where: { id: body.data.resumeId },
      select: { id: true, userId: true },
    });
    if (!resume || resume.userId !== user.id) {
      return NextResponse.json({ error: "Invalid resume" }, { status: 400 });
    }
  }

  const duplicate = await prisma.application.findFirst({
    where: { userId: user.id, jobId: body.data.jobId },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Application already exists" }, { status: 409 });
  }

  const application = await prisma.application.create({
    data: {
      userId: user.id,
      jobId: body.data.jobId,
      resumeId: body.data.resumeId,
      status: body.data.status ?? "APPLIED",
    },
  });

  return NextResponse.json({ application }, { status: 201 });
}
