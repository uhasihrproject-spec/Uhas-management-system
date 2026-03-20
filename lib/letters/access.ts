import { supabaseAdmin } from "@/lib/supabase/admin";
import { listWorkflowSteps } from "@/lib/workflow";

type Conf = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";
type Role = "ADMIN" | "SECRETARY" | "STAFF" | null;

type LetterRow = {
  id: string;
  confidentiality: Conf | null;
  recipient_department: string | null;
  created_by: string | null;
  file_path: string | null;
};

type ProfileRow = { role: Role; department: string | null };

export async function getLetterAccess(userId: string, letterId: string) {
  const admin = supabaseAdmin();
  const [{ data: letter, error: letterErr }, { data: profile, error: profileErr }] = await Promise.all([
    admin.from("letters").select("id, confidentiality, recipient_department, created_by, file_path").eq("id", letterId).maybeSingle<LetterRow>(),
    admin.from("profiles").select("role, department").eq("id", userId).maybeSingle<ProfileRow>(),
  ]);

  if (letterErr) return { allowed: false, reason: letterErr.message, role: null as Role, letter: null };
  if (profileErr) return { allowed: false, reason: profileErr.message, role: null as Role, letter: null };
  if (!letter) return { allowed: false, reason: "Letter not found", role: profile?.role ?? null, letter: null };

  const role = profile?.role ?? null;
  if (role === "ADMIN" || role === "SECRETARY") return { allowed: true, reason: null, role, letter };

  const workflow = await listWorkflowSteps(letterId);
  const isAssigned = workflow.steps.some((step) => step.user_id === userId);
  if (role === "STAFF") {
    return { allowed: isAssigned, reason: isAssigned ? null : "Assigned staff only", role, letter };
  }

  return { allowed: false, reason: "Access denied", role, letter };
}
