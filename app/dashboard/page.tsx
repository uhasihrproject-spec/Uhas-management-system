import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70 shadow-sm">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="mt-3 text-3xl sm:text-4xl font-semibold text-neutral-900">
        {value}
      </p>
      {hint ? <p className="mt-2 text-sm text-neutral-500">{hint}</p> : null}
    </div>
  );
}

function fmtAction(a: string) {
  if (a === "VIEWED") return "Viewed a letter";
  if (a === "UPDATED") return "Updated a letter";
  if (a === "DOWNLOADED") return "Downloaded a file";
  if (a === "CREATED") return "Created a letter";
  return a;
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function fetchAllRows(admin: ReturnType<typeof supabaseAdmin>, table: string, columns: string, matcher?: [string, string]) {
  const all: any[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    let q = admin.from(table).select(columns).range(from, from + pageSize - 1);
    if (matcher) q = q.eq(matcher[0], matcher[1]);

    const { data, error } = await q;
    if (error || !data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }

  return all;
}

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  let role: "ADMIN" | "SECRETARY" | "STAFF" | null = null;
  let myDepartment: string | null = null;
  let showHints = true;

  if (user) {
    let profile: any = null;
    let profileError: any = null;

    ({ data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role, department, pref_hints")
      .eq("id", user.id)
      .maybeSingle());

    if (profileError && String(profileError.message || "").toLowerCase().includes("column")) {
      ({ data: profile } = await admin
        .from("profiles")
        .select("role, department")
        .eq("id", user.id)
        .maybeSingle());
    }

    role = (profile?.role as any) ?? null;
    myDepartment = profile?.department ?? null;
    showHints = profile?.pref_hints !== false;
  }

  let total = 0;
  let incoming = 0;
  let outgoing = 0;
  let archived = 0;

  if (role === "ADMIN" || role === "SECRETARY") {
    const [{ count: t }, { count: i }, { count: o }, { count: a }] = await Promise.all([
      admin.from("letters").select("id", { count: "exact", head: true }),
      admin.from("letters").select("id", { count: "exact", head: true }).eq("direction", "INCOMING"),
      admin.from("letters").select("id", { count: "exact", head: true }).eq("direction", "OUTGOING"),
      admin.from("letters").select("id", { count: "exact", head: true }).eq("status", "ARCHIVED"),
    ]);

    total = t ?? 0;
    incoming = i ?? 0;
    outgoing = o ?? 0;
    archived = a ?? 0;
  } else if (user) {
    const [letters, recipientRows] = await Promise.all([
      fetchAllRows(
        admin,
        "letters",
        "id,direction,status,confidentiality,recipient_department,created_by"
      ),
      fetchAllRows(admin, "letter_recipients", "letter_id", ["user_id", user.id]),
    ]);

    const recipientIds = new Set((recipientRows ?? []).map((r: any) => r.letter_id));

    for (const row of letters ?? []) {
      const isVisible =
        row.confidentiality === "PUBLIC" ||
        row.created_by === user.id ||
        (row.confidentiality === "INTERNAL" && Boolean(myDepartment) && row.recipient_department === myDepartment) ||
        (row.confidentiality === "CONFIDENTIAL" && recipientIds.has(row.id));

      if (!isVisible) continue;
      total += 1;
      if (row.direction === "INCOMING") incoming += 1;
      if (row.direction === "OUTGOING") outgoing += 1;
      if (row.status === "ARCHIVED") archived += 1;
    }
  }

  // Recent activity
  let auditQuery = supabase
    .from("audit_logs")
    .select("id, created_at, action, letter_id, meta, user_id")
    .order("created_at", { ascending: false })
    .limit(12);

  // If not admin, show only own
  if (role !== "ADMIN" && user) {
    auditQuery = auditQuery.eq("user_id", user.id);
  }

  const { data: audits } = await auditQuery;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            UHAS Procurement Directorate
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold">Dashboard</h1>
          {showHints ? <p className="mt-2 text-sm text-neutral-600">Quick overview of letters and recent activity.</p> : null}
        </div>

        <Link
          href="/letters"
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-black
           bg-emerald-100 hover:brightness-95"
        >
          View Letters
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Letters" value={total ?? 0} hint={showHints ? "All records you can access." : ""} />
        <StatCard title="Incoming" value={incoming ?? 0} hint={showHints ? "Letters received and recorded." : ""} />
        <StatCard title="Outgoing" value={outgoing ?? 0} hint={showHints ? "Letters sent out." : ""} />
        <StatCard title="Archived" value={archived ?? 0} hint={showHints ? "Completed letters in archive." : ""} />
      </div>

      {/* Activity */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="lg:col-span-3 rounded-3xl bg-white ring-1 ring-neutral-200/70 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-neutral-200/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-neutral-900">
                  Recent activity
                </div>
                <div className="mt-1 text-sm text-neutral-600">
                  {role === "ADMIN" ? "Latest actions across the system." : "Your latest actions."}
                </div>
              </div>

              {role === "ADMIN" ? (
                <Link href="/admin/audits" className="text-sm font-semibold text-emerald-700 hover:underline">
                  View all
                </Link>
              ) : null}
            </div>
          </div>

          <div className="divide-y divide-neutral-200/70">
            {(audits ?? []).map((a) => (
              <div key={a.id} className="p-4 sm:p-5 hover:bg-emerald-50/20 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-neutral-900">
                      {fmtAction(a.action)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {a.letter_id ? (
                        <Link href={`/letters/${a.letter_id}`} className="hover:underline">
                          Letter ID: {String(a.letter_id).slice(0, 8)}…
                        </Link>
                      ) : (
                        <span>Letter ID: —</span>
                      )}
                      {a.meta?.file ? <span> • {String(a.meta.file)}</span> : null}
                    </div>
                  </div>

                  <div className="text-xs text-neutral-500 whitespace-nowrap">
                    {a.created_at ? timeAgo(a.created_at) : ""}
                  </div>
                </div>
              </div>
            ))}

            {!audits?.length ? (
              <div className="p-6 text-sm text-neutral-600">
                No recent activity yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
