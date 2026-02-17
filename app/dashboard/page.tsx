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
    <div className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70 shadow-sm hover:shadow-md transition">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="mt-3 text-3xl sm:text-4xl font-semibold text-neutral-900">
        {value}
      </p>
      <p className="mt-2 text-sm text-neutral-500">{hint}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await supabaseServer();

  // 🔹 TOTAL
  const { count: total } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true });

  // 🔹 INCOMING
  const { count: incoming } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true })
    .eq("direction", "INCOMING");

  // 🔹 OUTGOING (FIXED)
  const { count: outgoing } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true })
    .eq("direction", "OUTGOING");

  // 🔹 ARCHIVED
  const { count: archived } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true })
    .eq("status", "ARCHIVED");

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            UHAS Procurement Directorate
          </p>

          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            Overview of all recorded letters.
          </p>
        </div>

        <Link
          href="/letters"
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium text-black
           bg-emerald-100 hover:brightness-95 transition"
        >
          View Letters
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Letters"
          value={total ?? 0}
          hint="All incoming and outgoing letters."
        />

        <StatCard
          title="Incoming"
          value={incoming ?? 0}
          hint="Letters received from external bodies."
        />

        <StatCard
          title="Outgoing"
          value={outgoing ?? 0}
          hint="Letters written and sent out."
        />

        <StatCard
          title="Archived"
          value={archived ?? 0}
          hint="Completed letters moved to archive."
        />
      </div>
    </div>
  );
}
