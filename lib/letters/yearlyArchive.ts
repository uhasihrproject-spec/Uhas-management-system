import { supabaseAdmin } from "@/lib/supabase/admin";

export async function ensureYearlyArchive() {
  const admin = supabaseAdmin();
  const currentYearStart = `${new Date().getFullYear()}-01-01`;

  const { error } = await admin
    .from("letters")
    .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
    .lt("date_received", currentYearStart)
    .neq("status", "ARCHIVED");

  return { ok: !error, error: error?.message || null };
}
