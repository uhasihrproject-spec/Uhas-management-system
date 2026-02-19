import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

const MAX_MB = 10;

export async function POST(req: Request) {
  // 1) Require logged-in user
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2) Read form data
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const refNo = String(form.get("refNo") || "").trim();

  if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });
  if (!refNo) return NextResponse.json({ error: "refNo is required" }, { status: 400 });

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_MB) {
    return NextResponse.json({ error: `File too large (max ${MAX_MB}MB)` }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  const ext =
    mime === "application/pdf" ? "pdf" :
    mime === "image/png" ? "png" :
    mime === "image/jpeg" ? "jpg" : "bin";

  // 3) Use service role ONLY for storage upload
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const bucket = process.env.NEXT_PUBLIC_LETTERS_BUCKET || "letters"; // Important
  const safeRef = refNo.replaceAll("/", "_");
  const path = `${auth.user.id}/${safeRef}.${ext}`;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: upErr } = await admin.storage
      .from(bucket)
      .upload(path, bytes, {
        contentType: mime,
        upsert: true,
      });

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      fileBucket: bucket,
      filePath: path,
      fileName: `${safeRef}.${ext}`,
      mimeType: mime,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
