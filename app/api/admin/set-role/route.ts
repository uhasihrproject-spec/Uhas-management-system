import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // confirm admin
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (me?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const userId = String(body.userId || "");
  const role = String(body.role || "");
  const department = body.department ?? null;
  const full_name = body.full_name ?? null;

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (!["ADMIN", "SECRETARY", "STAFF"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role, department, full_name })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // audit
  await supabase.from("audit_logs").insert([
    {
      user_id: auth.user.id,
      action: "ROLE_UPDATED",
      letter_id: null,
      meta: { target_user: userId, role, department },
    },
  ]);

  return NextResponse.json({ ok: true });
}
