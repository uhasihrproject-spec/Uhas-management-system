import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile, listWorkflowSteps } from "@/lib/workflow";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_25px_80px_-35px_rgba(15,23,42,0.4)] backdrop-blur-xl"><h2 className="text-sm font-semibold text-neutral-900">{title}</h2><div className="mt-4">{children}</div></div>;
}

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return <div className="p-8 text-sm text-red-600">Unauthorized.</div>;

  const profile = await getUserProfile(user.id);
  const role = profile?.role ?? null;
  const canManageLetters = ["ADMIN", "SECRETARY"].includes(role || "");

  const { data: letterRows } = await admin.from("letters").select("id, ref_no, subject, status, updated_at, created_at").order("updated_at", { ascending: false }).limit(18);
  const visibleLetters = canManageLetters ? (letterRows || []) : (letterRows || []).slice(0, 12);
  const workflows = await Promise.all(visibleLetters.map(async (letter) => ({ letter, workflow: await listWorkflowSteps(letter.id) })));

  const myTasks = workflows.filter(({ workflow }) => workflow.currentStep?.user_id === user.id || workflow.activeUserIds.includes(user.id));
  const recentlyUpdated = workflows.slice(0, 6);
  const completed = workflows.filter(({ workflow }) => workflow.steps.some((step) => step.user_id === user.id && ["COMPLETED", "DONE"].includes(step.status))).slice(0, 6);
  const overdue = myTasks.filter(({ workflow }) => workflow.currentStep?.created_at && (Date.now() - new Date(workflow.currentStep.created_at).getTime()) > 1000 * 60 * 60 * 24 * 2);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Smart dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-900">Welcome back</h1>
          <p className="mt-2 text-sm text-neutral-600">Personalized tasks, recent workflow changes, and completed assignments are surfaced here automatically.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/letters" className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 ring-1 ring-neutral-200">All letters</Link>
          <Link href="/pipeline" className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white">Open pipeline</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card title="My Tasks"><p className="text-3xl font-semibold text-neutral-900">{myTasks.length}</p><p className="mt-2 text-sm text-neutral-500">Letters waiting on your action.</p></Card>
        <Card title="Overdue"><p className="text-3xl font-semibold text-neutral-900">{overdue.length}</p><p className="mt-2 text-sm text-neutral-500">Tasks older than 48 hours.</p></Card>
        <Card title="Completed"><p className="text-3xl font-semibold text-neutral-900">{completed.length}</p><p className="mt-2 text-sm text-neutral-500">Workflow steps you completed recently.</p></Card>
        <Card title="Role"><p className="text-3xl font-semibold text-neutral-900">{role ?? "STAFF"}</p><p className="mt-2 text-sm text-neutral-500">Permissions and workflow actions adapt to this role.</p></Card>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-3">
        <Card title="My Tasks">
          <div className="space-y-3">{myTasks.length ? myTasks.map(({ letter, workflow }) => <Link key={letter.id} href={`/letters/${letter.id}`} className="block rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/70"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-neutral-900">{letter.ref_no}</p><p className="mt-1 text-xs text-neutral-500">{letter.subject}</p></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900">{workflow.currentStep?.status || "PENDING"}</span></div></Link>) : <p className="text-sm text-neutral-500">No open tasks assigned to you.</p>}</div>
        </Card>
        <Card title="Recently Updated Letters">
          <div className="space-y-3">{recentlyUpdated.map(({ letter, workflow }) => <Link key={letter.id} href={`/letters/${letter.id}`} className="block rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/70"><p className="text-sm font-semibold text-neutral-900">{letter.ref_no}</p><p className="mt-1 text-xs text-neutral-500">{letter.subject}</p><p className="mt-2 text-xs text-neutral-600">Current handler: {workflow.currentStep?.profiles?.full_name || "Not assigned"}</p></Link>)}</div>
        </Card>
        <Card title="Completed Letters">
          <div className="space-y-3">{completed.length ? completed.map(({ letter }) => <Link key={letter.id} href={`/letters/${letter.id}`} className="block rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/70"><p className="text-sm font-semibold text-neutral-900">{letter.ref_no}</p><p className="mt-1 text-xs text-neutral-500">{letter.subject}</p></Link>) : <p className="text-sm text-neutral-500">Completed steps will appear here after you finish them.</p>}</div>
        </Card>
      </div>
    </div>
  );
}
