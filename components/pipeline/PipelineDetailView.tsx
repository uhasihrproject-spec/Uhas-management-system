"use client"

import { useState, useTransition } from "react"
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
      <div className="rounded-[28px] bg-green-50 px-6 py-5 ring-1 ring-green-200/70">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-800">Current status</p>
        <p className="mt-2 text-2xl font-semibold text-green-950">This tracked item is complete.</p>
        <p className="mt-2 text-sm text-green-800">All {total} steps were finished{pipeline.completed_at ? ` on ${fmtDate(pipeline.completed_at)}` : ""}.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[28px] bg-neutral-900 px-6 py-6 text-white ring-1 ring-neutral-900/80">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">Current holder</p>
      {active ? (
        <>
          <p className="mt-3 text-sm text-neutral-300">This file is currently with</p>
          <p className="mt-1 text-3xl font-semibold">{active.assigned_user?.full_name ?? "—"}</p>
          <p className="mt-2 text-sm text-neutral-200">{active.title}</p>
          <p className="mt-2 text-sm text-neutral-300">Since {fmtDateTime(active.assigned_at)}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {deadline && <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${deadline.tone}`}>{deadline.label}</span>}
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">{done} of {total} steps done</span>
          </div>
          {next && <p className="mt-4 text-sm text-neutral-300">Next up: <span className="font-medium text-white">{next.assigned_user?.full_name ?? "—"}</span> · {next.title}</p>}
        </>
      ) : <p className="mt-3 text-sm text-neutral-300">No active step found.</p>}
    </div>
  )
}

function StepRow({ step, isLast, isMine, hasNextPendingStep, canManage, allUsers, pipelineId, onToast }: { step: PipelineStep; isLast: boolean; isMine: boolean; hasNextPendingStep: boolean; canManage: boolean; allUsers: SlimProfile[]; pipelineId: string; onToast: (msg: string) => void }) {
  const [showAction, setShowAction] = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const [remarks, setRemarks] = useState("")
  const [reassignId, setReassignId] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deadline = step.status === "ACTIVE" ? getDeadlineMeta(step.assigned_at) : null

  const handlePassToNext = () => {
    setErr(null)
    startTransition(async () => {
      const fn = hasNextPendingStep ? passToNext : markDone
      const res = await fn({ pipeline_id: pipelineId, step_id: step.id, remarks: remarks || undefined })
      if (!res.ok) {
        setErr(res.error)
        return
      }
      setShowAction(false)
      setRemarks("")
      const nextUserName = hasNextPendingStep && res.data && "next_user_name" in res.data ? res.data.next_user_name : null
      onToast(hasNextPendingStep ? (nextUserName ? `Moved to ${nextUserName}.` : "Moved to the next person.") : "Final step completed.")
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

  const nodeCls = step.status === "DONE" ? "bg-green-50 border-green-300 text-green-700" : step.status === "ACTIVE" ? "bg-neutral-900 border-neutral-900 text-white" : "bg-neutral-100 border-neutral-200 text-neutral-400"
  const lineCls = step.status === "DONE" ? "bg-green-200" : "bg-neutral-200"

  return (
    <div className="relative flex gap-0" id={`step-${step.id}`}>
      {!isLast && <div className={`absolute bottom-0 left-[15px] top-9 z-0 w-0.5 ${lineCls}`} />}
      <div className={`relative z-10 mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${nodeCls}`}>{step.status === "DONE" ? "✓" : step.step_order}</div>

      <div className={`ml-4 flex-1 ${!isLast ? "pb-6" : ""}`}>
        <div className="rounded-3xl border border-neutral-200/80 bg-white px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900">{step.title}</span>
                <StatusBadge status={step.status} />
                {isMine && step.status === "ACTIVE" && <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white">Your turn</span>}
                {deadline && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${deadline.tone}`}>{deadline.label}</span>}
              </div>
              {step.action_note && <p className="mt-1 text-sm text-neutral-500">{step.action_note}</p>}
            </div>
            <div className="text-sm text-neutral-500 sm:text-right">
              <p><span className="font-medium text-neutral-700">With:</span> {step.assigned_user?.full_name ?? "Unassigned"}</p>
              <p className="mt-1">{step.assigned_at ? `Received ${fmtDateTime(step.assigned_at)}` : "Not yet assigned"}</p>
              <p className="mt-1">{step.completed_at ? `Completed ${fmtDateTime(step.completed_at)}` : "Not completed yet"}</p>
              {step.completed_by_user?.full_name && <p className="mt-1">By {step.completed_by_user.full_name}</p>}
            </div>
          </div>

          {step.remarks && <p className="mt-3 border-l-2 border-neutral-200 pl-3 text-xs italic text-neutral-500">{step.remarks}</p>}
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

          {isMine && step.status === "ACTIVE" && !showAction && !showReassign && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setShowAction(true)} className={`rounded-2xl px-4 py-2 text-sm font-medium text-white transition ${hasNextPendingStep ? "bg-neutral-900 hover:bg-neutral-700" : "bg-green-700 hover:bg-green-800"}`}>{hasNextPendingStep ? "Move to next person" : "Mark as done"}</button>
            </div>
          )}

          {showAction && (
            <div className="mt-3 max-w-lg rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-neutral-900">Confirm this step</p>
              <p className="mt-1 text-xs text-neutral-500">{hasNextPendingStep ? "This marks your step as done and moves the file to the next person in the chain." : "This finishes the workflow and marks the item completed."}</p>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="mt-3 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-200" placeholder="Optional note…" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={handlePassToNext} disabled={isPending} className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50">{isPending ? "Processing…" : "Confirm"}</button>
                <button onClick={() => { setShowAction(false); setRemarks(""); setErr(null) }} className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 transition hover:bg-white">Cancel</button>
              </div>
            </div>
          )}

          {canManage && step.status !== "DONE" && !showAction && !showReassign && (
            <button onClick={() => setShowReassign(true)} className="mt-3 text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-700">Reassign this step</button>
          )}

          {showReassign && (
            <div className="mt-3 max-w-lg rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-neutral-900">Reassign this step</p>
              <select value={reassignId} onChange={e => setReassignId(e.target.value)} className="mt-3 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-200">
                <option value="">Select a person…</option>
                {allUsers.map(user => <option key={user.id} value={user.id}>{user.full_name}{user.department ? ` — ${user.department}` : ""}</option>)}
              </select>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={handleReassign} disabled={!reassignId || isPending} className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50">{isPending ? "Saving…" : "Confirm"}</button>
                <button onClick={() => { setShowReassign(false); setReassignId(""); setErr(null) }} className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 transition hover:bg-white">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AuditLog({ entries }: { entries: any[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-neutral-200/70">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-neutral-50">
        <span className="text-sm font-semibold text-neutral-900">Activity log</span>
        <span className="text-xs text-neutral-400">{entries.length} events</span>
      </button>
      {open && (
        <div className="border-t border-neutral-100 px-6">
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

  return (
    <div className="w-full min-w-0">
      {toast && <Toast msg={toast} />}

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <p className="mb-6 text-xs text-neutral-400">
          <Link href="/pipeline" className="transition-colors hover:text-neutral-700">Track Progress</Link> / <span className="text-neutral-600">{letter.ref_no}</span>
        </p>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
          <div className="space-y-5">
            <section className="rounded-[28px] bg-white px-6 py-5 ring-1 ring-neutral-200/70">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono text-neutral-500">{letter.ref_no}</span>
                    {letter.file_name && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">{letter.file_name}</span>}
                  </div>
                  <h1 className="mt-2 text-2xl font-semibold text-neutral-900">{letter.subject}</h1>
                  <p className="mt-2 text-sm text-neutral-500">From {letter.sender_name}{letter.recipient_department ? ` · ${letter.recipient_department}` : ""} · Received {fmtDate(letter.date_received)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={letter.status} size="md" />
                  <StatusBadge status={letter.confidentiality} size="md" />
                </div>
              </div>
            </section>

            {pipeline ? <CurrentHolder pipeline={pipeline} steps={steps} /> : null}

            {!pipeline && (
              <div className="rounded-[28px] bg-white px-6 py-10 text-center ring-1 ring-neutral-200/70">
                <p className="text-sm font-semibold text-neutral-900">No track progress yet</p>
                <p className="mt-2 text-sm text-neutral-500">This letter has not been added to a tracking workflow.</p>
                {canManage && <Link href={`/pipeline/new?letter=${letter.id}`} className="mt-5 inline-flex items-center rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700">Create track progress</Link>}
              </div>
            )}

            {pipeline && (
              <section className="rounded-[28px] bg-white px-6 py-5 ring-1 ring-neutral-200/70">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Timeline</p>
                    <h2 className="mt-1 text-lg font-semibold text-neutral-900">Where the file has moved</h2>
                    <p className="mt-1 text-sm text-neutral-500">Each step shows who held the file, when they received it, and whether it has been completed.</p>
                  </div>
                </div>
                {steps.map((step, index) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    isLast={index === steps.length - 1}
                    isMine={step.assigned_user_id === currentUser.id}
                    hasNextPendingStep={steps.some(candidate => candidate.step_order > step.step_order && candidate.status === "PENDING")}
                    canManage={canManage}
                    allUsers={allUsers}
                    pipelineId={pipeline.id}
                    onToast={showToast}
                  />
                ))}

                {canManage && pipeline.status === "IN_PROGRESS" && (
                  <div className="mt-5 flex gap-4 border-t border-neutral-100 pt-4">
                    <Link href={`/pipeline/new?letter=${letter.id}`} className="text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-700">Edit track progress</Link>
                    <button onClick={async () => {
                      if (!confirm("Cancel this track progress workflow? This cannot be undone.")) return
                      const res = await cancelPipeline(pipeline.id)
                      showToast(res.ok ? "Track progress cancelled." : res.error)
                    }} className="text-xs text-red-400 underline underline-offset-2 hover:text-red-600">Cancel track progress</button>
                  </div>
                )}
              </section>
            )}

            {pipeline && <AuditLog entries={auditLog} />}
          </div>

          {pipeline && (
            <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
              <div className="rounded-[28px] bg-white px-6 py-5 ring-1 ring-neutral-200/70">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Quick summary</p>
                <p className="mt-2 text-sm text-neutral-500">Open the timeline to see the full handoff history, notes, and reassignment actions.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
