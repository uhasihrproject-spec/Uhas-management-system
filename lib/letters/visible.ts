import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildWorkflowStateMap, type WorkflowAuditRow } from "@/lib/workflow";

type AdminClient = ReturnType<typeof supabaseAdmin>;

export async function listVisibleLettersForUser(
  admin: AdminClient,
  userId: string,
  role: string | null,
  department: string | null,
  selectColumns: string,
  limit = 150
) {
  const { data: workflowLogs } = await admin
    .from("audit_logs")
    .select("id, letter_id, user_id, action, created_at, meta")
    .in("action", ["WORKFLOW_STARTED", "WORKFLOW_ROUTED", "WORKFLOW_COMPLETED"])
    .order("created_at", { ascending: true })
    .limit(5000);

  const workflowStateMap = buildWorkflowStateMap((workflowLogs || []) as WorkflowAuditRow[], {});
  const workflowAssignedIds = Array.from(workflowStateMap.values())
    .filter((state) => state.currentAssigneeId === userId)
    .map((state) => state.letterId);

  if (role === "ADMIN" || role === "SECRETARY") {
    const { data } = await admin
      .from("letters")
      .select(selectColumns)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data || []) as any[];
  }

  const createdQ = admin
    .from("letters")
    .select(selectColumns)
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const publicQ = admin
    .from("letters")
    .select(selectColumns)
    .eq("confidentiality", "PUBLIC")
    .order("created_at", { ascending: false })
    .limit(limit);

  const internalQ = department
    ? admin
        .from("letters")
        .select(selectColumns)
        .eq("confidentiality", "INTERNAL")
        .eq("recipient_department", department)
        .order("created_at", { ascending: false })
        .limit(limit)
    : Promise.resolve({ data: [], error: null } as any);

  const recipientIdsQ = admin.from("letter_recipients").select("letter_id").eq("user_id", userId).limit(5000);

  const [createdRes, publicRes, internalRes, recipientIdsRes] = await Promise.all([
    createdQ,
    publicQ,
    internalQ,
    recipientIdsQ,
  ]);

  const recipientIds = (recipientIdsRes.data || []).map((row: any) => row.letter_id).filter(Boolean);
  const confidentialRes = recipientIds.length
    ? await admin
        .from("letters")
        .select(selectColumns)
        .eq("confidentiality", "CONFIDENTIAL")
        .in("id", recipientIds)
        .order("created_at", { ascending: false })
        .limit(limit)
    : { data: [], error: null };

  const workflowAssignedRes = workflowAssignedIds.length
    ? await admin
        .from("letters")
        .select(selectColumns)
        .in("id", workflowAssignedIds)
        .order("created_at", { ascending: false })
        .limit(limit)
    : { data: [], error: null };

  const deduped = new Map<string, any>();
  for (const group of [
    createdRes.data || [],
    publicRes.data || [],
    (internalRes as any).data || [],
    (confidentialRes as any).data || [],
    (workflowAssignedRes as any).data || [],
  ]) {
    for (const row of group) {
      if (row?.id) deduped.set(row.id, row);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, limit);
}
