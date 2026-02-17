import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

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
      <p className="mt-2 text-sm text-neutral-500">{hint}</p>
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

export default async function DashboardPage() {
  const supabase = await supabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  let role: "ADMIN" | "SECRETARY" | "STAFF" | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    role = (profile?.role as any) ?? null;
  }

  const { count: total } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true });

  const { count: incoming } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true })
    .eq("direction", "INCOMING");

  const { count: outgoing } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true })
    .eq("direction", "OUTGOING");

  const { count: archived } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true })
    .eq("status", "ARCHIVED");

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
          <p className="mt-2 text-sm text-neutral-600">
            Quick overview of letters and recent activity.
          </p>
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
        <StatCard title="Total Letters" value={total ?? 0} hint="All records in the system." />
        <StatCard title="Incoming" value={incoming ?? 0} hint="Letters received and recorded." />
        <StatCard title="Outgoing" value={outgoing ?? 0} hint="Letters sent out." />
        <StatCard title="Archived" value={archived ?? 0} hint="Completed letters in archive." />
      </div>

      {/* Activity */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
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
