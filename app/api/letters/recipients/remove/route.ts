import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { letter_id, user_id } = body;

    if (!letter_id || !user_id) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await supabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("letter_recipients")
      .delete()
      .eq("letter_id", letter_id)
      .eq("user_id", user_id);

    if (error) throw error;

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to remove recipient" },
      { status: 500 }
    );
  }
}
