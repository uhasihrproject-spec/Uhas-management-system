"use client"
// components/pipeline/PipelineChainList.tsx
//
// Renders pipeline cards with horizontal step chains.
// Handles both popup types:
//   1. "You have a letter waiting" — shown on mount if user has active steps
//   2. "A letter has been assigned to you" — shown after a Pass action
// Handles Pass to Next and Mark as Done inline.

import { useState, useTransition, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { passToNext, markDone } from "@/lib/pipeline/actions"

// ── Types ──────────────────────────────────────────────────────────────────

interface StepShape {
  id:               string
  pipeline_id:      string
  step_order:       number
  title:            string
  status:           "PENDING" | "ACTIVE" | "DONE" | "SKIPPED"
  assigned_user_id: string | null
  assigned_user:    { id: string; full_name: string; department: string | null } | null
}

interface PipelineRow {
  pipeline_id:        string
  pipeline_status:    "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  current_step_order: number
  started_at:         string
  completed_at:       string | null
  steps:              StepShape[]
  letter: {
    id:                   string
    ref_no:               string
    subject:              string
    sender_name:          string
    date_received:        string
    status:               string
    confidentiality:      string
    recipient_department: string | null
  }
}

interface Props {
  myRows:        PipelineRow[]  // letters where I am the active holder
  otherRows:     PipelineRow[]  // all other visible pipelines
  currentUserId: string
  canManage:     boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

// ── Popup: "You have a letter waiting" ────────────────────────────────────

function WaitingPopup({
  count,
  onDismiss,
}: {
  count:     number
  onDismiss: () => void
}) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl bg-white
        ring-1 ring-neutral-200/80 shadow-lg p-4
        animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-900">
          {count === 1 ? "You have a letter waiting" : `You have ${count} letters waiting`}
        </p>
        <button
          onClick={onDismiss}
          className="text-neutral-400 hover:text-neutral-700 text-lg leading-none mt-0.5 flex-shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">
        {count === 1
          ? "A letter in the pipeline is waiting for your action."
          : "Letters in the pipeline are waiting for your action."}
      </p>
      <button
        onClick={onDismiss}
        className="mt-3 w-full rounded-xl bg-neutral-900 py-2 text-xs font-medium text-white
          hover:bg-neutral-700 transition-colors"
      >
        View below
      </button>
    </div>
  )
}

// ── Popup: "A letter has been assigned to you" ────────────────────────────

function AssignedPopup({
  nextUserName,
  letterRef,
  onDismiss,
}: {
  nextUserName: string
  letterRef:    string
  onDismiss:    () => void
}) {
  // Auto-dismiss after 6 seconds
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl bg-white
        ring-1 ring-neutral-200/80 shadow-lg p-4
        animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-900">Letter passed on</p>
        <button
          onClick={onDismiss}
          className="text-neutral-400 hover:text-neutral-700 text-lg leading-none mt-0.5 flex-shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">
        <span className="font-medium text-neutral-800">{letterRef}</span> has been passed to{" "}
        <span className="font-medium text-neutral-800">{nextUserName}</span>.
      </p>
    </div>
  )
}

// ── Step node in the horizontal chain ─────────────────────────────────────

function ChainNode({
  step,
  isCurrentUser,
  isLast,
}: {
  step:          StepShape
  isCurrentUser: boolean
  isLast:        boolean
}) {
  const isDone    = step.status === "DONE"
  const isActive  = step.status === "ACTIVE"
  const isPending = step.status === "PENDING"

  return (
    <div className="flex items-center gap-0 flex-shrink-0">
      {/* Node */}
      <div className="flex flex-col items-center">
        {/* Avatar circle */}
        <div
          className={`
            relative flex h-9 w-9 items-center justify-center rounded-full
            text-xs font-bold border-2 transition-all
            ${isDone    ? "bg-green-50  border-green-300  text-green-700"  : ""}
            ${isActive  ? isCurrentUser
                          ? "bg-neutral-900 border-neutral-900 text-white ring-4 ring-neutral-900/20"
                          : "bg-yellow-50  border-yellow-400  text-yellow-800"
                        : ""}
            ${isPending ? "bg-neutral-100 border-neutral-200 text-neutral-400" : ""}
          `}
        >
          {isDone ? (
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <span>{step.step_order}</span>
          )}
          {/* Pulse ring for active + mine */}
          {isActive && isCurrentUser && (
            <span className="absolute inset-0 rounded-full animate-ping bg-neutral-900/20" />
          )}
        </div>

        {/* Name below */}
        <div className="mt-1.5 text-center w-20">
          <p className={`text-[11px] leading-tight truncate font-medium
            ${isActive && isCurrentUser ? "text-neutral-900" : ""}
            ${isActive && !isCurrentUser ? "text-yellow-800" : ""}
            ${isDone    ? "text-green-700"   : ""}
            ${isPending ? "text-neutral-400" : ""}
          `}>
            {step.assigned_user?.full_name?.split(" ")[0] ?? "—"}
          </p>
          <p className="text-[10px] text-neutral-400 truncate leading-tight mt-0.5">
            {step.title}
          </p>
        </div>
      </div>

      {/* Arrow connector */}
      {!isLast && (
        <div className="flex items-center mx-1 pb-6 flex-shrink-0">
          <div className={`h-0.5 w-5 ${isDone ? "bg-green-200" : "bg-neutral-200"}`} />
          <svg className={`h-3 w-3 flex-shrink-0 ${isDone ? "text-green-300" : "text-neutral-300"}`}
            viewBox="0 0 12 12" fill="currentColor">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Final "Done" cap */}
      {isLast && (
        <div className="flex items-center mx-1 pb-6 flex-shrink-0">
          <div className={`h-0.5 w-5 ${isDone ? "bg-green-200" : "bg-neutral-200"}`} />
          <div className={`rounded-full px-2 py-0.5 text-[10px] font-semibold
            ${isDone ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-400"}`}>
            Done
          </div>
        </div>
      )}
    </div>
  )
}

// ── Action panel (pass / mark done) ───────────────────────────────────────

function ActionPanel({
  row,
  currentUserId,
  onPassed,
  onDone,
}: {
  row:           PipelineRow
  currentUserId: string
  onPassed:      (nextUserName: string | null, refNo: string) => void
  onDone:        () => void
}) {
  const activeStep = row.steps.find(s => s.status === "ACTIVE")
  const isMine     = activeStep?.assigned_user_id === currentUserId
  const isLastStep = activeStep
    ? !row.steps.some(s => s.step_order > activeStep.step_order && s.status === "PENDING")
    : false

  const [showRemarks, setShowRemarks] = useState(false)
  const [remarks, setRemarks]         = useState("")
  const [error, setError]             = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  if (!activeStep || !isMine) return null

  const handlePass = () => {
    setError(null)
    startTransition(async () => {
      const res = await passToNext({
        pipeline_id: row.pipeline_id,
        step_id:     activeStep.id,
        remarks:     remarks || undefined,
      })
      if (!res.ok) { setError(res.error); return }
      setShowRemarks(false)
      setRemarks("")
      onPassed(res.data.next_user_name, row.letter.ref_no)
    })
  }

  const handleMarkDone = () => {
    setError(null)
    startTransition(async () => {
      const res = await markDone({
        pipeline_id: row.pipeline_id,
        step_id:     activeStep.id,
        remarks:     remarks || undefined,
      })
      if (!res.ok) { setError(res.error); return }
      setShowRemarks(false)
      setRemarks("")
      onDone()
    })
  }

  return (
    <div className="border-t border-neutral-100 mt-4 pt-4">
      {!showRemarks ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500 mr-1">Your action:</span>
          {!isLastStep && (
            <button
              onClick={() => setShowRemarks(true)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900
                px-4 py-2 text-xs font-medium text-white hover:bg-neutral-700
                disabled:opacity-50 transition-colors"
            >
              Pass to next
              <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {isLastStep && (
            <button
              onClick={() => setShowRemarks(true)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-700
                px-4 py-2 text-xs font-medium text-white hover:bg-green-800
                disabled:opacity-50 transition-colors"
            >
              Mark as done
              <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-neutral-50 border border-neutral-200 p-4 max-w-sm">
          <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1.5 block">
            Add a remark (optional)
          </label>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={2}
            placeholder="Notes for the record…"
            disabled={isPending}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs
              text-neutral-800 placeholder:text-neutral-300 focus:outline-none
              focus:ring-1 focus:ring-neutral-300 resize-none"
          />
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={isLastStep ? handleMarkDone : handlePass}
              disabled={isPending}
              className={`rounded-xl px-4 py-2 text-xs font-medium text-white
                disabled:opacity-50 transition-colors
                ${isLastStep ? "bg-green-700 hover:bg-green-800" : "bg-neutral-900 hover:bg-neutral-700"}`}
            >
              {isPending ? "Processing…" : isLastStep ? "Confirm complete" : "Confirm pass"}
            </button>
            <button
              onClick={() => { setShowRemarks(false); setRemarks(""); setError(null) }}
              disabled={isPending}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs
                text-neutral-500 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

// ── Single pipeline card ───────────────────────────────────────────────────

function PipelineCard({
  row,
  currentUserId,
  canManage,
  onPassed,
  onDone,
}: {
  row:           PipelineRow
  currentUserId: string
  canManage:     boolean
  onPassed:      (nextUserName: string | null, refNo: string) => void
  onDone:        () => void
}) {
  const activeStep  = row.steps.find(s => s.status === "ACTIVE")
  const isMine      = activeStep?.assigned_user_id === currentUserId
  const isCompleted = row.pipeline_status === "COMPLETED"

  return (
    <div
      className={`rounded-3xl bg-white ring-1 p-5 transition-all
        ${isMine ? "ring-neutral-900/20 shadow-sm" : "ring-neutral-200/70"}`}
    >
      {/* Top: letter info + link */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-[11px] font-mono text-neutral-400">{row.letter.ref_no}</span>
            {isMine && (
              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                Waiting for you
              </span>
            )}
            {isCompleted && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                Completed
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-neutral-900 truncate">{row.letter.subject}</p>
          <p className="text-xs text-neutral-400 mt-0.5">
            {row.letter.sender_name}
            {row.letter.recipient_department ? ` · ${row.letter.recipient_department}` : ""}
            {" · "}
            {fmtDate(row.letter.date_received)}
          </p>
        </div>
        <Link
          href={`/pipeline/${row.letter.id}`}
          className="flex-shrink-0 text-xs text-neutral-400 hover:text-neutral-700 underline
            underline-offset-2 transition-colors whitespace-nowrap"
        >
          View details
        </Link>
      </div>

      {/* Horizontal step chain */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="flex items-start min-w-max">
          {row.steps.map((step, i) => (
            <ChainNode
              key={step.id}
              step={step}
              isCurrentUser={step.assigned_user_id === currentUserId}
              isLast={i === row.steps.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Action panel (only if I'm the active holder) */}
      <ActionPanel
        row={row}
        currentUserId={currentUserId}
        onPassed={onPassed}
        onDone={onDone}
      />
    </div>
  )
}

// ── Main list component ────────────────────────────────────────────────────

export function PipelineChainList({ myRows, otherRows, currentUserId, canManage }: Props) {
  // Popup 1: "You have letters waiting" — show once on mount if I have active steps
  const [showWaiting, setShowWaiting]   = useState(false)
  const [showAssigned, setShowAssigned] = useState<{ nextUserName: string; letterRef: string } | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    if (myRows.length > 0) {
      const t = setTimeout(() => setShowWaiting(true), 1200)
      return () => clearTimeout(t)
    }
  }, [myRows.length])

  const handlePassed = useCallback((nextUserName: string | null, letterRef: string) => {
    // Show "assigned to next user" popup
    if (nextUserName) {
      setShowAssigned({ nextUserName, letterRef })
    }
  }, [])

  const handleDone = useCallback(() => {
    // No special popup for done — the card updates naturally on revalidation
  }, [])

  const allRows = [...myRows, ...otherRows]

  return (
    <>
      {/* Popup 1: waiting */}
      {showWaiting && myRows.length > 0 && (
        <WaitingPopup
          count={myRows.length}
          onDismiss={() => setShowWaiting(false)}
        />
      )}

      {/* Popup 2: letter passed / assigned */}
      {showAssigned && (
        <AssignedPopup
          nextUserName={showAssigned.nextUserName}
          letterRef={showAssigned.letterRef}
          onDismiss={() => setShowAssigned(null)}
        />
      )}

      {/* My letters — shown first, with a section label */}
      {myRows.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
            Waiting for you · {myRows.length}
          </h2>
          <div className="space-y-3">
            {myRows.map(row => (
              <PipelineCard
                key={row.pipeline_id}
                row={row}
                currentUserId={currentUserId}
                canManage={canManage}
                onPassed={handlePassed}
                onDone={handleDone}
              />
            ))}
          </div>
        </section>
      )}

      {/* Other letters */}
      {otherRows.length > 0 && (
        <section>
          {myRows.length > 0 && (
            <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
              All pipelines · {otherRows.length}
            </h2>
          )}
          <div className="space-y-3">
            {otherRows.map(row => (
              <PipelineCard
                key={row.pipeline_id}
                row={row}
                currentUserId={currentUserId}
                canManage={canManage}
                onPassed={handlePassed}
                onDone={handleDone}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}