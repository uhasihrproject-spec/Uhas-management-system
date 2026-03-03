import Link from "next/link";
import LettersTable from "./LettersTable";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SearchParams = {
  q?: string;
  direction?: "INCOMING" | "OUTGOING";
  status?: "RECEIVED" | "SCANNED" | "ASSIGNED" | "ARCHIVED";
  conf?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";
};

const SELECT_COLUMNS =
  "id,ref_no,direction,date_received,sender_name,recipient_department,subject,status,confidentiality,created_at";
const MAX_ROWS = 300;

function applyFilters(query: any, params: { q: string; direction: string; status: string; conf: string }) {
  let q = query.order("created_at", { ascending: false }).limit(MAX_ROWS);

  if (params.direction) q = q.eq("direction", params.direction);
  if (params.status) q = q.eq("status", params.status);
  if (params.conf) q = q.eq("confidentiality", params.conf);

  if (params.q) {
    q = q.or(
      `ref_no.ilike.%${params.q}%,sender_name.ilike.%${params.q}%,subject.ilike.%${params.q}%,recipient_department.ilike.%${params.q}%`
    );
  }

  return q;
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

  let role: "ADMIN" | "SECRETARY" | "STAFF" | null = null;
  let myDepartment: string | null = null;

  if (auth.user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role, department")
      .eq("id", auth.user.id)
      .maybeSingle();

    role = (profile?.role as any) ?? null;
    myDepartment = profile?.department ?? null;
  }

  const canWrite = role === "ADMIN" || role === "SECRETARY";

  const filters = {
    q: (sp.q || "").trim(),
    direction: sp.direction || "",
    status: sp.status || "",
    conf: sp.conf || "",
  };

  let rows: any[] = [];
  let errorMessage = "";

  if (auth.user && (role === "ADMIN" || role === "SECRETARY")) {
    const { data, error } = await applyFilters(admin.from("letters").select(SELECT_COLUMNS), filters);
    if (error) errorMessage = error.message;
    rows = data || [];
  } else if (auth.user) {
    const userId = auth.user.id;

    const createdQ = applyFilters(admin.from("letters").select(SELECT_COLUMNS).eq("created_by", userId), filters);
    const publicQ = applyFilters(
      admin.from("letters").select(SELECT_COLUMNS).eq("confidentiality", "PUBLIC"),
      filters
    );

    const internalQ = myDepartment
      ? applyFilters(
          admin
            .from("letters")
            .select(SELECT_COLUMNS)
            .eq("confidentiality", "INTERNAL")
            .eq("recipient_department", myDepartment),
          filters
        )
      : Promise.resolve({ data: [], error: null } as any);

    const confidentialIdsQ = admin.from("letter_recipients").select("letter_id").eq("user_id", userId).limit(5000);

    const [createdRes, publicRes, internalRes, confidentialIdsRes] = await Promise.all([
      createdQ,
      publicQ,
      internalQ,
      confidentialIdsQ,
    ]);

    const recipientIds = (confidentialIdsRes.data || []).map((x: any) => x.letter_id).filter(Boolean);

    const confidentialRes = recipientIds.length
      ? await applyFilters(
          admin.from("letters").select(SELECT_COLUMNS).in("id", recipientIds).eq("confidentiality", "CONFIDENTIAL"),
          filters
        )
      : { data: [], error: null };

    const maybeError = [
      createdRes.error,
      publicRes.error,
      (internalRes as any)?.error,
      confidentialIdsRes.error,
      (confidentialRes as any)?.error,
    ].find(Boolean) as any;

    if (maybeError) errorMessage = maybeError.message || "Failed to load letters";

    const map = new Map<string, any>();
    for (const list of [createdRes.data || [], publicRes.data || [], (internalRes as any)?.data || [], (confidentialRes as any)?.data || []]) {
      for (const row of list) {
        if (row?.id && !map.has(row.id)) map.set(row.id, row);
      }
    }

    rows = Array.from(map.values())
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
      .slice(0, MAX_ROWS);
  }

  return (
    <div className="w-full min-w-0">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
            UHAS Procurement Directorate
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold">Letters</h1>
          <p className="mt-2 text-sm sm:text-base text-neutral-800">
            Search and manage incoming/outgoing letters.
          </p>
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
          <LettersTable rows={rows as any} />
        )}
      </div>
    </div>
  );
}
