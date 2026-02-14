import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";

export async function POST() {
  const { user } = await getAuthContext();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    return NextResponse.json({ error: "ADMIN_EMAIL is not configured" }, { status: 500 });
  }
  if (user.email.toLowerCase() !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  return NextResponse.json({ user: updatedUser });
}
