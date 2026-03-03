import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function friendlyAuthError(e: any) {
  const message = String(e?.message || "Failed to create user");
  const lower = message.toLowerCase();

  if (lower.includes("already") || lower.includes("registered") || lower.includes("duplicate")) {
    return "Email already exists. Use another email address.";
  }

  if (lower.includes("password")) {
    return "Password does not meet requirements. Use at least 8 characters.";
  }

  return message;
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
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const full_name = String(body.full_name || "").trim() || null;
  const department = String(body.department || "").trim() || null;
  const role = String(body.role || "STAFF").toUpperCase();

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  if (!role || !["ADMIN", "SECRETARY", "STAFF"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // quick pre-check to provide cleaner error before creating auth user
  const { data: existingProfile, error: existingErr } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!existingErr && existingProfile) {
    return NextResponse.json({ error: "Email already exists. Use another email address." }, { status: 409 });
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name, department },
  });

  if (createErr || !created.user) {
    return NextResponse.json({ error: friendlyAuthError(createErr) }, { status: 400 });
  }

  const userId = created.user.id;

  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      full_name,
      department,
      role,
    },
    { onConflict: "id" }
  );

  if (profErr) {
    // rollback auth user if profile insert fails to avoid half-created accounts
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  await admin.from("audit_logs").insert([
    {
      user_id: auth.user.id,
      action: "USER_CREATED",
      letter_id: null,
      meta: { created_user: userId, email, role, department },
    },
  ]);

  return NextResponse.json({ ok: true, userId });
}
