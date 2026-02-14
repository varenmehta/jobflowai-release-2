import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { z } from "zod";

const jobSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  url: z.string().url().optional(),
  source: z.string().optional(),
  companyName: z.string().optional(),
  companyLogo: z.string().url().optional(),
  isVerified: z.boolean().optional(),
});

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const jobs = await prisma.job.findMany({
    include: { company: true, partner: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const role = user.role ?? "CANDIDATE";
  if (!["PARTNER", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = jobSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const company = body.data.companyName
    ? await prisma.company.upsert({
        where: { name: body.data.companyName },
        update: {
          logoUrl: body.data.companyLogo ?? undefined,
        },
        create: {
          name: body.data.companyName,
          logoUrl: body.data.companyLogo,
        },
      })
    : null;

  const partner = await prisma.partnerCompany.findUnique({
    where: { userId: user.id },
  });
  const isAdmin = role === "ADMIN";
  if (!isAdmin && !partner) {
    return NextResponse.json({ error: "Partner profile required" }, { status: 403 });
  }

  const job = await prisma.job.create({
    data: {
      title: body.data.title,
      description: body.data.description,
      url: body.data.url,
      source: body.data.source,
      isVerified: isAdmin ? (body.data.isVerified ?? false) : Boolean(partner?.verified),
      companyId: company?.id,
      partnerCompanyId: partner?.id,
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}
