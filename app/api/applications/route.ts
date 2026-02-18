import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { z } from "zod";

const statusEnum = z.enum(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"]);

const applicationSchema = z.object({
  jobId: z.string().optional(),
  resumeId: z.string().optional(),
  status: statusEnum.optional(),
  id: z.string().optional(),
  title: z.string().min(2).optional(),
  companyName: z.string().min(2).optional(),
  source: z.string().optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
}).refine((data) => {
  if (data.id) return Boolean(data.status);
  if (data.jobId) return true;
  return Boolean(data.title && data.companyName);
}, {
  message: "Provide status+id, jobId, or manual title+companyName payload",
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: statusEnum.optional(),
  title: z.string().min(2).optional(),
  companyName: z.string().min(2).optional(),
  source: z.string().optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
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
    include: { job: { include: { company: true } }, resume: true },
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

  if (!body.data.jobId && body.data.title && body.data.companyName) {
    const company = await prisma.company.upsert({
      where: { name: body.data.companyName },
      update: {},
      create: { name: body.data.companyName },
    });

    const job = await prisma.job.create({
      data: {
        title: body.data.title,
        description: body.data.description ?? "",
        source: body.data.source ?? "Manual",
        url: body.data.url,
        companyId: company.id,
      },
    });

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId: job.id,
        status: body.data.status ?? "APPLIED",
      },
      include: { job: { include: { company: true } } },
    });

    return NextResponse.json({ application }, { status: 201 });
  }

  if (!body.data.jobId) {
    return NextResponse.json({ error: "Missing jobId or manual job data" }, { status: 400 });
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

export async function PATCH(request: Request) {
  const { user } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  const body = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.application.findUnique({
    where: { id: body.data.id },
    include: { job: true },
  });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let nextCompanyId = existing.job.companyId ?? undefined;
  if (body.data.companyName) {
    const company = await prisma.company.upsert({
      where: { name: body.data.companyName },
      update: {},
      create: { name: body.data.companyName },
      select: { id: true },
    });
    nextCompanyId = company.id;
  }

  await prisma.job.update({
    where: { id: existing.jobId },
    data: {
      title: body.data.title ?? existing.job.title,
      source: body.data.source ?? existing.job.source ?? undefined,
      url: body.data.url ?? existing.job.url ?? undefined,
      description: body.data.description ?? existing.job.description ?? undefined,
      companyId: nextCompanyId,
    },
  });

  const updated = await prisma.application.update({
    where: { id: existing.id },
    data: {
      status: body.data.status ?? existing.status,
      lastActivityAt: new Date(),
    },
    include: { job: { include: { company: true } } },
  });

  return NextResponse.json({ application: updated });
}

export async function DELETE(request: Request) {
  const { user } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  const url = new URL(request.url);
  const idFromQuery = url.searchParams.get("id");
  const body = await request.json().catch(() => ({} as { id?: string }));
  const id = idFromQuery ?? body.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await prisma.application.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.application.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
