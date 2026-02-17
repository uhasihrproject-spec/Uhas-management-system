import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normErr(e: any) {
  // Supabase errors usually have message/code/details/hint
  return {
    message: String(e?.message || "Unknown error"),
    code: e?.code ? String(e.code) : undefined,
    details: e?.details ? String(e.details) : undefined,
    hint: e?.hint ? String(e.hint) : undefined,
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // confirm caller is ADMIN
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (meErr) return NextResponse.json({ error: "Failed to read profile", detail: meErr.message }, { status: 400 });
    if (me?.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();
    const userId = String(body.userId || "").trim();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // safety: prevent deleting yourself
    if (userId === auth.user.id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    const url = must(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = must(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(url, serviceKey);

    // Get email (optional)
    const { data: targetUser, error: getUserErr } = await admin.auth.admin.getUserById(userId);
    if (getUserErr) {
      // not fatal, but return detail if needed
      // continue anyway
    }

    // ✅ Step 1: delete profile row first
    // With your FK fix (ON DELETE SET NULL), this should not be blocked.
    const { error: profDelErr } = await admin.from("profiles").delete().eq("id", userId);
    if (profDelErr) {
      const info = normErr(profDelErr);
      return NextResponse.json(
        {
          error: "Failed deleting profile row.",
          detail: info.message,
          code: info.code,
          hint: info.hint,
          details: info.details,
        },
        { status: 409 }
      );
    }

    // ✅ Step 2: delete auth user
    const { error: authDelErr } = await admin.auth.admin.deleteUser(userId);
    if (authDelErr) {
      const info = normErr(authDelErr);
      // At this point profile is gone but auth may still exist
      return NextResponse.json(
        {
          error: "Failed deleting auth user.",
          detail: info.message,
          code: info.code,
          hint: info.hint,
          details: info.details,
        },
        { status: 400 }
      );
    }

    // ✅ Step 3: audit log entry (should still work; if it fails we don't break delete)
    await admin.from("audit_logs").insert([
      {
        user_id: auth.user.id,
        action: "USER_DELETED",
        letter_id: null,
        meta: { target_user: userId, target_email: targetUser?.user?.email ?? null },
      },
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const info = normErr(e);
    return NextResponse.json(
      { error: "Delete route crashed.", detail: info.message, code: info.code, hint: info.hint, details: info.details },
      { status: 500 }
    );
  }
}
