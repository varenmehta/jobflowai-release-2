import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      job: {
        include: {
          company: true,
        },
      },
      resume: true,
    },
  });

  if (!application || application.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const timeline = [
    {
      label: "Application created",
      at: application.createdAt,
    },
    {
      label: `Current stage: ${application.status}`,
      at: application.updatedAt,
    },
  ];

  return NextResponse.json({ application, timeline });
}
