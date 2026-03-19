import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile, listWorkflowSteps } from "@/lib/workflow";
import WorkflowTimeline from "@/components/workflow/WorkflowTimeline";

type SearchParams = { status?: string; assigned?: string; letter?: string };

export default async function PipelinePage({ searchParams }: { searchParams: Promise<SearchParams> | SearchParams }) {
  const sp = await Promise.resolve(searchParams);
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <div className="p-8 text-sm text-red-600">Unauthorized.</div>;

  const me = await getUserProfile(auth.user.id);
  const canManageLetters = ["ADMIN", "SECRETARY"].includes(me?.role || "");

  const { data: letters } = await admin
    .from("letters")
    .select("id, ref_no, subject, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(24);

  const cards = await Promise.all((letters || []).map(async (letter) => ({ letter, workflow: await listWorkflowSteps(letter.id) })));
  const filtered = cards.filter(({ workflow, letter }) => {
    const matchesStatus = sp.status ? workflow.currentStep?.status === sp.status || letter.status === sp.status : true;
    const matchesAssigned = sp.assigned ? workflow.activeUserIds.includes(sp.assigned) : true;
    const matchesLetter = sp.letter ? letter.id === sp.letter : true;
    if (!canManageLetters && !workflow.steps.some((step) => step.user_id === auth.user!.id)) return false;
    return matchesStatus && matchesAssigned && matchesLetter;
  });

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Workflow tracking</p>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-900">Pipeline</h1>
          <p className="mt-2 text-sm text-neutral-600">Kanban-inspired workflow view for passing, tracking, and completing letters.</p>
        </div>
        <Link href="/letters" className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 ring-1 ring-neutral-200">Open letters</Link>
      </div>
      <div className="mt-8 grid gap-5 xl:grid-cols-3">
        {filtered.map(({ letter, workflow }) => (
          <div key={letter.id} className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_25px_80px_-35px_rgba(15,23,42,0.4)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/letters/${letter.id}`} className="text-sm font-semibold text-neutral-900 hover:text-emerald-700">{letter.ref_no}</Link>
                <p className="mt-1 text-sm text-neutral-600">{letter.subject}</p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-700 ring-1 ring-neutral-200">{workflow.currentStep?.status || letter.status}</span>
            </div>
            <div className="mt-4"><WorkflowTimeline workflow={workflow} letterId={letter.id} compact /></div>
          </div>
        ))}
        {!filtered.length ? <div className="rounded-3xl border border-dashed border-neutral-300 bg-white/70 p-8 text-sm text-neutral-600">No workflow cards match the selected filters yet.</div> : null}
      </div>
    </div>
  );
}
