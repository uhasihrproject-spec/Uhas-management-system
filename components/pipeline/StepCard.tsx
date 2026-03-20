"use client"

import { useState, useTransition } from "react"
import { StatusBadge } from "./StatusBadge"
import { passToNext, markDone, reassignStep } from "@/lib/pipeline/actions"
import type { PipelineStep, SlimProfile } from "@/lib/pipeline/types"

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

interface Props {
  step: PipelineStep
  isLast: boolean
  isMine: boolean
  isLastStep: boolean
  nextStepNeedsAssignee?: boolean
  canManage: boolean
  allUsers: SlimProfile[]
  pipelineId: string
  onToast: (msg: string) => void
}

export function StepCard({ step, isLast, isMine, isLastStep, nextStepNeedsAssignee = false, canManage, allUsers, pipelineId, onToast }: Props) {
  const canAct = isMine || canManage
  const [showAction, setShowAction] = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const [remarks, setRemarks] = useState("")
  const [newUserId, setNewUserId] = useState("")
  const [nextUserId, setNextUserId] = useState("")
  const [actionMode, setActionMode] = useState<"move" | "done">("move")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    setFieldError(null)
    startTransition(async () => {
      const res = actionMode === "move"
        ? await passToNext({ pipeline_id: pipelineId, step_id: step.id, remarks: remarks || undefined, next_user_id: !isLastStep && !nextStepNeedsAssignee ? undefined : nextUserId || undefined })
        : await markDone({ pipeline_id: pipelineId, step_id: step.id, remarks: remarks || undefined })
      if (!res.ok) { setFieldError(res.error); return }
      setShowAction(false)
      setRemarks("")
      setNextUserId("")
      onToast(actionMode === "move" ? (res.data?.next_user_name ? `Moved to ${res.data.next_user_name}.` : "Moved to the next person.") : "All steps completed. Letter marked as Completed.")
    })
  }

  const handleReassign = () => {
    if (!newUserId) return
    setFieldError(null)
    startTransition(async () => {
      const res = await reassignStep({ pipeline_id: pipelineId, step_id: step.id, new_user_id: newUserId })
      if (!res.ok) { setFieldError(res.error); return }
      setShowReassign(false)
      setNewUserId("")
      onToast("Step reassigned.")
    })
  }

  const nodeClass = step.status === "DONE" ? "bg-green-50 border-green-300 text-green-700" : step.status === "ACTIVE" ? "bg-yellow-50 border-yellow-300 text-yellow-800" : "bg-neutral-100 border-neutral-200 text-neutral-400"
  const lineClass = step.status === "DONE" ? "bg-green-200" : "bg-neutral-200"

  return (
    <div id={`step-${step.id}`} className="relative flex gap-0">
      {!isLast && <div className={`absolute bottom-0 left-[15px] top-9 z-0 w-0.5 ${lineClass}`} />}
      <div className={`relative z-10 mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${nodeClass}`}>{step.status === "DONE" ? "✓" : step.step_order}</div>

      <div className={`ml-4 flex-1 ${!isLast ? "pb-7" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">{step.title}</span>
          <StatusBadge status={step.status} />
          {isMine && step.status === "ACTIVE" && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">Your turn</span>}
        </div>

        {step.action_note && <p className="mt-0.5 text-xs text-neutral-500">{step.action_note}</p>}

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wide text-neutral-400">Assigned to</span>
            <p className="mt-0.5 font-medium text-neutral-800">{step.assigned_user?.full_name ?? "Unassigned"}{step.assigned_department && <span className="ml-1 font-normal text-neutral-400">· {step.assigned_department}</span>}</p>
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

        {step.remarks && <p className="mt-2 border-l-2 border-neutral-200 pl-3 text-xs italic text-neutral-500">{step.remarks}</p>}
        {fieldError && <p className="mt-2 text-xs text-red-600">{fieldError}</p>}
        {step.status === "ACTIVE" && !canAct && <p className="mt-2 text-xs text-neutral-500">Only {step.assigned_user?.full_name ?? "the current holder"} can move or mark this step as done.</p>}

        {step.status === "ACTIVE" && canAct && !showAction && !showReassign && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => { setActionMode("move"); setShowAction(true) }} className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-700">Move to next person</button>
            <button onClick={() => { setActionMode("done"); setShowAction(true) }} className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-green-800">Mark as done</button>
          </div>
        )}

        {showAction && (
          <div className="mt-3 max-w-sm rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="mb-2 text-xs text-neutral-600">{actionMode === "move" ? (isLastStep ? "Select the next person to continue this process." : "The file will be passed to the next handler after you confirm.") : "This is the final step. Completing it will close the pipeline and mark the letter as Completed."}</p>
            {actionMode === "move" && (isLastStep || nextStepNeedsAssignee) && (
              <div className="mb-3">
                <label className="text-[11px] uppercase tracking-wide text-neutral-400">Choose next person</label>
                <select value={nextUserId} onChange={e => setNextUserId(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-300">
                  <option value="">Select a person…</option>
                  {allUsers.map(user => <option key={user.id} value={user.id}>{user.full_name}{user.department ? ` — ${user.department}` : ""}</option>)}
                </select>
              </div>
            )}
            <label className="text-[11px] uppercase tracking-wide text-neutral-400">Remark (optional)</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Notes for the record…" disabled={isPending} className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300" />
            <div className="mt-3 flex gap-2">
              <button onClick={handleConfirm} disabled={isPending || (actionMode === "move" && (isLastStep || nextStepNeedsAssignee) && !nextUserId)} className={`rounded-xl px-4 py-2 text-xs font-medium text-white disabled:opacity-50 transition-colors ${actionMode === "done" ? "bg-green-700 hover:bg-green-800" : "bg-neutral-900 hover:bg-neutral-700"}`}>{isPending ? "Processing…" : "Confirm"}</button>
              <button onClick={() => { setShowAction(false); setRemarks(""); setFieldError(null); setNextUserId("") }} className="rounded-xl border border-neutral-200 px-4 py-2 text-xs text-neutral-600 hover:bg-white">Cancel</button>
            </div>
          </div>
        )}

        {canManage && step.status !== "DONE" && !showAction && !showReassign && <button onClick={() => setShowReassign(true)} className="mt-3 text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-700">Reassign this step</button>}

        {showReassign && (
          <div className="mt-3 max-w-sm rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-neutral-900">Reassign this step</p>
            <select value={newUserId} onChange={e => setNewUserId(e.target.value)} className="mt-3 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-300">
              <option value="">Select a person…</option>
              {allUsers.map(user => <option key={user.id} value={user.id}>{user.full_name}{user.department ? ` — ${user.department}` : ""}</option>)}
            </select>
            <div className="mt-3 flex gap-2">
              <button onClick={handleReassign} disabled={!newUserId || isPending} className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50">{isPending ? "Saving…" : "Confirm"}</button>
              <button onClick={() => { setShowReassign(false); setNewUserId(""); setFieldError(null) }} className="rounded-xl border border-neutral-200 px-4 py-2 text-xs text-neutral-600 hover:bg-white">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
