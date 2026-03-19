import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { getLetterAccess } from "@/lib/letters/access";
import { getWorkflowStateForLetter } from "@/lib/workflow";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const letterId = String(body?.letterId || "").trim();
  const action = String(body?.action || "").trim().toUpperCase();
  const targetUserId = String(body?.targetUserId || "").trim();
  const note = String(body?.note || "").trim();

  if (!letterId) return NextResponse.json({ error: "letterId is required" }, { status: 400 });
  if (!["ROUTE", "COMPLETE"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (action === "ROUTE" && !targetUserId) {
    return NextResponse.json({ error: "targetUserId is required when routing" }, { status: 400 });
  }

  const access = await getLetterAccess(auth.user.id, letterId);
  if (!access.allowed) return NextResponse.json({ error: access.reason || "Forbidden" }, { status: 403 });

  const admin = supabaseAdmin();
  const canManage = access.role === "ADMIN" || access.role === "SECRETARY";
  const workflowState = await getWorkflowStateForLetter(letterId);
  const currentAssigneeId = workflowState?.currentAssigneeId || null;
  const userCanAdvance = canManage || (currentAssigneeId && currentAssigneeId === auth.user.id);

  if (!userCanAdvance && action === "COMPLETE") {
    return NextResponse.json({ error: "Only the current holder, an admin, or a secretary can mark this done." }, { status: 403 });
  }

  if (!userCanAdvance && action === "ROUTE") {
    return NextResponse.json({ error: "Only the current holder, an admin, or a secretary can route this letter." }, { status: 403 });
  }

  const { data: actor } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (action === "ROUTE") {
    const { data: targetUser, error: targetError } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetError) return NextResponse.json({ error: targetError.message }, { status: 400 });
    if (!targetUser) return NextResponse.json({ error: "Target user not found" }, { status: 404 });

    const auditAction = workflowState?.status === "IN_PROGRESS" ? "WORKFLOW_ROUTED" : "WORKFLOW_STARTED";

    const { error } = await admin.from("audit_logs").insert([
      {
        user_id: auth.user.id,
        letter_id: letterId,
        action: auditAction,
        meta: {
          actor_name: actor?.full_name?.trim() || auth.user.email || "Unknown user",
          from_user_id: currentAssigneeId || auth.user.id,
          from_user_name:
            workflowState?.currentAssigneeName || actor?.full_name?.trim() || auth.user.email || "Unknown user",
          to_user_id: targetUser.id,
          to_user_name: targetUser.full_name?.trim() || "Unnamed User",
          note: note || null,
        },
      },
    ]);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  }

  const { error } = await admin.from("audit_logs").insert([
    {
      user_id: auth.user.id,
      letter_id: letterId,
      action: "WORKFLOW_COMPLETED",
      meta: {
        actor_name: actor?.full_name?.trim() || auth.user.email || "Unknown user",
        completed_by_user_id: auth.user.id,
        completed_by_name: actor?.full_name?.trim() || auth.user.email || "Unknown user",
        note: note || null,
      },
    },
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
