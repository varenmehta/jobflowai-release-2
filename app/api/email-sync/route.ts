import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { getGmailClient, STATUS_PATTERNS } from "@/lib/gmail";
import { ApplicationStatus } from "@prisma/client";
import { z } from "zod";

const syncBodySchema = z.object({
  rangeDays: z.number().int().min(1).max(90).default(30).optional(),
});

export async function POST(request: Request) {
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

  const bodyRaw = await request.json().catch(() => ({}));
  const parsed = syncBodySchema.safeParse(bodyRaw ?? {});
  const rangeDays = parsed.success ? parsed.data.rangeDays ?? 30 : 30;

  try {
    const gmail = getGmailClient(session.accessToken);
    const messages: Array<{ id?: string | null }> = [];
    let nextPageToken: string | undefined;
    let pages = 0;
    do {
      const list = await gmail.users.messages.list({
        userId: "me",
        maxResults: 50,
        pageToken: nextPageToken,
        q: `newer_than:${rangeDays}d`,
      });
      messages.push(...(list.data.messages ?? []));
      nextPageToken = list.data.nextPageToken ?? undefined;
      pages += 1;
    } while (nextPageToken && pages < 3);

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

    return NextResponse.json({ status: "ok", created, scanned: messages.length, rangeDays });
  } catch (error: unknown) {
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

    await prisma.emailSync.updateMany({
      where: { userId: user.id, provider: "GMAIL" },
      data: { status: "ERROR" },
    });

    if (message.toLowerCase().includes("insufficient")) {
      return NextResponse.json(
        {
          error:
            "Email sync failed: missing Gmail read scope. Re-authenticate with Google and grant Gmail permissions.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ error: `Email sync failed${message ? `: ${message}` : ""}` }, { status: 502 });
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
