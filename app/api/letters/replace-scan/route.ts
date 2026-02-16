import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabaseAuth = await supabaseServer();
  const { data: auth } = await supabaseAuth.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const letterId = String(form.get("letterId") || "");
  const refNo = String(form.get("refNo") || "");

  if (!file || !letterId || !refNo) {
    return NextResponse.json({ error: "Missing file/letterId/refNo" }, { status: 400 });
  }

  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF/JPG/PNG allowed" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ext = file.name.split(".").pop() || "bin";
  const safeRef = refNo.replace(/[^a-zA-Z0-9-_]/g, "-");
  const path = `letters/${new Date().getFullYear()}/${safeRef}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from("letters")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Update DB record
  const { error: dbErr } = await admin
    .from("letters")
    .update({
      file_bucket: "letters",
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      updated_at: new Date().toISOString(),
    })
    .eq("id", letterId);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // Audit (best-effort)
  await admin.from("audit_logs").insert([
  {
    user_id: auth.user.id,
    action: "SCAN_REPLACED",
    letter_id: letterId,
    meta: { file: file.name, mime: file.type },
  },
]);

  return NextResponse.json({ ok: true });
}
