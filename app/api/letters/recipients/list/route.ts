import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const letter_id = url.searchParams.get("letter_id");

    if (!letter_id) {
      return NextResponse.json({ error: "letter_id is required" }, { status: 400 });
    }

    const supabase = await supabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1️⃣ Get user IDs
    const { data: links, error: linkErr } = await supabase
      .from("letter_recipients")
      .select("user_id")
      .eq("letter_id", letter_id);

    if (linkErr) throw linkErr;

    const ids = (links || []).map(r => r.user_id);
    if (ids.length === 0) {
      return NextResponse.json({ recipients: [] });
    }

    // 2️⃣ Get user details
    const { data: users, error: userErr } = await supabase
      .from("profiles")
      .select("id, full_name, department, role")
      .in("id", ids);

    if (userErr) throw userErr;

    return NextResponse.json({ recipients: users || [] });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to list recipients" },
      { status: 500 }
    );
  }
}
