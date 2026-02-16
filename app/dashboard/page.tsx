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
    <div className="rounded-3xl bg-white p-5 sm:p-6 ring-1 ring-neutral-200/70">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="mt-2 text-3xl sm:text-4xl font-semibold">{value}</p>
      <p className="mt-2 text-xs sm:text-sm text-neutral-500">{hint}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await supabaseServer();

  const { count: total } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true });

  const { count: incoming } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true })
    .eq("direction", "INCOMING");

  const { count: archived } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true })
    .eq("status", "ARCHIVED");

  return (
    <div className="w-full">
      {/* Page container */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              UHAS Procurement Directorate
            </p>

            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold">
              Dashboard
            </h1>

            <p className="mt-2 text-sm sm:text-base text-neutral-600">
              Quick overview of letters recorded in the system.
            </p>
          </div>

          <Link
            href="/letters"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium btn-brand"
          >
            View Letters
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-7 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <StatCard
            title="Total Letters"
            value={total ?? 0}
            hint="All incoming and outgoing letters stored."
          />
          <StatCard
            title="Incoming"
            value={incoming ?? 0}
            hint="Letters received and recorded by the secretary."
          />
          <StatCard
            title="Archived"
            value={archived ?? 0}
            hint="Completed/old letters moved to archive."
          />
        </div>

      </div>
    </div>
  );
}
