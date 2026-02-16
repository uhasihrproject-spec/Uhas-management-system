import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabaseAuth = await supabaseServer();
  const { data: auth } = await supabaseAuth.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const refNo = String(formData.get("refNo") || "");

  if (!file || !refNo) {
    return NextResponse.json({ error: "Missing file or refNo" }, { status: 400 });
  }

  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF/JPG/PNG allowed" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "bin";
  const safeRef = refNo.replace(/[^a-zA-Z0-9-_]/g, "-");
  const path = `letters/${new Date().getFullYear()}/${safeRef}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from("letters")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    fileBucket: "letters",
    filePath: path,
    fileName: file.name,
    mimeType: file.type,
  });
}
