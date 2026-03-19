import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getLetterAccess } from "@/lib/letters/access";
import { getUserProfile, listWorkflowSteps } from "@/lib/workflow";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const letterId = String(body.letterId || "").trim();
  const nextUserId = String(body.nextUserId || "").trim();
  const notes = String(body.notes || "").trim() || null;
  if (!letterId || !nextUserId) return NextResponse.json({ error: "letterId and nextUserId are required" }, { status: 400 });

  const access = await getLetterAccess(auth.user.id, letterId);
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const me = await getUserProfile(auth.user.id);
  if (!["ADMIN", "SECRETARY"].includes(me?.role || "")) {
    return NextResponse.json({ error: "Only admin or secretary can pass letters forward." }, { status: 403 });
  }

  const workflow = await listWorkflowSteps(letterId);
  if (!workflow.tableAvailable) return NextResponse.json({ error: "Workflow table unavailable" }, { status: 400 });
  const admin = supabaseAdmin();
  const now = new Date().toISOString();

  if (workflow.currentStep) {
    await admin.from("letter_workflow_steps").update({ status: "COMPLETED", completed_at: now, updated_at: now, notes }).eq("id", workflow.currentStep.id);
  }

  const nextOrder = (workflow.steps.at(-1)?.step_order || 0) + 1;
  const { error } = await admin.from("letter_workflow_steps").insert({
    letter_id: letterId,
    user_id: nextUserId,
    assigned_by: auth.user.id,
    step_order: nextOrder,
    status: "PENDING",
    notes,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("audit_logs").insert({ user_id: auth.user.id, action: "WORKFLOW_PASSED", letter_id: letterId, meta: { next_user_id: nextUserId, notes } });
  return NextResponse.json({ ok: true });
}
