export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AdminHomePage() {
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

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role, full_name, department")
    .eq("id", auth.user.id)
    .maybeSingle();

  const role = profile?.role ?? null;
  const isAdmin = role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Link href="/letters" className="text-sm text-emerald-700 hover:underline">
          ← Back to Letters
        </Link>

        <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
          <p className="text-sm text-red-700 font-medium">Admin access only.</p>

          {/* ✅ Debug info so you see exactly what Supabase returned */}
          <div className="mt-4 rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/70">
            <p className="text-xs text-neutral-600">Debug</p>
            <p className="mt-2 text-sm text-neutral-800">
              Logged in as: <span className="font-mono">{auth.user.email}</span>
            </p>
            <p className="mt-1 text-sm text-neutral-800">
              User ID: <span className="font-mono">{auth.user.id}</span>
            </p>
            <p className="mt-1 text-sm text-neutral-800">
              Profile role: <span className="font-mono">{String(role)}</span>
            </p>
            <p className="mt-1 text-sm text-neutral-800">
              Profile error: <span className="font-mono">{profileErr?.message ?? "none"}</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}
            </p>
          </div>

          <div className="mt-4 text-sm text-neutral-700">
            Fix: set your role to <span className="font-semibold">ADMIN</span> in <span className="font-mono">public.profiles</span>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
        UHAS Procurement Directorate
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Admin Console</h1>
      <p className="mt-2 text-sm text-neutral-700">
        Manage staff roles and review audit activity.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/users"
          className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70 hover:bg-emerald-50/30 transition"
        >
          <div className="text-sm font-semibold">Users & Roles</div>
          <div className="mt-2 text-sm text-neutral-600">
            Assign ADMIN / SECRETARY / STAFF and set departments.
          </div>
          <div className="mt-4 inline-flex rounded-2xl px-4 py-2 text-sm font-semibold text-black
           bg-emerald-100 hover:brightness-95">
            Open
          </div>
        </Link>

        <Link
          href="/admin/audits"
          className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70 hover:bg-emerald-50/30 transition"
        >
          <div className="text-sm font-semibold">Audit Logs</div>
          <div className="mt-2 text-sm text-neutral-600">
            See who viewed, edited, replaced scans, or downloaded letters.
          </div>
          <div className="mt-4 inline-flex rounded-2xl px-4 py-2 text-sm font-semibold text-black
           bg-emerald-100 hover:brightness-95">
            Open
          </div>
        </Link>
      </div>
    </div>
  );
}
