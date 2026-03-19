import { redirect } from "next/navigation";
import NewLetterForm from "./NewLetterForm";
import { supabaseServer } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/workflow";

export default async function NewLetterPage() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const profile = await getUserProfile(auth.user.id);
  if (!["ADMIN", "SECRETARY"].includes(profile?.role || "")) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-red-700">Only admins and secretaries can create new letters.</p>
          <p className="mt-2 text-sm text-neutral-600">Staff access is blocked on the server and UI for the New Letter page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">UHAS Procurement Directorate</p>
        <h1 className="mt-2 text-2xl font-semibold">New Letter</h1>
        <p className="mt-2 text-sm text-neutral-600">Record a letter, assign the first handler, and start the workflow securely.</p>
      </div>
      <div className="mt-6"><NewLetterForm /></div>
    </div>
  );
}
