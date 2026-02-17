import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // confirm caller is ADMIN
  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
  if (me?.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const userId = String(body.userId || "").trim();
  const email = String(body.email || "").trim().toLowerCase();

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const url = must(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = must(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey);

  // Update email in Supabase Auth
  const { data: updated, error: upErr } = await admin.auth.admin.updateUserById(userId, {
    email,
    // you can keep this true if you want it to become active immediately
    email_confirm: true,
  });

  if (upErr) {
    return NextResponse.json({ error: upErr.message || "Failed to update email" }, { status: 400 });
  }

  // Optional: store email in profiles too (ONLY if your profiles table has an email column)
  // If you don't have it, remove this block.
  const { error: profErr } = await admin.from("profiles").update({ email }).eq("id", userId);
  // If the column doesn't exist, you'll get an error — remove the update in that case.
  if (profErr && !String(profErr.message || "").toLowerCase().includes("column")) {
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  // Audit
  await admin.from("audit_logs").insert([
    {
      user_id: auth.user.id,
      action: "USER_EMAIL_UPDATED",
      letter_id: null,
      meta: { target_user: userId, new_email: email, auth_email: updated?.user?.email ?? null },
    },
  ]);

  return NextResponse.json({ ok: true });
}
