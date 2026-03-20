import Link from "next/link";
import { CheckCircle2, CircleDashed, Clock3, ArrowRight } from "lucide-react";
import type { WorkflowSummary } from "@/lib/workflow";

function userLabel(step: WorkflowSummary["steps"][number]) {
  return step.profiles?.full_name?.trim() || step.profiles?.department || "Unassigned user";
}

function badge(status: string) {
  if (status === "DONE" || status === "COMPLETED") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (status === "IN_PROGRESS") return "bg-blue-100 text-blue-800 ring-blue-200";
  return "bg-amber-100 text-amber-900 ring-amber-200";
}

export default function WorkflowTimeline({ workflow, letterId, compact = false }: { workflow: WorkflowSummary; letterId?: string; compact?: boolean; }) {
  if (!workflow.tableAvailable) {
    return (
      <div className="rounded-3xl border border-dashed border-neutral-300 bg-white/70 p-5 text-sm text-neutral-600">
        Workflow tracking table is not available yet. Add the <code>letter_workflow_steps</code> table to activate timeline tracking.
      </div>
    );
  }

  if (!workflow.steps.length) {
    return (
      <div className="rounded-3xl border border-dashed border-neutral-300 bg-white/70 p-5 text-sm text-neutral-600">
        No workflow steps have been created for this letter yet.
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-white/60 bg-white/80 shadow-[0_20px_70px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200/70 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Workflow timeline</h3>
          <p className="mt-1 text-xs text-neutral-500">Track handlers, status changes, and the next handoff.</p>
        </div>
        {letterId ? <Link href={`/pipeline?letter=${letterId}`} className="text-xs font-semibold text-emerald-700 hover:underline">Open pipeline</Link> : null}
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        {workflow.steps.map((step, index) => {
          const isDone = step.status === "DONE" || step.status === "COMPLETED";
          const isCurrent = step.status === "IN_PROGRESS";
          return (
            <div key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${isDone ? "bg-emerald-50 text-emerald-600 ring-emerald-200" : isCurrent ? "bg-blue-50 text-blue-600 ring-blue-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : isCurrent ? <Clock3 className="h-5 w-5" /> : <CircleDashed className="h-5 w-5" />}
                </div>
                {index < workflow.steps.length - 1 ? <div className="mt-2 h-full min-h-8 w-px bg-neutral-200" /> : null}
              </div>
              <div className="min-w-0 flex-1 rounded-2xl bg-neutral-50/80 p-4 ring-1 ring-neutral-200/70">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-900">{userLabel(step)}</p>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${badge(step.status)}`}>{step.status.replace("_", " ")}</span>
                  <span className="text-xs text-neutral-500">Step {step.step_order}</span>
                </div>
                {!compact ? (
                  <div className="mt-2 grid gap-2 text-xs text-neutral-600 sm:grid-cols-2">
                    <p>Assigned: {new Date(step.created_at).toLocaleString()}</p>
                    <p>Completed: {step.completed_at ? new Date(step.completed_at).toLocaleString() : "—"}</p>
                  </div>
                ) : null}
                {step.notes ? <p className="mt-2 text-xs text-neutral-600">{step.notes}</p> : null}
              </div>
            </div>
          );
        })}
        {workflow.currentStep ? (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <ArrowRight className="h-4 w-4" />
            Current handler: <span className="font-semibold">{userLabel(workflow.currentStep)}</span>
            {workflow.nextStep ? <span className="text-emerald-700">• Next: {userLabel(workflow.nextStep)}</span> : <span className="text-emerald-700">• Final step pending completion</span>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
