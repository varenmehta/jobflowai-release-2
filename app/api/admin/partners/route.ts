import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  partnerId: z.string().min(1),
  verified: z.boolean(),
});

export async function POST(request: Request) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE" || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.partnerCompany.findUnique({
    where: { id: body.data.partnerId },
    select: { id: true, userId: true, verified: true, name: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  const partner = await prisma.partnerCompany.update({
    where: { id: body.data.partnerId },
    data: { verified: body.data.verified },
  });

  if (!existing.verified && body.data.verified) {
    await createNotification({
      userId: existing.userId,
      type: "PARTNER",
      title: "Partner profile approved",
      body: `${existing.name} has been verified. You can post verified jobs now.`,
      href: "/partners",
    });
  }

  return NextResponse.json({ partner });
}
