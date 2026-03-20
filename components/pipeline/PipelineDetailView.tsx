"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { StatusBadge } from "./StatusBadge"
import { passToNext, markDone, reassignStep, cancelPipeline } from "@/lib/pipeline/actions"
import type { Pipeline, LetterSummary, SlimProfile, PipelineStep } from "@/lib/pipeline/types"

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
}

function getDeadlineMeta(assignedAt: string | null | undefined) {
  if (!assignedAt) return null
  const due = new Date(assignedAt).getTime() + 3 * 24 * 60 * 60 * 1000
  const diff = due - Date.now()
  const totalHours = Math.ceil(Math.abs(diff) / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const compact = days > 0 ? `${days}d ${hours}h` : `${hours}h`
  if (diff <= 0) return { tone: "bg-red-50 text-red-700 ring-red-200/70", label: `Overdue by ${compact}` }
  if (diff <= 24 * 60 * 60 * 1000) return { tone: "bg-amber-50 text-amber-700 ring-amber-200/70", label: `${compact} left` }
  return { tone: "bg-emerald-50 text-emerald-700 ring-emerald-200/70", label: `${Math.ceil(diff / (1000 * 60 * 60 * 24))} days left` }
}

const AUDIT_LABEL: Record<string, string> = {
  PIPELINE_CREATED: "Track progress created",
  PIPELINE_STEP_ACTIVATED: "Step activated",
  PIPELINE_STEP_COMPLETED: "Step completed",
  PIPELINE_STEP_REASSIGNED: "Step reassigned",
  PIPELINE_COMPLETED: "Track progress completed",
  PIPELINE_CANCELLED: "Track progress cancelled",
}

function Toast({ msg }: { msg: string }) {
  return <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm text-white shadow-lg">{msg}</div>
}

function CurrentHolder({ pipeline, steps }: { pipeline: Pipeline; steps: PipelineStep[] }) {
  const active = steps.find(step => step.status === "ACTIVE")
  const next = active ? steps.find(step => step.step_order > active.step_order && step.status === "PENDING") : null
  const done = steps.filter(step => step.status === "DONE").length
  const total = steps.length
  const deadline = getDeadlineMeta(active?.assigned_at)

  if (pipeline.status === "COMPLETED") {
    return (
      <section className="rounded-[28px] bg-green-50 px-5 py-5 ring-1 ring-green-200/70 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-800">Current status</p>
        <h2 className="mt-2 text-2xl font-semibold text-green-950">This tracked item is complete.</h2>
        <p className="mt-2 text-sm text-green-800">All {total} steps were finished{pipeline.completed_at ? ` on ${fmtDate(pipeline.completed_at)}` : ""}.</p>
      </section>
    )
  }

  return (
    <section className="rounded-[28px] bg-neutral-900 px-5 py-5 text-white ring-1 ring-neutral-900/80 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">Current holder</p>
      {active ? (
        <>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">{active.assigned_user?.full_name ?? "Unassigned"}</h2>
          <p className="mt-1 text-sm text-neutral-200">{active.title}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">With since</p>
              <p className="mt-1 text-sm text-white">{fmtDateTime(active.assigned_at)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">Progress</p>
              <p className="mt-1 text-sm text-white">{done} of {total} steps done</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">Next</p>
              <p className="mt-1 text-sm text-white">{next?.assigned_user?.full_name ?? (next ? "Choose when moving" : "Final step")}</p>
            </div>
          </div>
          {deadline && <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${deadline.tone}`}>{deadline.label}</span>}
        </>
      ) : <p className="mt-3 text-sm text-neutral-300">No active step found.</p>}
    </section>
  )
}

function StepRow({ step, isLast, isMine, nextPendingStep, canManage, allUsers, pipelineId, onToast }: { step: PipelineStep; isLast: boolean; isMine: boolean; nextPendingStep: PipelineStep | null; canManage: boolean; allUsers: SlimProfile[]; pipelineId: string; onToast: (msg: string) => void }) {
  const canAct = isMine || canManage
  const [open, setOpen] = useState(step.status === "ACTIVE")
  const [showAction, setShowAction] = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const [remarks, setRemarks] = useState("")
  const [reassignId, setReassignId] = useState("")
  const [nextUserId, setNextUserId] = useState("")
  const [actionMode, setActionMode] = useState<"move" | "done">("move")
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deadline = step.status === "ACTIVE" ? getDeadlineMeta(step.assigned_at) : null

  const summaryTone = step.status === "DONE"
    ? "bg-green-50 border-green-200"
    : step.status === "ACTIVE"
      ? "bg-white border-neutral-900"
      : "bg-white border-neutral-200"

  const handleAction = () => {
    setErr(null)
    startTransition(async () => {
      const res = actionMode === "move"
        ? await passToNext({ pipeline_id: pipelineId, step_id: step.id, remarks: remarks || undefined, next_user_id: nextPendingStep?.assigned_user_id ? undefined : nextUserId || undefined })
        : await markDone({ pipeline_id: pipelineId, step_id: step.id, remarks: remarks || undefined })
      if (!res.ok) {
        setErr(res.error)
        return
      }
      setShowAction(false)
      setRemarks("")
      setNextUserId("")
      const nextUserName = actionMode === "move" && res.data && "next_user_name" in res.data ? res.data.next_user_name : null
      onToast(actionMode === "move" ? (nextUserName ? `Done. Moved from ${step.assigned_user?.full_name ?? "current user"} to ${nextUserName}.` : "Done. Moved to the next person.") : "Marked as done.")
    })
  }

  const handleReassign = () => {
    if (!reassignId) return
    setErr(null)
    startTransition(async () => {
      const res = await reassignStep({ pipeline_id: pipelineId, step_id: step.id, new_user_id: reassignId })
      if (!res.ok) {
        setErr(res.error)
        return
      }
      setShowReassign(false)
      setReassignId("")
      onToast("Step reassigned.")
    })
  }

  return (
    <div className="relative pl-6" id={`step-${step.id}`}>
      {!isLast && <div className="absolute left-[11px] top-10 h-[calc(100%-1.5rem)] w-px bg-neutral-200" />}
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className={`relative flex w-full items-start gap-3 rounded-3xl border px-4 py-4 text-left transition hover:border-neutral-300 ${summaryTone}`}
      >
        <div className={`mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[11px] font-bold ${step.status === "DONE" ? "border-green-500 bg-green-500 text-white" : step.status === "ACTIVE" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-500"}`}>{step.status === "DONE" ? "✓" : step.step_order}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900">{step.title}</span>
            <StatusBadge status={step.status} />
            {isMine && step.status === "ACTIVE" && <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white">Your turn</span>}
            {deadline && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${deadline.tone}`}>{deadline.label}</span>}
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            {step.status === "ACTIVE"
              ? `Now with ${step.assigned_user?.full_name ?? "Unassigned"} since ${fmtDateTime(step.assigned_at)}`
              : step.status === "DONE"
                ? `Done by ${step.completed_by_user?.full_name ?? step.assigned_user?.full_name ?? "—"} on ${fmtDateTime(step.completed_at)}`
                : `Waiting for ${step.assigned_user?.full_name ?? "someone to be selected"}`}
          </p>
          {step.status === "DONE" && nextPendingStep && (
            <p className="mt-1 text-xs text-neutral-500">Goes from {step.assigned_user?.full_name ?? "this person"} to {nextPendingStep.assigned_user?.full_name ?? "the next person you choose"}.</p>
          )}
        </div>
        <span className="pt-1 text-xs font-medium text-neutral-400">{open ? "Hide" : "Tap to view"}</span>
      </button>

      {open && (
        <div className="ml-3 mt-3 rounded-3xl bg-neutral-50 px-4 py-4 ring-1 ring-neutral-200/70 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Assigned to</p>
              <p className="mt-1 text-sm text-neutral-900">{step.assigned_user?.full_name ?? "Unassigned"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Received</p>
              <p className="mt-1 text-sm text-neutral-900">{fmtDateTime(step.assigned_at)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Completed</p>
              <p className="mt-1 text-sm text-neutral-900">{fmtDateTime(step.completed_at)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Next step</p>
              <p className="mt-1 text-sm text-neutral-900">{nextPendingStep ? `${nextPendingStep.title} · ${nextPendingStep.assigned_user?.full_name ?? "Choose when moving"}` : "No next step yet"}</p>
            </div>
          </div>

          {step.action_note && <p className="mt-4 text-sm text-neutral-600"><span className="font-medium text-neutral-900">Note:</span> {step.action_note}</p>}
          {step.remarks && <p className="mt-2 text-sm text-neutral-600"><span className="font-medium text-neutral-900">Remark:</span> {step.remarks}</p>}
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          {step.status === "ACTIVE" && !canAct && <p className="mt-3 text-sm text-neutral-500">Only {step.assigned_user?.full_name ?? "the current holder"} can move or mark this step as done.</p>}

          {step.status === "ACTIVE" && canAct && !showAction && !showReassign && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => { setActionMode("move"); setShowAction(true) }} className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700">Move to next person</button>
              <button onClick={() => { setActionMode("done"); setShowAction(true) }} className="rounded-2xl bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800">Mark as done</button>
            </div>
          )}

          {showAction && (
            <div className="mt-4 max-w-xl rounded-3xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-semibold text-neutral-900">{actionMode === "move" ? "Move to next person" : "Mark as done"}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {actionMode === "move"
                  ? `This will mark ${step.assigned_user?.full_name ?? "this person"} as done and move the file forward.`
                  : "This will finish this active step and complete the tracking process."}
              </p>
              {actionMode === "move" && (!nextPendingStep || !nextPendingStep.assigned_user_id) && (
                <div className="mt-3">
                  <label className="mb-2 block text-xs font-medium text-neutral-500">Choose who should receive it next</label>
                  <select value={nextUserId} onChange={e => setNextUserId(e.target.value)} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-200">
                    <option value="">Select a person…</option>
                    {allUsers.map(user => <option key={user.id} value={user.id}>{user.full_name}{user.department ? ` — ${user.department}` : ""}</option>)}
                  </select>
                </div>
              )}
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="mt-3 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-200" placeholder="Optional note…" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={handleAction} disabled={isPending || (actionMode === "move" && !nextPendingStep?.assigned_user_id && !nextUserId)} className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50">{isPending ? "Processing…" : "Confirm"}</button>
                <button onClick={() => { setShowAction(false); setRemarks(""); setErr(null); setNextUserId("") }} className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50">Cancel</button>
              </div>
            </div>
          )}

          {canManage && step.status !== "DONE" && !showAction && !showReassign && (
            <button onClick={() => setShowReassign(true)} className="mt-4 text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-700">Reassign this step</button>
          )}

          {showReassign && (
            <div className="mt-4 max-w-xl rounded-3xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-semibold text-neutral-900">Reassign this step</p>
              <select value={reassignId} onChange={e => setReassignId(e.target.value)} className="mt-3 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-200">
                <option value="">Select a person…</option>
                {allUsers.map(user => <option key={user.id} value={user.id}>{user.full_name}{user.department ? ` — ${user.department}` : ""}</option>)}
              </select>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={handleReassign} disabled={!reassignId || isPending} className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50">{isPending ? "Saving…" : "Confirm"}</button>
                <button onClick={() => { setShowReassign(false); setReassignId(""); setErr(null) }} className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AuditLog({ entries }: { entries: any[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-neutral-200/70">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-neutral-50 sm:px-6">
        <span className="text-sm font-semibold text-neutral-900">Activity log</span>
        <span className="text-xs text-neutral-400">{entries.length} events</span>
      </button>
      {open && (
        <div className="border-t border-neutral-100 px-5 sm:px-6">
          {entries.length === 0 ? <p className="py-6 text-center text-sm text-neutral-400">No activity yet.</p> : entries.map((entry: any, index: number) => (
            <div key={entry.id ?? index} className="flex gap-3 border-b border-neutral-100 py-3 last:border-0">
              <span className="h-fit rounded-lg bg-neutral-900 px-2 py-1 text-[10px] font-medium text-white">{AUDIT_LABEL[entry.action] ?? entry.action}</span>
              <div className="min-w-0">
                {entry.meta?.step_title && <p className="text-xs font-medium text-neutral-800">{entry.meta.step_title}</p>}
                {entry.meta?.remarks && <p className="mt-1 text-xs italic text-neutral-500">{entry.meta.remarks}</p>}
                <p className="mt-1 text-xs text-neutral-400">By <span className="font-medium text-neutral-600">{entry.actor?.full_name ?? "—"}</span> · {fmtDateTime(entry.created_st)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export interface PipelineDetailViewProps {
  pipeline: Pipeline | null
  letter: LetterSummary
  currentUser: SlimProfile
  auditLog: any[]
  allUsers: SlimProfile[]
}

export function PipelineDetailView({ pipeline, letter, currentUser, auditLog, allUsers }: PipelineDetailViewProps) {
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const canManage = currentUser.role === "ADMIN" || currentUser.role === "SECRETARY"
  const steps = pipeline?.steps ?? []
  const activeStep = useMemo(() => steps.find(step => step.status === "ACTIVE") ?? null, [steps])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      {toast && <Toast msg={toast} />}

      <p className="mb-5 text-xs text-neutral-400">
        <Link href="/pipeline" className="transition-colors hover:text-neutral-700">Track Progress</Link> / <span className="text-neutral-600">{letter.ref_no}</span>
      </p>

      <section className="rounded-[28px] bg-white px-5 py-5 ring-1 ring-neutral-200/70 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span className="font-mono">{letter.ref_no}</span>
              {letter.file_name && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">{letter.file_name}</span>}
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-neutral-900">{letter.subject}</h1>
            <p className="mt-2 text-sm text-neutral-500">From {letter.sender_name}{letter.recipient_department ? ` · ${letter.recipient_department}` : ""} · Received {fmtDate(letter.date_received)}</p>
            {activeStep && <p className="mt-3 text-sm font-medium text-neutral-800">Right now this file is with {activeStep.assigned_user?.full_name ?? "Unassigned"}.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={letter.status} size="md" />
            <StatusBadge status={letter.confidentiality} size="md" />
          </div>
        </div>
      </section>

      <div className="mt-5 space-y-5">
        {pipeline ? <CurrentHolder pipeline={pipeline} steps={steps} /> : null}

        {!pipeline && (
          <div className="rounded-[28px] bg-white px-6 py-10 text-center ring-1 ring-neutral-200/70">
            <p className="text-sm font-semibold text-neutral-900">No track progress yet</p>
            <p className="mt-2 text-sm text-neutral-500">This letter has not been added to a tracking workflow.</p>
            {canManage && <Link href={`/pipeline/new?letter=${letter.id}`} className="mt-5 inline-flex items-center rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700">Create track progress</Link>}
          </div>
        )}

        {pipeline && (
          <section className="rounded-[28px] bg-white px-5 py-5 ring-1 ring-neutral-200/70 sm:px-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Steps</p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-900">Tap a step to view details</h2>
              <p className="mt-1 text-sm text-neutral-500">The page stays simple first. Open only the step you want to read or act on.</p>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <StepRow
                  key={step.id}
                  step={step}
                  isLast={index === steps.length - 1}
                  isMine={step.assigned_user_id === currentUser.id}
                  nextPendingStep={steps.find(candidate => candidate.step_order > step.step_order && candidate.status === "PENDING") ?? null}
                  canManage={canManage}
                  allUsers={allUsers}
                  pipelineId={pipeline.id}
                  onToast={showToast}
                />
              ))}
            </div>

            {canManage && pipeline.status === "IN_PROGRESS" && (
              <div className="mt-5 border-t border-neutral-100 pt-4">
                <div className="flex flex-wrap gap-4">
                  <Link href={`/pipeline/new?letter=${letter.id}`} className="text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-700">Edit track progress</Link>
                  <button onClick={async () => {
                    if (!confirm("Cancel this track progress workflow? This cannot be undone.")) return
                    const res = await cancelPipeline(pipeline.id)
                    showToast(res.ok ? "Track progress cancelled." : res.error)
                  }} className="text-xs text-red-400 underline underline-offset-2 hover:text-red-600">Cancel track progress</button>
                </div>
              </div>
            )}
          </section>
        )}

        <AuditLog entries={auditLog} />
      </div>
    </div>
  )
}
