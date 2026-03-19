import Link from "next/link";
import LettersTable from "./LettersTable";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ensureYearlyArchive } from "@/lib/letters/yearlyArchive";

type SearchParams = {
  q?: string;
  direction?: "INCOMING" | "OUTGOING";
  status?: "RECEIVED" | "SCANNED" | "ASSIGNED" | "ARCHIVED";
  conf?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";
  year?: string;
};

const SELECT_COLUMNS =
  "id,ref_no,direction,date_received,sender_name,recipient_department,subject,status,confidentiality,created_at";
const MAX_ROWS = 300;

function applyFilters(query: any, params: { q: string; direction: string; status: string; conf: string; year: string }) {
  let q = query.order("created_at", { ascending: false }).limit(MAX_ROWS);

  if (params.direction) q = q.eq("direction", params.direction);
  if (params.status) q = q.eq("status", params.status);
  if (params.conf) q = q.eq("confidentiality", params.conf);
  if (params.year) q = q.gte("date_received", `${params.year}-01-01`).lte("date_received", `${params.year}-12-31`);

  if (params.q) {
    q = q.or(
      `ref_no.ilike.%${params.q}%,sender_name.ilike.%${params.q}%,subject.ilike.%${params.q}%,recipient_department.ilike.%${params.q}%`
    );
  }

  return q;
}

function normalizeYear(v: string | undefined, fallback: number) {
  if (!v) return String(fallback);
  const x = Number(v);
  if (!Number.isInteger(x) || x < 2000 || x > 3000) return String(fallback);
  return String(x);
}

export default async function LettersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  const { data: auth } = await supabase.auth.getUser();

  // automatic year rollover: all previous-year letters become ARCHIVED
  await ensureYearlyArchive();

  let role: "ADMIN" | "SECRETARY" | "STAFF" | null = null;
  let myDepartment: string | null = null;
  let compactMode = false;
  let showHints = true;

  if (auth.user) {
    let profile: any = null;
    let profileError: any = null;

    ({ data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role, department, pref_compact, pref_hints")
      .eq("id", auth.user.id)
      .maybeSingle());

    if (profileError && String(profileError.message || "").toLowerCase().includes("column")) {
      ({ data: profile } = await admin
        .from("profiles")
        .select("role, department")
        .eq("id", auth.user.id)
        .maybeSingle());
    }

    role = (profile?.role as any) ?? null;
    myDepartment = profile?.department ?? null;
    compactMode = Boolean(profile?.pref_compact);
    showHints = profile?.pref_hints !== false;
  }

  const canWrite = role === "ADMIN" || role === "SECRETARY";

  const currentYear = new Date().getFullYear();

  const filters = {
    q: (sp.q || "").trim(),
    direction: sp.direction || "",
    status: sp.status || "",
    conf: sp.conf || "",
    year: normalizeYear(sp.year, currentYear),
  };

  const { data: oldestYearRow } = await admin
    .from("letters")
    .select("date_received")
    .order("date_received", { ascending: true })
    .limit(1)
    .maybeSingle();

  const startYear = oldestYearRow?.date_received
    ? Number(String(oldestYearRow.date_received).slice(0, 4)) || currentYear
    : currentYear;

  const years = Array.from(
    { length: Math.max(1, currentYear - startYear + 1) },
    (_, i) => String(startYear + i)
  );

  const safeSelectedYear = years.includes(filters.year) ? filters.year : String(currentYear);
  filters.year = safeSelectedYear;
  const selectedYear = Number(safeSelectedYear) || currentYear;
  const isArchiveView = selectedYear < currentYear;

  let rows: any[] = [];
  let errorMessage = "";

  if (auth.user && (role === "ADMIN" || role === "SECRETARY")) {
    const { data, error } = await applyFilters(admin.from("letters").select(SELECT_COLUMNS), filters);
    if (error) errorMessage = error.message;
    rows = data || [];
  } else if (auth.user) {
    const { data: stepLinks, error: stepErr } = await admin
      .from("letter_workflow_steps")
      .select("letter_id")
      .eq("user_id", auth.user.id)
      .limit(5000);

    if (stepErr && !String(stepErr.message || "").toLowerCase().includes("letter_workflow_steps")) {
      errorMessage = stepErr.message;
    }

    const stepIds = (stepLinks || []).map((x: any) => x.letter_id).filter(Boolean);
    if (stepIds.length) {
      const { data, error } = await applyFilters(admin.from("letters").select(SELECT_COLUMNS).in("id", stepIds), filters);
      if (error) errorMessage = error.message;
      rows = data || [];
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
            UHAS Procurement Directorate
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold">Letters</h1>
          {showHints ? (
            <>
              <p className="mt-2 text-sm sm:text-base text-neutral-800">
                Search and manage incoming/outgoing letters. Staff only see letters assigned to their workflow steps.
              </p>
              <p className="mt-1 text-sm text-neutral-700">
                {isArchiveView
                  ? `Archive view: ${selectedYear}. These records are from a previous year.`
                  : `Active year: ${currentYear}. New records continue from this year.`}
              </p>
            </>
          ) : null}
        </div>

        {canWrite ? (
          <Link
            href="/letters/new"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl px-4 py-2.5 text-sm text-white
            btn-brand mt-4 sm:mt-0"
          >
            + New Letter
          </Link>
        ) : null}
      </div>

      <div className="mt-6 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {errorMessage ? (
          <div className="rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
            <p className="text-sm text-red-800">{errorMessage}</p>
            <p className="mt-2 text-sm text-neutral-700">
              If this persists, verify your Supabase table permissions and indexes.
            </p>
          </div>
        ) : (
          <LettersTable
            rows={rows as any}
            years={years}
            currentYear={String(currentYear)}
            selectedYear={String(selectedYear)}
            compactMode={compactMode}
            showHints={showHints}
          />
        )}
      </div>
    </div>
  );
}
