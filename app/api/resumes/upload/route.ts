import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { supabaseServer } from "@/lib/supabase";
import { z } from "zod";

const schema = z.object({
  filename: z.string().min(2).max(200),
  contentType: z.string().min(2),
});

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function sanitizeFilename(name: string) {
  const last = name.split("/").pop() ?? name;
  return last.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  if (!ALLOWED_CONTENT_TYPES.has(body.data.contentType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const safeFilename = sanitizeFilename(body.data.filename);
  if (!safeFilename) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const uploadPath = `${user.id}/${Date.now()}-${safeFilename}`;
  const { data, error } = await supabaseServer.storage
    .from("resumes")
    .createSignedUploadUrl(uploadPath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Upload failed" }, { status: 500 });
  }

  const baseUrl = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const publicUrl = `${baseUrl}/storage/v1/object/public/resumes/${uploadPath}`;

  return NextResponse.json({ ...data, path: uploadPath, publicUrl });
}
