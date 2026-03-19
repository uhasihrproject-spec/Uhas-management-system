import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { buildWorkflowStateMap, type WorkflowAuditRow } from "@/lib/workflow";
import { listVisibleLettersForUser } from "@/lib/letters/visible";
import WorkflowBoard from "./WorkflowBoard";

export default async function WorkflowPage() {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login");

  const { data: profile } = await admin
    .from("profiles")
    .select("role, department, full_name")
    .eq("id", auth.user.id)
    .maybeSingle();

  const role = (profile?.role as string | null) ?? null;
  const department = profile?.department ?? null;
  const letters = await listVisibleLettersForUser(
    admin,
    auth.user.id,
    role,
    department,
    "id,ref_no,subject,confidentiality,status,recipient_department,created_by,created_at",
    150
  );
  const letterIds = letters.map((letter) => letter.id);

  const { data: workflowLogs } = letterIds.length
    ? await admin
        .from("audit_logs")
        .select("id, letter_id, user_id, action, created_at, meta")
        .in("letter_id", letterIds)
        .in("action", ["WORKFLOW_STARTED", "WORKFLOW_ROUTED", "WORKFLOW_COMPLETED"])
        .order("created_at", { ascending: true })
    : { data: [] };

  const profileIds = Array.from(
    new Set(
      (workflowLogs || [])
        .flatMap((log: any) => [
          log.user_id,
          log.meta?.to_user_id,
          log.meta?.from_user_id,
          log.meta?.completed_by_user_id,
        ])
        .filter(Boolean)
    )
  ) as string[];

  const { data: people } = profileIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] };

  const profileMap = Object.fromEntries(
    (people || []).map((person: any) => [person.id, person.full_name?.trim() || "Unnamed User"])
  );

  const workflowStateMap = buildWorkflowStateMap((workflowLogs || []) as WorkflowAuditRow[], profileMap);

  const rows = letters
    .map((letter) => {
      const workflow = workflowStateMap.get(letter.id);
      const canAdvance =
        role === "ADMIN" ||
        role === "SECRETARY" ||
        (workflow?.status === "IN_PROGRESS" && workflow.currentAssigneeId === auth.user.id);

      return {
        id: letter.id,
        refNo: letter.ref_no || "No ref",
        subject: letter.subject || "Untitled letter",
        confidentiality: letter.confidentiality,
        letterStatus: letter.status,
        createdAt: letter.created_at,
        workflowStatus: workflow?.status || "NOT_STARTED",
        currentStep: workflow?.currentStep || 0,
        currentAssigneeId: workflow?.currentAssigneeId || null,
        currentAssigneeName: workflow?.currentAssigneeName || null,
        completedByName: workflow?.completedByName || null,
        completedAt: workflow?.completedAt || null,
        lastActionAt: workflow?.lastActionAt || null,
        canAdvance,
        history:
          workflow?.steps.map((step) => ({
            id: step.id,
            type: step.type,
            stepNumber: step.stepNumber,
            actorName: step.actorName,
            fromUserName: step.fromUserName,
            toUserName: step.toUserName,
            note: step.note,
            createdAt: step.createdAt,
          })) || [],
      };
    })
    .sort((a, b) => {
      const rank = { IN_PROGRESS: 0, NOT_STARTED: 1, DONE: 2 } as const;
      const aRank = rank[a.workflowStatus];
      const bRank = rank[b.workflowStatus];
      if (aRank !== bRank) return aRank - bRank;
      return String(b.lastActionAt || b.createdAt || "").localeCompare(String(a.lastActionAt || a.createdAt || ""));
    });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">UHAS Procurement Directorate</p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-900 sm:text-3xl">Workflow Tracker</h1>
          <p className="mt-2 text-sm text-neutral-600 sm:text-base">
            Move letters from one officer to the next, see who is holding what now, and keep a visible audit trail until each item is completed.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Back to dashboard
          </Link>
          <Link
            href="/letters"
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-200"
          >
            Browse letters
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 ring-1 ring-neutral-200/70">
          <div className="text-sm text-neutral-500">Active workflows</div>
          <div className="mt-2 text-3xl font-semibold text-neutral-900">
            {rows.filter((row) => row.workflowStatus === "IN_PROGRESS").length}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-neutral-200/70">
          <div className="text-sm text-neutral-500">Assigned to you</div>
          <div className="mt-2 text-3xl font-semibold text-neutral-900">
            {rows.filter((row) => row.currentAssigneeId === auth.user.id).length}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-neutral-200/70">
          <div className="text-sm text-neutral-500">Completed workflows</div>
          <div className="mt-2 text-3xl font-semibold text-neutral-900">
            {rows.filter((row) => row.workflowStatus === "DONE").length}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <WorkflowBoard rows={rows} currentUserId={auth.user.id} />
      </div>
    </div>
  );
}
