import { supabaseAdmin } from "@/lib/supabase/admin";

let lastArchiveCheckAt = 0;
const ARCHIVE_CHECK_TTL_MS = 1000 * 60 * 30; // 30 minutes per server process

export async function ensureYearlyArchive() {
  const now = Date.now();
  if (now - lastArchiveCheckAt < ARCHIVE_CHECK_TTL_MS) {
    return { ok: true, skipped: true, error: null as string | null };
  }

  const admin = supabaseAdmin();
  const currentYearStart = `${new Date().getFullYear()}-01-01`;

  // fast existence check first to avoid heavy updates on each call
  const { count, error: checkErr } = await admin
    .from("letters")
    .select("id", { count: "exact", head: true })
    .lt("date_received", currentYearStart)
    .neq("status", "ARCHIVED");

  if (checkErr) {
    return { ok: false, skipped: false, error: checkErr.message };
  }

  if (!count) {
    lastArchiveCheckAt = now;
    return { ok: true, skipped: true, error: null as string | null };
  }

  const { error } = await admin
    .from("letters")
    .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
    .lt("date_received", currentYearStart)
    .neq("status", "ARCHIVED");

  if (!error) lastArchiveCheckAt = now;

  return { ok: !error, skipped: false, error: error?.message || null };
}
