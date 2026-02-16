import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const name = searchParams.get("name") || "document";
  const letterId = searchParams.get("letterId");

  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // download file from storage
  const { data, error } = await admin.storage.from("letters").download(path);
  if (error || !data) return NextResponse.json({ error: error?.message || "Download failed" }, { status: 500 });

  // ✅ Audit: downloaded (best-effort)
  if (letterId) {
    await admin.from("audit_logs").insert([
      {
        user_id: auth.user.id,
        action: "DOWNLOADED",
        letter_id: letterId,
        meta: { file: name, path },
      },
    ]);
  }

  const bytes = Buffer.from(await data.arrayBuffer());

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name.replaceAll('"', "")}"`,
    },
  });
}
