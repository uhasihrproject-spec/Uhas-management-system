import Link from "next/link";
import LettersTable from "./LettersTable";
import { supabaseServer } from "@/lib/supabase/server";

type SearchParams = {
  q?: string;
  direction?: "INCOMING" | "OUTGOING";
  status?: "RECEIVED" | "SCANNED" | "ASSIGNED" | "ARCHIVED";
  conf?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";
};

export default async function LettersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const sp = await Promise.resolve(searchParams);

  const supabase = await supabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  let role: string | null = null;

  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();

    role = profile?.role ?? null;
  }

  const canWrite = role === "ADMIN" || role === "SECRETARY";

  const q = (sp.q || "").trim();
  const direction = sp.direction || "";
  const status = sp.status || "";
  const conf = sp.conf || "";

  let query = supabase
    .from("letters")
    .select(
      "id,ref_no,direction,date_received,sender_name,recipient_department,subject,status,confidentiality,created_at,file_path,file_name,mime_type",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (direction) query = query.eq("direction", direction);
  if (status) query = query.eq("status", status);
  if (conf) query = query.eq("confidentiality", conf);

  if (q) {
    query = query.or(
      `ref_no.ilike.%${q}%,sender_name.ilike.%${q}%,subject.ilike.%${q}%,recipient_department.ilike.%${q}%`
    );
  }

  const { data, error } = await query;

  return (
    // No mx-auto/max-w here (AppShell already handles it)
    <div className="px-4 sm:px-6 lg:px-8 2xl:px-10 py-6 sm:py-8 2xl:py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            UHAS Procurement Directorate
          </p>

          <h1 className="mt-2 text-2xl sm:text-3xl 2xl:text-4xl font-semibold">
            Letters
          </h1>

          <p className="mt-2 text-sm sm:text-base 2xl:text-lg text-neutral-600">
            Search and manage incoming/outgoing letters.
          </p>
        </div>

        {canWrite ? (
          <Link
            href="/letters/new"
            className="inline-flex w-full md:w-auto items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-amber-500 hover:brightness-95"
          >
            + New Letter
          </Link>
        ) : null}
      </div>

      {/* Content */}
      <div className="mt-6 sm:mt-7">
        {error ? (
          <div className="rounded-3xl bg-white p-5 sm:p-6 ring-1 ring-red-200/70">
            <p className="text-sm text-red-600">{error.message}</p>
            <p className="mt-2 text-xs sm:text-sm text-neutral-500">
              If this is an RLS issue, ensure you’re logged in and have read access.
            </p>
          </div>
        ) : (
          <LettersTable rows={(data ?? []) as any} />
        )}
      </div>
    </div>
  );
}
