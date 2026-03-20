"use client"
// components/pipeline/StepCard.tsx

import { useState, useTransition }        from "react"
import { StatusBadge }                    from "./StatusBadge"
import { passToNext, markDone, reassignStep } from "@/lib/pipeline/actions"
import type { PipelineStep, SlimProfile } from "@/lib/pipeline/types"

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  )
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  step:       PipelineStep
  isLast:     boolean   // last in the rendered list (controls connector line)
  isMine:     boolean   // current user is the assigned holder of this step
  isLastStep: boolean   // there is no later pending step, so this action should finish the workflow
  canManage:  boolean   // ADMIN or SECRETARY
  allUsers:   SlimProfile[]
  pipelineId: string
  onToast:    (msg: string) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export function StepCard({
  step, isLast, isMine, isLastStep, canManage, allUsers, pipelineId, onToast,
}: Props) {
  const [showAction, setShowAction]   = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const [remarks, setRemarks]           = useState("")
  const [newUserId, setNewUserId]       = useState("")
  const [fieldError, setFieldError]     = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  // ── Pass to next ──────────────────────────────────────────────────────────
  const handlePass = () => {
    setFieldError(null)
    startTransition(async () => {
      const res = await passToNext({
        pipeline_id: pipelineId,
        step_id:     step.id,
        remarks:     remarks || undefined,
      })
      if (!res.ok) { setFieldError(res.error); return }
      setShowAction(false)
      setRemarks("")
      onToast(
        res.data.next_user_name
          ? `Passed to ${res.data.next_user_name}.`
          : "File passed to the next handler."
      )
    })
  }

  // ── Mark as done (final step) ─────────────────────────────────────────────
  const handleMarkDone = () => {
    setFieldError(null)
    startTransition(async () => {
      const res = await markDone({
        pipeline_id: pipelineId,
        step_id:     step.id,
        remarks:     remarks || undefined,
      })
      if (!res.ok) { setFieldError(res.error); return }
      setShowAction(false)
      setRemarks("")
      onToast("All steps completed. Letter marked as Completed.")
    })
  }

  // ── Reassign ──────────────────────────────────────────────────────────────
  const handleReassign = () => {
    if (!newUserId) return
    setFieldError(null)
    startTransition(async () => {
      const res = await reassignStep({
        pipeline_id: pipelineId,
        step_id:     step.id,
        new_user_id: newUserId,
      })
      if (!res.ok) { setFieldError(res.error); return }
      setShowReassign(false)
      setNewUserId("")
      onToast("Step reassigned.")
    })
  }

  // ── Node colour ───────────────────────────────────────────────────────────
  const nodeClass =
    step.status === "DONE"
      ? "bg-green-50 border-green-300 text-green-700"
      : step.status === "ACTIVE"
      ? "bg-yellow-50 border-yellow-300 text-yellow-800"
      : "bg-neutral-100 border-neutral-200 text-neutral-400"

  const lineClass = step.status === "DONE" ? "bg-green-200" : "bg-neutral-200"

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div id={`step-${step.id}`} className="flex gap-0 relative">

      {/* Vertical connector to next step */}
      {!isLast && (
        <div className={`absolute left-[15px] top-9 bottom-0 w-0.5 ${lineClass} z-0`} />
      )}

      {/* Circle node */}
      <div className={`relative z-10 mt-0.5 flex h-8 w-8 flex-shrink-0 items-center
        justify-center rounded-full border-2 text-xs font-bold ${nodeClass}`}>
        {step.status === "DONE" ? "✓" : step.step_order}
      </div>

      {/* Content area */}
      <div className={`ml-4 flex-1 ${!isLast ? "pb-7" : ""}`}>

        {/* Title row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">{step.title}</span>
          <StatusBadge status={step.status} />
          {isMine && step.status === "ACTIVE" && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">
              Your turn
            </span>
          )}
        </div>

        {/* Instruction */}
        {step.action_note && (
          <p className="mt-0.5 text-xs text-neutral-500">{step.action_note}</p>
        )}

        {/* Meta: assigned to / timestamps */}
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wide text-neutral-400">Assigned to</span>
            <p className="mt-0.5 font-medium text-neutral-800">
              {step.assigned_user?.full_name ?? "Unassigned"}
              {step.assigned_department && (
                <span className="ml-1 font-normal text-neutral-400">· {step.assigned_department}</span>
              )}
            </p>
          </div>

          {step.completed_at ? (
            <div>
              <span className="text-[10px] uppercase tracking-wide text-neutral-400">Completed</span>
              <p className="mt-0.5 text-neutral-600">{fmtDateTime(step.completed_at)}</p>
            </div>
          ) : step.assigned_at ? (
            <div>
              <span className="text-[10px] uppercase tracking-wide text-neutral-400">Assigned</span>
              <p className="mt-0.5 text-neutral-600">{fmtDate(step.assigned_at)}</p>
            </div>
          ) : null}
        </div>

        {/* Remarks from when this step was completed */}
        {step.remarks && (
          <p className="mt-2 border-l-2 border-neutral-200 pl-3 text-xs italic text-neutral-500">
            {step.remarks}
          </p>
        )}

        {/* Inline error */}
        {fieldError && (
          <p className="mt-2 text-xs text-red-600">{fieldError}</p>
        )}

        {/* ── Primary action: Pass / Mark done ─────────────────────────── */}
        {step.status === "ACTIVE" && !showAction && !showReassign && (
          <button
            onClick={() => setShowAction(true)}
            className={`mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2
              text-xs font-medium text-white transition-colors
              ${isLastStep
                ? "bg-green-700 hover:bg-green-800"
                : "bg-neutral-900 hover:bg-neutral-700"}`}
          >
            {isLastStep ? "Mark as done" : "Move to next person"}
            {!isLastStep && (
              <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isLastStep && (
              <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}

        {/* Confirmation panel */}
        {showAction && (
          <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 max-w-sm">
            <p className="text-xs text-neutral-600 mb-2">
              {isLastStep
                ? "This is the final step. Completing it will close the pipeline and mark the letter as Completed."
                : "The file will be passed to the next handler after you confirm."}
            </p>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400">
              Remark (optional)
            </label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={2}
              placeholder="Notes for the record…"
              disabled={isPending}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2
                text-xs text-neutral-800 placeholder:text-neutral-300 focus:outline-none
                focus:ring-1 focus:ring-neutral-300 resize-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={isLastStep ? handleMarkDone : handlePass}
                disabled={isPending}
                className={`rounded-xl px-4 py-2 text-xs font-medium text-white
                  disabled:opacity-50 transition-colors
                  ${isLastStep ? "bg-green-700 hover:bg-green-800" : "bg-neutral-900 hover:bg-neutral-700"}`}
              >
                {isPending
                  ? "Processing…"
                  : isLastStep
                  ? "Confirm — mark complete"
                  : "Confirm — pass on"}
              </button>
              <button
                onClick={() => { setShowAction(false); setRemarks(""); setFieldError(null) }}
                disabled={isPending}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-xs
                  text-neutral-500 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Admin/Secretary: reassign ──────────────────────────────── */}
        {canManage && step.status !== "DONE" && !showReassign && !showAction && (
          <button
            onClick={() => setShowReassign(true)}
            className="mt-2 text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-700"
          >
            Reassign
          </button>
        )}

        {showReassign && (
          <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 max-w-sm">
            <label className="text-[11px] uppercase tracking-wide text-neutral-400">Reassign to</label>
            <select
              value={newUserId}
              onChange={e => setNewUserId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2
                text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-300"
            >
              <option value="">Select a person…</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name}{u.department ? ` — ${u.department}` : ""}
                </option>
              ))}
            </select>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleReassign}
                disabled={!newUserId || isPending}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-medium text-white
                  hover:bg-neutral-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Saving…" : "Confirm reassignment"}
              </button>
              <button
                onClick={() => { setShowReassign(false); setNewUserId(""); setFieldError(null) }}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-xs
                  text-neutral-500 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            {fieldError && <p className="mt-2 text-xs text-red-600">{fieldError}</p>}
          </div>
        )}

      </div>
    </div>
  )
}