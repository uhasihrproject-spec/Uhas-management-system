import Link from "next/link";
import { redirect } from "next/navigation";
import NewLetterForm from "./NewLetterForm";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export default async function NewLetterPage() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login");

  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  const canManageLetters = profile?.role === "ADMIN" || profile?.role === "SECRETARY";

  if (!canManageLetters) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/letters" className="text-sm font-medium text-emerald-700 hover:underline">
          ← Back to Letters
        </Link>
        <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
          <h1 className="text-xl font-semibold text-neutral-900">You cannot create letters</h1>
          <p className="mt-2 text-sm text-neutral-700">
            Only administrators and secretaries can open the new-letter form. Staff can still view letters assigned to them and continue workflow steps from the tracker.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          UHAS Procurement Directorate
        </p>
        <h1 className="mt-2 text-2xl font-semibold">New Letter</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Record a letter and upload the scanned document securely.
        </p>
      </div>

      <div className="mt-6">
        <NewLetterForm />
      </div>
    </div>
  );
}
