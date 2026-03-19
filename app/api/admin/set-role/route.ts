import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function normalizeError(e: any) {
  const message = String(e?.message || "Unknown error");
  const lower = message.toLowerCase();

  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "This value already exists. Use a different one.";
  }

  return message;
}

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
  const userId = String(body.userId || "").trim();
  const role = String(body.role || "").toUpperCase();
  const department = String(body.department || "").trim() || null;
  const full_name = String(body.full_name || "").trim() || null;

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (!role || !["ADMIN", "SECRETARY", "STAFF"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { error } = await admin
    .from("profiles")
    .update({ role, department, full_name })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: normalizeError(error) }, { status: 400 });
  }

  // keep auth metadata in sync where possible (non-fatal)
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      role,
      full_name,
      department,
    },
  });

  // audit
  await admin.from("audit_logs").insert([
    {
      user_id: auth.user.id,
      action: "ROLE_UPDATED",
      letter_id: null,
      meta: { target_user: userId, role, department },
    },
  ]);

  return NextResponse.json({ ok: true });
}
