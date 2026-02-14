import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"]),
});

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

  const partner = await prisma.partnerCompany.findUnique({
    where: { userId: user.id },
  });

  if (!partner) {
    return NextResponse.json({ error: "Not a partner" }, { status: 403 });
  }

  const application = await prisma.application.findUnique({
    where: { id: body.data.id },
    include: { job: true },
  });

  if (!application || application.job.partnerCompanyId !== partner.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.application.update({
    where: { id: body.data.id },
    data: { status: body.data.status, lastActivityAt: new Date() },
  });

  await createNotification({
    userId: application.userId,
    type: "APP_STATUS",
    title: "Application status updated",
    body: `${application.job.title} moved to ${body.data.status}`,
    href: "/pipeline",
  });

  return NextResponse.json({ application: updated });
}
