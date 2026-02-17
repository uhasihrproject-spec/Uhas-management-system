// app/api/letters/download/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "letters";

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");
    const letterId = searchParams.get("letterId");

    if (!filePath || !letterId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1) Confirm session (RLS-safe)
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Confirm letter exists & readable by this user (RLS enforced here)
    const { data: letter, error: letterErr } = await supabase
      .from("letters")
      .select("id")
      .eq("id", letterId)
      .single();

    if (letterErr || !letter) {
      return NextResponse.json({ error: "Letter not found" }, { status: 404 });
    }

    // 3) Service role client for storage download + audit
    const admin = createClient(
      must(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
      must(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: blob, error: dlErr } = await admin.storage
      .from(BUCKET)
      .download(filePath);

    if (dlErr || !blob) {
      return NextResponse.json(
        { error: dlErr?.message || "Download failed", path: filePath },
        { status: 400 }
      );
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4) Audit (non-blocking, safe)
    (async () => {
      try {
        await admin.from("audit_logs").insert([
          {
            user_id: auth.user!.id,
            action: "DOWNLOADED",
            letter_id: letterId,
            meta: { path: filePath },
          },
        ]);
      } catch {
        // ignore audit failures
      }
    })();

    // 5) Force download WITHOUT filename (so it never breaks on weird characters)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "Content-Disposition": "attachment",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
