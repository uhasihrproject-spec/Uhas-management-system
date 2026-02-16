import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import UsersAdminClient from "./UsersAdminClient";

export default async function AdminUsersPage() {
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

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, department, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="p-8">
      <Link href="/admin" className="text-sm text-emerald-700 hover:underline">
        ← Back to Admin
      </Link>

      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-neutral-500">
        UHAS Procurement Directorate
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Users & Roles</h1>
      <p className="mt-2 text-sm text-neutral-700">
        Set who is <b>SECRETARY</b>, <b>ADMIN</b>, or <b>STAFF</b>.
      </p>

      {error ? (
        <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
      ) : (
        <div className="mt-6">
          <UsersAdminClient initialUsers={(users ?? []) as any} />
        </div>
      )}
    </div>
  );
}
