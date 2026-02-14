import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { z } from "zod";

const quickAddSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: Request) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const body = quickAddSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const parsed = new URL(body.data.url);

  return NextResponse.json({
    title: "Imported role",
    company: parsed.hostname.replace("www.", "").split(".")[0],
    description: "Auto-filled from job posting URL.",
    logoUrl: null,
  });
}
