"use client"
// components/pipeline/PipelineDetailView.tsx

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { WorkReminder }  from "./WorkReminder"
import { StatusBadge }   from "./StatusBadge"
import { passToNext, markDone, reassignStep, cancelPipeline } from "@/lib/pipeline/actions"
import type { Pipeline, LetterSummary, SlimProfile, PipelineStep } from "@/lib/pipeline/types"

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

const AUDIT_LABEL: Record<string, string> = {
  PIPELINE_CREATED:         "Pipeline created",
  PIPELINE_STEP_ACTIVATED:  "Step activated",
  PIPELINE_STEP_COMPLETED:  "Step completed",
  PIPELINE_STEP_REASSIGNED: "Step reassigned",
  PIPELINE_COMPLETED:       "Pipeline completed",
  PIPELINE_CANCELLED:       "Pipeline cancelled",
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-neutral-900
      px-5 py-3 text-sm text-white shadow-lg animate-in slide-in-from-top-4 duration-300">
      {msg}
    </div>
  )
}

// ── "Currently with" banner ────────────────────────────────────────────────
// The first thing anyone sees — plain English, no jargon

function CurrentHolder({ pipeline, steps }: { pipeline: Pipeline; steps: PipelineStep[] }) {
  const active = steps.find(s => s.status === "ACTIVE")
  const done   = steps.filter(s => s.status === "DONE").length
  const total  = steps.length
  const pct    = total ? Math.round((done / total) * 100) : 0

  if (pipeline.status === "COMPLETED") {
    return (
      <div className="rounded-3xl bg-green-50 ring-1 ring-green-200/70 px-6 py-5">
        <p className="text-sm font-semibold text-green-900">This letter has been fully processed.</p>
        <p className="mt-0.5 text-sm text-green-700">
          All {total} steps were completed
          {pipeline.completed_at ? ` on ${fmtDate(pipeline.completed_at)}` : ""}.
        </p>
      </div>
    )
  }

  const next = active
    ? steps.find(s => s.step_order > active.step_order && s.status === "PENDING")
    : null

  return (
    <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 px-6 py-5">
      {active ? (
        <>
          <p className="text-sm text-neutral-500">
            This letter is currently with
          </p>
          <p className="mt-1 text-xl font-semibold text-neutral-900">
            {active.assigned_user?.full_name ?? "—"}
          </p>
          <p className="mt-0.5 text-sm text-neutral-500">
            {active.assigned_user?.department
              ? `${active.assigned_user.department} · `
              : ""}
            {active.title}
            {active.assigned_at ? ` · since ${fmtDate(active.assigned_at)}` : ""}
          </p>
          {next && (
            <p className="mt-3 text-xs text-neutral-400">
              After this, it goes to{" "}
              <span className="font-medium text-neutral-600">{next.assigned_user?.full_name ?? "—"}</span>
              {" "}({next.title})
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-neutral-500">No active step found.</p>
      )}

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-neutral-400 mb-1.5">
          <span>{done} of {total} steps done</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div className="h-full rounded-full bg-yellow-400 transition-all duration-500"
            style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

// ── Step row ───────────────────────────────────────────────────────────────

function StepRow({
  step, isLast, isMine, isLastStep, canManage, allUsers, pipelineId, onToast,
}: {
  step: PipelineStep; isLast: boolean; isMine: boolean; isLastStep: boolean
  canManage: boolean; allUsers: SlimProfile[]; pipelineId: string
  onToast: (msg: string) => void
}) {
  const [showAction, setShowAction]     = useState(false)
  const [showPass, setShowPass]         = useState(false)    // pass to any user
  const [showReassign, setShowReassign] = useState(false)    // admin reassign
  const [remarks, setRemarks]           = useState("")
  const [passUserId, setPassUserId]     = useState("")
  const [passSearch, setPassSearch]     = useState("")
  const [reassignId, setReassignId]     = useState("")
  const [err, setErr]                   = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  // Filter users for pass-to search
  const filteredUsers = useMemo(() => {
    const q = passSearch.toLowerCase().trim()
    if (!q) return allUsers
    return allUsers.filter(u =>
      u.full_name.toLowerCase().includes(q) ||
      (u.department ?? "").toLowerCase().includes(q)
    )
  }, [allUsers, passSearch])

  const handlePassToNext = () => {
    setErr(null)
    startTransition(async () => {
      const fn = isLastStep ? markDone : passToNext
      const res = await fn({ pipeline_id: pipelineId, step_id: step.id, remarks: remarks || undefined })
      if (!res.ok) { setErr(res.error); return }
      setShowAction(false); setRemarks("")
      onToast(isLastStep
        ? "All done — letter marked as Completed."
        : ("next_user_name" in res.data && res.data.next_user_name)
          ? `Passed to ${res.data.next_user_name}.`
          : "Passed to next person.")
    })
  }

  // Pass to a specific user (overrides pipeline order)
  const handlePassToUser = () => {
    if (!passUserId) return
    setErr(null)
    startTransition(async () => {
      // Reassign the NEXT pending step to this user, then complete current step
      const nextStep = step // we reassign the active step to the chosen user first
      const res = await reassignStep({
        pipeline_id: pipelineId, step_id: step.id,
        new_user_id: passUserId, note: remarks || undefined,
      })
      if (!res.ok) { setErr(res.error); return }
      // Now mark current step done so it activates next
      const passRes = await passToNext({ pipeline_id: pipelineId, step_id: step.id, remarks: remarks || undefined })
      // Even if passRes fails (e.g. final step) just show toast
      setShowPass(false); setPassUserId(""); setPassSearch(""); setRemarks("")
      const userName = allUsers.find(u => u.id === passUserId)?.full_name ?? "that person"
      onToast(`Letter passed to ${userName}.`)
    })
  }

  const handleReassign = () => {
    if (!reassignId) return; setErr(null)
    startTransition(async () => {
      const res = await reassignStep({ pipeline_id: pipelineId, step_id: step.id, new_user_id: reassignId })
      if (!res.ok) { setErr(res.error); return }
      setShowReassign(false); setReassignId("")
      onToast("Step reassigned.")
    })
  }

  const nodeCls =
    step.status === "DONE"   ? "bg-green-50  border-green-300  text-green-700"  :
    step.status === "ACTIVE" ? "bg-yellow-50 border-yellow-300 text-yellow-800" :
                               "bg-neutral-100 border-neutral-200 text-neutral-400"
  const lineCls = step.status === "DONE" ? "bg-green-200" : "bg-neutral-200"

  return (
    <div id={`step-${step.id}`} className="flex gap-0 relative">
      {!isLast && <div className={`absolute left-[15px] top-9 bottom-0 w-0.5 ${lineCls} z-0`} />}

      {/* Circle node */}
      <div className={`relative z-10 mt-0.5 flex h-8 w-8 flex-shrink-0 items-center
        justify-center rounded-full border-2 text-xs font-bold ${nodeCls}`}>
        {step.status === "DONE" ? (
          <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none">
            <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : step.step_order}
      </div>

      {/* Content */}
      <div className={`ml-4 flex-1 ${!isLast ? "pb-6" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">{step.title}</span>
          <StatusBadge status={step.status} />
          {isMine && step.status === "ACTIVE" && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">
              Your turn
            </span>
          )}
        </div>

        {step.action_note && <p className="mt-0.5 text-xs text-neutral-500">{step.action_note}</p>}

        <div className="mt-1.5 text-xs text-neutral-500">
          {step.assigned_user?.full_name ?? "Unassigned"}
          {step.assigned_department ? <span className="text-neutral-400"> · {step.assigned_department}</span> : null}
          {step.completed_at
            ? <span className="text-neutral-400"> · Done {fmtDateTime(step.completed_at)}</span>
            : step.assigned_at && step.status === "ACTIVE"
              ? <span className="text-neutral-400"> · Since {fmtDate(step.assigned_at)}</span>
              : null}
        </div>

        {step.remarks && (
          <p className="mt-1.5 border-l-2 border-neutral-200 pl-3 text-xs italic text-neutral-500">{step.remarks}</p>
        )}

        {err && <p className="mt-1.5 text-xs text-red-600">{err}</p>}

        {/* ── Actions: only when it's mine and active ── */}
        {isMine && step.status === "ACTIVE" && !showAction && !showPass && !showReassign && (
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Pass to next in pipeline */}
            <button onClick={() => setShowAction(true)}
              className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium
                text-white btn-brand transition-colors
                ${isLastStep ? "bg-green-700 hover:bg-green-800" : ""}`}>
              {isLastStep ? "Mark as done" : "Pass to next"}
            </button>
            {/* Pass to a different user */}
            <button onClick={() => setShowPass(true)}
              className="inline-flex items-center rounded-2xl border border-neutral-200 px-4 py-2
                text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
              Pass to someone else
            </button>
          </div>
        )}

        {/* Confirm pass to next */}
        {showAction && (
          <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 max-w-sm">
            <p className="text-xs text-neutral-600 mb-2">
              {isLastStep
                ? "This is the last step. The letter will be marked as completed."
                : "The letter will move to the next person after you confirm."}
            </p>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
              rows={2} placeholder="Add a note (optional)…" disabled={isPending}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs
                text-neutral-800 placeholder:text-neutral-300 focus:outline-none
                focus:ring-1 focus:ring-neutral-300 resize-none" />
            <div className="mt-2.5 flex gap-2">
              <button onClick={handlePassToNext} disabled={isPending}
                className="rounded-2xl px-4 py-2 text-sm font-medium text-white btn-brand
                  disabled:opacity-50 transition-colors">
                {isPending ? "Processing…" : "Confirm"}
              </button>
              <button onClick={() => { setShowAction(false); setRemarks(""); setErr(null) }}
                disabled={isPending}
                className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm text-neutral-500
                  hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Pass to a specific person */}
        {showPass && (
          <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 max-w-sm">
            <p className="text-xs font-medium text-neutral-700 mb-3">
              Who should receive this letter?
            </p>
            {/* Search */}
            <input type="text" value={passSearch}
              onChange={e => setPassSearch(e.target.value)}
              placeholder="Search by name or department…"
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs
                text-neutral-800 placeholder:text-neutral-300 focus:outline-none
                focus:ring-1 focus:ring-neutral-300 mb-2"
            />
            {/* User list */}
            <div className="max-h-40 overflow-y-auto rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
              {filteredUsers.length === 0 ? (
                <p className="px-3 py-3 text-xs text-neutral-400 text-center">No users found.</p>
              ) : filteredUsers.map(u => (
                <button key={u.id}
                  onClick={() => setPassUserId(u.id)}
                  className={`w-full text-left px-3 py-2.5 text-xs transition-colors
                    ${passUserId === u.id
                      ? "bg-neutral-900 text-white"
                      : "hover:bg-neutral-50 text-neutral-800"}`}>
                  <span className="font-medium">{u.full_name}</span>
                  {u.department && <span className={`ml-1.5 ${passUserId === u.id ? "text-neutral-300" : "text-neutral-400"}`}>· {u.department}</span>}
                </button>
              ))}
            </div>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
              rows={2} placeholder="Add a note (optional)…" disabled={isPending}
              className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs
                text-neutral-800 placeholder:text-neutral-300 focus:outline-none
                focus:ring-1 focus:ring-neutral-300 resize-none" />
            <div className="mt-2.5 flex gap-2">
              <button onClick={handlePassToUser} disabled={!passUserId || isPending}
                className="rounded-2xl px-4 py-2 text-sm font-medium text-white btn-brand
                  disabled:opacity-50 transition-colors">
                {isPending ? "Passing…" : "Pass letter"}
              </button>
              <button onClick={() => { setShowPass(false); setPassUserId(""); setPassSearch(""); setRemarks(""); setErr(null) }}
                disabled={isPending}
                className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm text-neutral-500
                  hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
            </div>
            {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          </div>
        )}

        {/* Admin/Secretary: reassign */}
        {canManage && step.status !== "DONE" && !showReassign && !showAction && !showPass && (
          <button onClick={() => setShowReassign(true)}
            className="mt-2 text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-700">
            Reassign this step
          </button>
        )}

        {showReassign && (
          <div className="mt-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 max-w-sm">
            <p className="text-xs font-medium text-neutral-700 mb-2">Reassign to:</p>
            <select value={reassignId} onChange={e => setReassignId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs
                text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-300">
              <option value="">Select a person…</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name}{u.department ? ` — ${u.department}` : ""}
                </option>
              ))}
            </select>
            <div className="mt-2.5 flex gap-2">
              <button onClick={handleReassign} disabled={!reassignId || isPending}
                className="rounded-2xl px-4 py-2 text-sm font-medium text-white btn-brand
                  disabled:opacity-50 transition-colors">
                {isPending ? "Saving…" : "Confirm"}
              </button>
              <button onClick={() => { setShowReassign(false); setReassignId(""); setErr(null) }}
                className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm text-neutral-500
                  hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
            </div>
            {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Audit log (collapsed) ──────────────────────────────────────────────────

function AuditLog({ entries }: { entries: any[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-neutral-50 transition-colors">
        <span className="text-sm font-semibold text-neutral-900">Activity log</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">{entries.length} events</span>
          <svg viewBox="0 0 14 14" className={`h-4 w-4 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none">
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      {open && (
        <div className="border-t border-neutral-100 px-6">
          {entries.length === 0
            ? <p className="py-6 text-center text-sm text-neutral-400">No activity yet.</p>
            : entries.map((e: any, i: number) => (
              <div key={e.id ?? i} className="flex gap-3 py-3 border-b border-neutral-100 last:border-0">
                <span className="mt-0.5 flex-shrink-0 rounded-lg bg-neutral-900 px-2 py-1
                  text-[10px] font-medium text-white h-fit whitespace-nowrap">
                  {AUDIT_LABEL[e.action] ?? e.action}
                </span>
                <div className="min-w-0">
                  {e.meta?.step_title && <p className="text-xs font-medium text-neutral-800 truncate">{e.meta.step_title}</p>}
                  {e.meta?.remarks    && <p className="text-xs italic text-neutral-500 mt-0.5">{e.meta.remarks}</p>}
                  <p className="text-xs text-neutral-400 mt-0.5">
                    By <span className="font-medium text-neutral-600">{e.actor?.full_name ?? "—"}</span>
                    {" · "}{fmtDateTime(e.created_st)}
                  </p>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ── Main view ──────────────────────────────────────────────────────────────

export interface PipelineDetailViewProps {
  pipeline:    Pipeline | null
  letter:      LetterSummary
  currentUser: SlimProfile
  auditLog:    any[]
  allUsers:    SlimProfile[]
}

export function PipelineDetailView({ pipeline, letter, currentUser, auditLog, allUsers }: PipelineDetailViewProps) {
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const canManage = currentUser.role === "ADMIN" || currentUser.role === "SECRETARY"
  const steps     = pipeline?.steps ?? []

  return (
    <div className="w-full min-w-0">
      {toast && <Toast msg={toast} />}
      <WorkReminder pipeline={pipeline} currentUserId={currentUser.id} letterRefNo={letter.ref_no} />

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 pb-16">

        {/* Breadcrumb */}
        <p className="text-xs text-neutral-400 mb-6">
          <Link href="/pipeline" className="hover:text-neutral-700 transition-colors">File Movement</Link>
          {" / "}
          <span className="text-neutral-600">{letter.ref_no}</span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* ── Left column ── */}
          <div className="space-y-4">

            {/* Letter card */}
            <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 px-6 py-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[11px] font-mono text-neutral-400">{letter.ref_no}</p>
                  <h1 className="mt-0.5 text-xl font-semibold text-neutral-900 leading-snug">
                    {letter.subject}
                  </h1>
                  <p className="mt-1 text-sm text-neutral-500">
                    From {letter.sender_name}
                    {letter.recipient_department ? ` · ${letter.recipient_department}` : ""}
                    {" · "}Received {fmtDate(letter.date_received)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={letter.status} size="md" />
                  <StatusBadge status={letter.confidentiality} size="md" />
                </div>
              </div>
            </div>

            {/* No pipeline */}
            {!pipeline && (
              <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 px-6 py-10 text-center">
                <p className="text-sm font-semibold text-neutral-900">No pipeline yet</p>
                <p className="mt-1 text-sm text-neutral-500">This letter hasn't been added to a review pipeline.</p>
                {canManage && (
                  <Link href={`/pipeline/new?letter=${letter.id}`}
                    className="mt-5 inline-flex items-center rounded-2xl px-5 py-2.5 text-sm font-medium
                      text-white btn-brand transition-colors">
                    Create pipeline
                  </Link>
                )}
              </div>
            )}

            {/* Steps */}
            {pipeline && (
              <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 px-6 py-5">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-5">Review steps</p>
                <div>
                  {steps.map((step, i) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      isLast={i === steps.length - 1}
                      isMine={step.assigned_user_id === currentUser.id}
                      isLastStep={i === steps.length - 1}
                      canManage={canManage}
                      allUsers={allUsers}
                      pipelineId={pipeline.id}
                      onToast={showToast}
                    />
                  ))}
                </div>

                {canManage && pipeline.status === "IN_PROGRESS" && (
                  <div className="mt-5 pt-4 border-t border-neutral-100 flex gap-4">
                    <Link href={`/pipeline/new?letter=${letter.id}`}
                      className="text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-700">
                      Edit pipeline
                    </Link>
                    <button
                      onClick={async () => {
                        if (!confirm("Cancel this pipeline? This cannot be undone.")) return
                        const res = await cancelPipeline(pipeline.id)
                        showToast(res.ok ? "Pipeline cancelled." : res.error)
                      }}
                      className="text-xs text-red-400 underline underline-offset-2 hover:text-red-600">
                      Cancel pipeline
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Audit log */}
            {pipeline && <AuditLog entries={auditLog} />}
          </div>

          {/* ── Right sidebar: current holder at a glance ── */}
          {pipeline && (
            <div className="lg:sticky lg:top-6">
              <CurrentHolder pipeline={pipeline} steps={steps} />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}