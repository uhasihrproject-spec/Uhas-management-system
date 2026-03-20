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
  const status = String(body.status || "").trim().toUpperCase();
  const notes = String(body.notes || "").trim() || null;
  if (!letterId || !["IN_PROGRESS", "DONE"].includes(status)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const access = await getLetterAccess(auth.user.id, letterId);
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const workflow = await listWorkflowSteps(letterId);
  if (!workflow.tableAvailable || !workflow.currentStep) return NextResponse.json({ error: "Workflow not configured" }, { status: 400 });

  const me = await getUserProfile(auth.user.id);
  const canManage = ["ADMIN", "SECRETARY"].includes(me?.role || "") || workflow.currentStep.user_id === auth.user.id;
  if (!canManage) return NextResponse.json({ error: "Not assigned to current step" }, { status: 403 });

  const admin = supabaseAdmin();
  const patch = status === "DONE"
    ? { status, notes, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    : { status, notes, updated_at: new Date().toISOString() };

  const { error } = await admin.from("letter_workflow_steps").update(patch).eq("id", workflow.currentStep.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("audit_logs").insert({ user_id: auth.user.id, action: `WORKFLOW_${status}`, letter_id: letterId, meta: { notes } });
  return NextResponse.json({ ok: true });
}
