import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) return NextResponse.json({ users: [] });

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
  if (!me) return NextResponse.json({ error: "Profile not found" }, { status: 400 });

  if (!["ADMIN", "SECRETARY"].includes(me.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, department, role")
    .or(`full_name.ilike.%${q}%,department.ilike.%${q}%`)
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ users: data || [] });
}
