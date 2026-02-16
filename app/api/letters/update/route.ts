import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...patch } = body;

  if (!id) return NextResponse.json({ error: "Missing letter id" }, { status: 400 });

  const { error } = await supabase
    .from("letters")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // audit (best-effort)
 await supabase.from("audit_logs").insert([
  {
    user_id: auth.user.id,
    action: "UPDATED",
    letter_id: id,
    meta: { fields: Object.keys(patch) },
  },
]);

  return NextResponse.json({ ok: true });
}
