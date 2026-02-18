import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { syncGmailEventsToPipeline } from "@/lib/email-sync";

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

  const bodyRaw = await request.json().catch(() => ({}));
  const parsed = syncBodySchema.safeParse(bodyRaw ?? {});
  const rangeDays = parsed.success ? parsed.data.rangeDays ?? 30 : 30;

  try {
    const result = await syncGmailEventsToPipeline({
      userId: user.id,
      accessToken: session.accessToken,
      rangeDays,
      maxPages: 3,
    });
    return NextResponse.json({ status: "ok", ...result });
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
