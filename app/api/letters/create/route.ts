import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // fetch profile to get role + ensure we can set created_by
  const { data: profile, error: pErr } = await supabase
  .from("profiles")
  .select("id,role")
  .eq("id", auth.user.id)
  .maybeSingle();

if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

if (!profile) {
  return NextResponse.json(
    { error: "Profile not found. Create a row in public.profiles for this user." },
    { status: 400 }
  );
}

  // Insert letter (RLS will enforce Secretary/Admin)
  const { data: inserted, error } = await supabase
    .from("letters")
    .insert([
      {
        ...body,
        created_by: profile.id,
      },
    ])
    .select("id,ref_no")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Audit log (optional)
  await supabase.from("audit_logs").insert([
    {
      user_id: profile.id,
      action: "CREATED",
      letter_id: inserted.id,
      meta: { ref_no: inserted.ref_no },
    },
  ]);

  return NextResponse.json({ ok: true, id: inserted.id });
}
