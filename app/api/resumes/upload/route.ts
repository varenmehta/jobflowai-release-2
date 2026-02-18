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
  "application/octet-stream",
]);

function sanitizeFilename(name: string) {
  const last = name.split("/").pop() ?? name;
  return last.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureResumesBucket() {
  const { data } = await supabaseServer.storage.getBucket("resumes");
  if (data) return;
  await supabaseServer.storage.createBucket("resumes", {
    public: true,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: [...ALLOWED_CONTENT_TYPES],
  });
}

export async function POST(request: Request) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Resume upload is not configured on server (missing Supabase environment variables)." },
      { status: 500 },
    );
  }

  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const contentTypeHeader = request.headers.get("content-type") ?? "";

  if (contentTypeHeader.includes("multipart/form-data")) {
    await ensureResumesBucket();

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const safeFilename = sanitizeFilename(file.name);
    if (!safeFilename) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const fileType = file.type || "application/octet-stream";
    if (!ALLOWED_CONTENT_TYPES.has(fileType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "File too large (max 8MB)." }, { status: 400 });
    }

    const uploadPath = `${user.id}/${Date.now()}-${safeFilename}`;
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseServer.storage.from("resumes").upload(uploadPath, fileBuffer, {
      contentType: fileType,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message ?? "Upload failed" }, { status: 500 });
    }

    const { data: publicData } = supabaseServer.storage.from("resumes").getPublicUrl(uploadPath);
    const publicUrl = publicData.publicUrl;
    if (!publicUrl) {
      return NextResponse.json({ error: "Failed to generate public URL for uploaded file." }, { status: 500 });
    }

    return NextResponse.json({ path: uploadPath, publicUrl });
  }

  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  if (!ALLOWED_CONTENT_TYPES.has(body.data.contentType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  await ensureResumesBucket();

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

  const { data: publicData } = supabaseServer.storage.from("resumes").getPublicUrl(uploadPath);
  const publicUrl = publicData.publicUrl;
  if (!publicUrl) {
    return NextResponse.json({ error: "Failed to generate public URL for uploaded file." }, { status: 500 });
  }

  return NextResponse.json({ ...data, path: uploadPath, publicUrl });
}
