import { supabaseAdmin } from "@/lib/supabase/admin";

type Conf = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";
type Role = "ADMIN" | "SECRETARY" | "STAFF" | null;

type LetterRow = {
  id: string;
  confidentiality: Conf | null;
  recipient_department: string | null;
  created_by: string | null;
  file_path: string | null;
};

type ProfileRow = {
  role: Role;
  department: string | null;
};

export async function getLetterAccess(userId: string, letterId: string) {
  const admin = supabaseAdmin();

  const [{ data: letter, error: letterErr }, { data: profile, error: profileErr }] =
    await Promise.all([
      admin
        .from("letters")
        .select("id, confidentiality, recipient_department, created_by, file_path")
        .eq("id", letterId)
        .maybeSingle<LetterRow>(),
      admin.from("profiles").select("role, department").eq("id", userId).maybeSingle<ProfileRow>(),
    ]);

  if (letterErr) return { allowed: false, reason: letterErr.message, role: null as Role, letter: null };
  if (profileErr) return { allowed: false, reason: profileErr.message, role: null as Role, letter: null };
  if (!letter) return { allowed: false, reason: "Letter not found", role: profile?.role ?? null, letter: null };

  const role = profile?.role ?? null;
  if (role === "ADMIN" || role === "SECRETARY") return { allowed: true, reason: null, role, letter };
  if (letter.confidentiality === "PUBLIC") return { allowed: true, reason: null, role, letter };
  if (letter.created_by === userId) return { allowed: true, reason: null, role, letter };

  if (letter.confidentiality === "INTERNAL") {
    const sameDept =
      Boolean(profile?.department) &&
      Boolean(letter.recipient_department) &&
      profile?.department === letter.recipient_department;

    return { allowed: Boolean(sameDept), reason: sameDept ? null : "Access denied", role, letter };
  }

  if (letter.confidentiality === "CONFIDENTIAL") {
    const { data: recipient } = await admin
      .from("letter_recipients")
      .select("user_id")
      .eq("letter_id", letterId)
      .eq("user_id", userId)
      .maybeSingle();

    const isRecipient = Boolean(recipient);
    return { allowed: isRecipient, reason: isRecipient ? null : "Access denied", role, letter };
  }

  return { allowed: false, reason: "Access denied", role, letter };
}
