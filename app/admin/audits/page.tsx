export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

type SP = {
  action?: string;
};

export default async function AdminAuditsPage({
  searchParams,
}: {
  searchParams: Promise<SP> | SP;
}) {
  const sp = await Promise.resolve(searchParams);
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <div className="p-8">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
          <p className="text-sm text-red-700">You must be logged in.</p>
        </div>
      </div>
    );
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (me?.role !== "ADMIN") {
    return (
      <div className="p-8">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
          <p className="text-sm text-red-700">Admin access only.</p>
        </div>
      </div>
    );
  }

  let q = supabase
    .from("audit_logs")
    .select("id,created_at,action,user_id,letter_id,meta")
    .order("created_at", { ascending: false })
    .limit(300);

  if (sp.action) q = q.eq("action", sp.action);

  const { data: logs, error } = await q;

  // map user names (optional but useful)
  const userIds = Array.from(new Set((logs ?? []).map((l) => l.user_id).filter(Boolean)));
  const { data: people } = userIds.length
    ? await supabase.from("profiles").select("id,full_name,role").in("id", userIds)
    : { data: [] as any[] };

  const nameMap = new Map((people ?? []).map((p) => [p.id, p]));

  return (
    <div className="p-8">
      <Link href="/admin" className="text-sm text-emerald-700 hover:underline">
        ← Back to Admin
      </Link>

      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-neutral-500">
        UHAS Procurement Directorate
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Audit Logs</h1>
      <p className="mt-2 text-sm text-neutral-700">
        Registry activity: viewed, updated, scan replaced, downloads.
      </p>

      {error ? (
        <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl bg-white ring-1 ring-neutral-200/70 overflow-hidden">
          <div className="p-4 border-b border-neutral-200/70">
            <div className="text-sm text-neutral-600">
              Showing latest <span className="font-medium text-neutral-800">{logs?.length ?? 0}</span> events
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-white sticky top-0">
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200/70">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Letter</th>
                  <th className="py-3 px-4">Meta</th>
                </tr>
              </thead>

              <tbody>
                {(logs ?? []).map((l) => {
                  const u = nameMap.get(l.user_id);
                  return (
                    <tr key={l.id} className="border-b border-neutral-200/60">
                      <td className="py-3 px-4 text-neutral-700">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium">{l.action}</td>
                      <td className="py-3 px-4">
                        <div className="text-neutral-900">{u?.full_name ?? l.user_id}</div>
                        <div className="text-xs text-neutral-500">{u?.role ?? ""}</div>
                      </td>
                      <td className="py-3 px-4">
                        {l.letter_id ? (
                          <Link
                            href={`/letters/${l.letter_id}`}
                            className="text-emerald-700 hover:underline"
                          >
                            Open Letter
                          </Link>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-600">
                        {l.meta ? JSON.stringify(l.meta) : "—"}
                      </td>
                    </tr>
                  );
                })}

                {!logs?.length ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-neutral-500">
                      No audit events yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
