import { supabaseAdmin } from "@/lib/supabase/admin";

export type Role = "ADMIN" | "SECRETARY" | "STAFF" | null;
export type WorkflowStepStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DONE";

export type WorkflowStep = {
  id: string;
  letter_id: string;
  user_id: string;
  assigned_by: string | null;
  step_order: number;
  status: WorkflowStepStatus;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
  notes: string | null;
  profiles?: {
    full_name: string | null;
    department: string | null;
    role: string | null;
  } | null;
};

export type WorkflowSummary = {
  steps: WorkflowStep[];
  currentStep: WorkflowStep | null;
  nextStep: WorkflowStep | null;
  activeUserIds: string[];
  lastUpdatedAt: string | null;
  tableAvailable: boolean;
};

export async function getUserProfile(userId: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, department, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listWorkflowSteps(letterId: string): Promise<WorkflowSummary> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("letter_workflow_steps")
    .select("id, letter_id, user_id, assigned_by, step_order, status, created_at, updated_at, completed_at, notes, profiles:user_id(full_name, department, role)")
    .eq("letter_id", letterId)
    .order("step_order", { ascending: true });

  if (error) {
    if (String(error.message || "").toLowerCase().includes("letter_workflow_steps")) {
      return {
        steps: [],
        currentStep: null,
        nextStep: null,
        activeUserIds: [],
        lastUpdatedAt: null,
        tableAvailable: false,
      };
    }
    throw error;
  }

  const steps = ((data || []) as any[]).map((step) => ({
    ...step,
    profiles: Array.isArray(step.profiles) ? step.profiles[0] ?? null : step.profiles ?? null,
    status: (step.status || "PENDING") as WorkflowStepStatus,
  })) as WorkflowStep[];

  const currentStep =
    steps.find((step) => step.status === "IN_PROGRESS") ||
    steps.find((step) => step.status === "PENDING") ||
    steps[steps.length - 1] ||
    null;

  const nextStep = currentStep
    ? steps.find((step) => step.step_order > currentStep.step_order && step.status !== "COMPLETED" && step.status !== "DONE") || null
    : null;

  const activeUserIds = steps
    .filter((step) => step.status === "PENDING" || step.status === "IN_PROGRESS")
    .map((step) => step.user_id);

  const lastUpdatedAt =
    steps
      .map((step) => step.completed_at || step.updated_at || step.created_at)
      .filter(Boolean)
      .sort()
      .at(-1) || null;

  return { steps, currentStep, nextStep, activeUserIds, lastUpdatedAt, tableAvailable: true };
}

export async function userCanManageWorkflow(userId: string, letterId: string) {
  const [profile, workflow] = await Promise.all([getUserProfile(userId), listWorkflowSteps(letterId)]);
  const role = (profile?.role as Role) ?? null;

  if (role === "ADMIN" || role === "SECRETARY") {
    return { allowed: true, role, workflow };
  }

  const assigned = workflow.activeUserIds.includes(userId) || workflow.steps.some((step) => step.user_id === userId);
  return { allowed: assigned, role, workflow };
}
