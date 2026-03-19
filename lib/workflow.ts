import { supabaseAdmin } from "@/lib/supabase/admin";

export type WorkflowAuditAction =
  | "WORKFLOW_STARTED"
  | "WORKFLOW_ROUTED"
  | "WORKFLOW_COMPLETED";

export type WorkflowAuditRow = {
  id: string;
  letter_id: string | null;
  user_id: string | null;
  action: string;
  created_at: string;
  meta: Record<string, any> | null;
};

export type WorkflowStep = {
  id: string;
  letterId: string;
  type: "STARTED" | "ROUTED" | "COMPLETED";
  stepNumber: number;
  createdAt: string;
  actorId: string | null;
  actorName: string;
  fromUserId: string | null;
  fromUserName: string | null;
  toUserId: string | null;
  toUserName: string | null;
  note: string | null;
};

export type WorkflowState = {
  letterId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "DONE";
  currentStep: number;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
  completedAt: string | null;
  completedById: string | null;
  completedByName: string | null;
  lastActionAt: string | null;
  steps: WorkflowStep[];
};

export function isWorkflowAction(action: string): action is WorkflowAuditAction {
  return ["WORKFLOW_STARTED", "WORKFLOW_ROUTED", "WORKFLOW_COMPLETED"].includes(action);
}

function actorName(profileMap: Record<string, string>, userId?: string | null, fallback?: string | null) {
  if (userId && profileMap[userId]) return profileMap[userId];
  if (fallback?.trim()) return fallback.trim();
  return "Unknown user";
}

export function buildWorkflowStateMap(
  logs: WorkflowAuditRow[],
  profileMap: Record<string, string>
) {
  const sorted = [...logs]
    .filter((log) => log.letter_id && isWorkflowAction(log.action))
    .sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return at - bt;
    });

  const states = new Map<string, WorkflowState>();

  for (const log of sorted) {
    const letterId = String(log.letter_id);
    const meta = log.meta || {};
    const existing =
      states.get(letterId) ||
      ({
        letterId,
        status: "NOT_STARTED",
        currentStep: 0,
        currentAssigneeId: null,
        currentAssigneeName: null,
        completedAt: null,
        completedById: null,
        completedByName: null,
        lastActionAt: null,
        steps: [],
      } satisfies WorkflowState);

    if (log.action === "WORKFLOW_COMPLETED") {
      const completedById = (meta.completed_by_user_id as string | null) || log.user_id || null;
      const completedByName = actorName(
        profileMap,
        completedById,
        (meta.completed_by_name as string | null) || (meta.actor_name as string | null)
      );
      const stepNumber = existing.currentStep || Math.max(existing.steps.length, 1);

      existing.steps.push({
        id: log.id,
        letterId,
        type: "COMPLETED",
        stepNumber,
        createdAt: log.created_at,
        actorId: log.user_id,
        actorName: actorName(profileMap, log.user_id, meta.actor_name as string | null),
        fromUserId: existing.currentAssigneeId,
        fromUserName: existing.currentAssigneeName,
        toUserId: null,
        toUserName: null,
        note: (meta.note as string | null) || null,
      });

      existing.status = "DONE";
      existing.completedAt = log.created_at;
      existing.completedById = completedById;
      existing.completedByName = completedByName;
      existing.currentAssigneeId = null;
      existing.currentAssigneeName = null;
      existing.lastActionAt = log.created_at;
      states.set(letterId, existing);
      continue;
    }

    const isStart = log.action === "WORKFLOW_STARTED";
    const stepNumber = isStart ? 1 : existing.currentStep + 1;
    const toUserId = (meta.to_user_id as string | null) || null;
    const fromUserId = isStart
      ? ((meta.from_user_id as string | null) || log.user_id || null)
      : ((meta.from_user_id as string | null) || existing.currentAssigneeId || log.user_id || null);

    existing.steps.push({
      id: log.id,
      letterId,
      type: isStart ? "STARTED" : "ROUTED",
      stepNumber,
      createdAt: log.created_at,
      actorId: log.user_id,
      actorName: actorName(profileMap, log.user_id, meta.actor_name as string | null),
      fromUserId,
      fromUserName: fromUserId
        ? actorName(profileMap, fromUserId, meta.from_user_name as string | null)
        : null,
      toUserId,
      toUserName: toUserId
        ? actorName(profileMap, toUserId, meta.to_user_name as string | null)
        : null,
      note: (meta.note as string | null) || null,
    });

    existing.currentStep = stepNumber;
    existing.status = "IN_PROGRESS";
    existing.currentAssigneeId = toUserId;
    existing.currentAssigneeName = toUserId
      ? actorName(profileMap, toUserId, meta.to_user_name as string | null)
      : null;
    existing.completedAt = null;
    existing.completedById = null;
    existing.completedByName = null;
    existing.lastActionAt = log.created_at;
    states.set(letterId, existing);
  }

  return states;
}

export async function getWorkflowStateForLetter(letterId: string) {
  const admin = supabaseAdmin();
  const { data: logs } = await admin
    .from("audit_logs")
    .select("id, letter_id, user_id, action, created_at, meta")
    .eq("letter_id", letterId)
    .in("action", ["WORKFLOW_STARTED", "WORKFLOW_ROUTED", "WORKFLOW_COMPLETED"])
    .order("created_at", { ascending: true });

  const userIds = Array.from(
    new Set(
      (logs || [])
        .flatMap((log: any) => [
          log.user_id,
          log.meta?.to_user_id,
          log.meta?.from_user_id,
          log.meta?.completed_by_user_id,
        ])
        .filter(Boolean)
    )
  ) as string[];

  let profileMap: Record<string, string> = {};
  if (userIds.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    profileMap = Object.fromEntries(
      (profiles || []).map((profile: any) => [profile.id, profile.full_name?.trim() || "Unnamed User"])
    );
  }

  return buildWorkflowStateMap((logs || []) as WorkflowAuditRow[], profileMap).get(letterId) || null;
}
