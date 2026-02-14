import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { getGmailClient, STATUS_PATTERNS } from "@/lib/gmail";
import { ApplicationStatus } from "@prisma/client";

export async function POST() {
  const { session, user } = await getAuthContext();
  if (!session || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  if (!session.accessToken) {
    return NextResponse.json({ error: "Missing Gmail access token" }, { status: 400 });
  }

  await prisma.emailSync.upsert({
    where: { userId_provider: { userId: user.id, provider: "GMAIL" } },
    update: { status: "ACTIVE" },
    create: {
      userId: user.id,
      provider: "GMAIL",
      status: "ACTIVE",
    },
  });

  try {
    const gmail = getGmailClient(session.accessToken);
    const list = await gmail.users.messages.list({ userId: "me", maxResults: 20 });
    const messages = list.data.messages ?? [];

    let created = 0;
    for (const msg of messages) {
      if (!msg.id) continue;
      const detail = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "metadata" });
      const headers = detail.data.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      const fromAddress = headers.find((h) => h.name === "From")?.value ?? "";
      const snippet = detail.data.snippet ?? "";
      const occurredAt = detail.data.internalDate
        ? new Date(Number(detail.data.internalDate))
        : new Date();

      const existing = await prisma.emailEvent.findFirst({
        where: {
          userId: user.id,
          provider: "GMAIL",
          sourceMessageId: msg.id,
        },
        select: { id: true },
      });
      if (existing) continue;

      const detected = STATUS_PATTERNS.find((item) => item.pattern.test(subject + snippet));

      await prisma.emailEvent.create({
        data: {
          userId: user.id,
          provider: "GMAIL",
          subject,
          fromAddress,
          snippet,
          detectedStatus: detected?.status as ApplicationStatus | undefined,
          sourceMessageId: msg.id,
          occurredAt,
        },
      });
      created += 1;
    }

    await prisma.emailSync.updateMany({
      where: { userId: user.id, provider: "GMAIL" },
      data: { lastSyncedAt: new Date(), status: "ACTIVE" },
    });

    return NextResponse.json({ status: "ok", created });
  } catch (error) {
    await prisma.emailSync.updateMany({
      where: { userId: user.id, provider: "GMAIL" },
      data: { status: "ERROR" },
    });
    return NextResponse.json({ error: "Email sync failed" }, { status: 502 });
  }
}

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const sync = await prisma.emailSync.findFirst({
    where: { userId: user.id, provider: "GMAIL" },
  });
  const count = await prisma.emailEvent.count({ where: { userId: user.id, provider: "GMAIL" } });

  return NextResponse.json({
    sync,
    count,
  });
}
