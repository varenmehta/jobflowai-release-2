import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { z } from "zod";

const resumeSchema = z.object({
  label: z.string().min(2),
  fileUrl: z.string().url(),
});

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const resumes = await prisma.resume.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ resumes });
}

export async function POST(request: Request) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const body = resumeSchema.safeParse(await request.json());
  if (!body.success) {
    const firstIssue = body.error.issues[0];
    const message = firstIssue?.message ?? "Invalid resume payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      label: body.data.label,
      fileUrl: body.data.fileUrl,
    },
  });

  return NextResponse.json({ resume }, { status: 201 });
}
