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

  // confirm caller is ADMIN (use profiles role here)
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
  const full_name = String(body.full_name || "").trim();
  const department = String(body.department || "").trim() || null;
  const role = String(body.role || "STAFF").toUpperCase();

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!password || password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  if (!["ADMIN", "SECRETARY", "STAFF"].includes(role))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const url = must(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = must(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey);

  // 1) Create auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    role,
    full_name,          // ✅ IMPORTANT
    department,         // optional
  },
});

  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message || "Failed to create user" }, { status: 400 });
  }

  const userId = created.user.id;

  // 2) Create/update profile
  const { error: profErr } = await admin.from("profiles").upsert({
    id: userId,
    full_name: full_name || null,
    department,
    role,
  });

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  // 3) Audit
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
