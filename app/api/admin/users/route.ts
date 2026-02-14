import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";
import { UserRole } from "@prisma/client";

const updateSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(UserRole).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE" || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const { user: actor } = await getAuthContext();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (actor.status !== "ACTIVE" || actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = updateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const before = await prisma.user.findUnique({
    where: { id: body.data.userId },
    select: { id: true, role: true, status: true },
  });
  if (!before) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent locking yourself out of admin access.
  if (body.data.userId === actor.id) {
    if (body.data.status === "SUSPENDED") {
      return NextResponse.json({ error: "You cannot suspend your own account" }, { status: 400 });
    }
    if (body.data.role && body.data.role !== "ADMIN") {
      return NextResponse.json({ error: "You cannot remove your own admin role" }, { status: 400 });
    }
  }

  // Ensure at least one admin remains in the system.
  const isDemotingAdmin = before.role === "ADMIN" && body.data.role && body.data.role !== "ADMIN";
  const isSuspendingAdmin = before.role === "ADMIN" && body.data.status === "SUSPENDED";
  if (isDemotingAdmin || isSuspendingAdmin) {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", status: "ACTIVE" },
    });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "At least one active admin is required" }, { status: 400 });
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: body.data.userId },
    data: {
      role: body.data.role,
      status: body.data.status,
    },
    select: { id: true, role: true, status: true },
  });

  if (body.data.status && body.data.status !== before.status) {
    await createNotification({
      userId: updatedUser.id,
      type: "ACCOUNT",
      title: body.data.status === "SUSPENDED" ? "Account suspended" : "Account re-activated",
      body:
        body.data.status === "SUSPENDED"
          ? "Your account was suspended by an administrator."
          : "Your account is active again.",
      href: "/dashboard",
    });
  }
  if (body.data.role && body.data.role !== before.role) {
    await createNotification({
      userId: updatedUser.id,
      type: "ACCOUNT",
      title: "Role updated",
      body: `Your role is now ${body.data.role}.`,
      href: "/dashboard",
    });
  }

  return NextResponse.json({ user: updatedUser });
}
