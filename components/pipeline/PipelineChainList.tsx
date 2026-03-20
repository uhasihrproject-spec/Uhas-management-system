"use client"

import { useState, useTransition, useEffect, useRef, useCallback, useMemo } from "react"
import Link from "next/link"
import { passToNext, markDone } from "@/lib/pipeline/actions"

interface StepShape {
  id: string
  pipeline_id: string
  step_order: number
  title: string
  status: "PENDING" | "ACTIVE" | "DONE" | "SKIPPED"
  assigned_user_id: string | null
  assigned_at?: string | null
  completed_at?: string | null
  assigned_user: { id: string; full_name: string; department: string | null } | null
}

interface PipelineRow {
  pipeline_id: string
  pipeline_status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  current_step_order: number
  started_at: string
  completed_at: string | null
  steps: StepShape[]
  letter: {
    id: string
    ref_no: string
    subject: string
    sender_name: string
    date_received: string
    status: string
    confidentiality: string
    recipient_department: string | null
    file_name?: string | null
  }
}

interface Props {
  myRows: PipelineRow[]
  otherRows: PipelineRow[]
  currentUserId: string
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
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

  if (diff <= 0) {
    return {
      tone: "bg-red-50 text-red-700 ring-red-200/70",
      label: `Overdue by ${compact}`,
    }
  }

  if (diff <= 24 * 60 * 60 * 1000) {
    return {
      tone: "bg-amber-50 text-amber-700 ring-amber-200/70",
      label: `${compact} left`,
    }
  }

  return {
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
    label: `${Math.ceil(diff / (1000 * 60 * 60 * 24))} days left`,
  }
}

function WaitingPopup({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-3xl bg-white p-4 shadow-lg ring-1 ring-neutral-200/80 sm:bottom-6 sm:right-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            {count === 1 ? "You have 1 file waiting" : `You have ${count} files waiting`}
          </p>
          <p className="mt-1 text-sm text-neutral-500">The active items assigned to you are listed at the top of the page.</p>
        </div>
        <button onClick={onDismiss} className="text-lg leading-none text-neutral-400 hover:text-neutral-700" aria-label="Dismiss">×</button>
      </div>
      <button onClick={onDismiss} className="mt-4 w-full rounded-2xl bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700">
        View now
      </button>
    </div>
  )
}

function AssignedPopup({ nextUserName, letterRef, onDismiss }: { nextUserName: string; letterRef: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-3xl bg-white p-4 shadow-lg ring-1 ring-neutral-200/80 sm:bottom-6 sm:right-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Item passed successfully</p>
          <p className="mt-1 text-sm text-neutral-500">
            <span className="font-medium text-neutral-800">{letterRef}</span> is now with <span className="font-medium text-neutral-800">{nextUserName}</span>.
          </p>
        </div>
        <button onClick={onDismiss} className="text-lg leading-none text-neutral-400 hover:text-neutral-700" aria-label="Dismiss">×</button>
      </div>
    </div>
  )
}

function ChainNode({ step, isCurrentUser, isLast }: { step: StepShape; isCurrentUser: boolean; isLast: boolean }) {
  const isDone = step.status === "DONE"
  const isActive = step.status === "ACTIVE"
  const deadline = isActive ? getDeadlineMeta(step.assigned_at) : null

  return (
    <div className="flex items-center gap-0">
      <div className="flex min-w-[120px] flex-col items-center text-center">
        <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold ${isDone ? "border-green-300 bg-green-50 text-green-700" : isActive ? isCurrentUser ? "border-neutral-900 bg-neutral-900 text-white ring-4 ring-neutral-900/10" : "border-amber-300 bg-amber-50 text-amber-700" : "border-neutral-200 bg-neutral-100 text-neutral-400"}`}>
          {isDone ? "✓" : step.step_order}
          {isCurrentUser && isActive && <span className="absolute inset-0 rounded-full animate-ping bg-neutral-900/20" />}
        </div>
        <p className="mt-2 w-full truncate text-xs font-semibold text-neutral-800">{step.assigned_user?.full_name ?? "Unassigned"}</p>
        <p className="mt-1 line-clamp-2 min-h-[2rem] w-full text-[11px] text-neutral-500">{step.title}</p>
        {deadline && <span className={`mt-2 rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ${deadline.tone}`}>{deadline.label}</span>}
      </div>

      {!isLast && (
        <div className="mb-8 flex items-center px-1 sm:px-2">
          <div className={`h-0.5 w-6 sm:w-10 ${isDone ? "bg-green-300" : "bg-neutral-200"}`} />
          <svg className={`h-4 w-4 ${isDone ? "text-green-300" : "text-neutral-300"}`} viewBox="0 0 12 12" fill="currentColor">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  )
}

function ActionPanel({ row, currentUserId, onPassed, onDone }: { row: PipelineRow; currentUserId: string; onPassed: (nextUserName: string | null, refNo: string) => void; onDone: () => void }) {
  const activeStep = row.steps.find(step => step.status === "ACTIVE")
  const isMine = activeStep?.assigned_user_id === currentUserId
  const isLastStep = activeStep ? !row.steps.some(step => step.step_order > activeStep.step_order && step.status === "PENDING") : false
  const [showRemarks, setShowRemarks] = useState(false)
  const [remarks, setRemarks] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!activeStep || !isMine) return null

  const handlePass = () => {
    setError(null)
    startTransition(async () => {
      const res = await passToNext({ pipeline_id: row.pipeline_id, step_id: activeStep.id, remarks: remarks || undefined })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setRemarks("")
      setShowRemarks(false)
      onPassed(res.data.next_user_name, row.letter.ref_no)
    })
  }

  const handleDone = () => {
    setError(null)
    startTransition(async () => {
      const res = await markDone({ pipeline_id: row.pipeline_id, step_id: activeStep.id, remarks: remarks || undefined })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setRemarks("")
      setShowRemarks(false)
      onDone()
    })
  }

  const deadline = getDeadlineMeta(activeStep.assigned_at)

  return (
    <div className="mt-5 border-t border-neutral-100 pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-white">Your turn</span>
        {deadline && <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${deadline.tone}`}>{deadline.label}</span>}
        <span className="text-xs text-neutral-500">Received {fmtDateTime(activeStep.assigned_at ?? null)}</span>
      </div>

      {!showRemarks ? (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowRemarks(true)} disabled={isPending} className={`rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-60 ${isLastStep ? "bg-green-700 hover:bg-green-800" : "bg-neutral-900 hover:bg-neutral-700"}`}>
            {isLastStep ? "Mark final step done" : "Pass to next person"}
          </button>
          <Link href={`/pipeline/${row.letter.id}`} className="rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-600 transition hover:bg-neutral-50">
            Open full timeline
          </Link>
        </div>
      ) : (
        <div className="max-w-xl rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-900">Add a note for the handoff</p>
          <p className="mt-1 text-xs text-neutral-500">
            {isLastStep ? "This closes the workflow and marks the item completed." : "This marks your step done and activates the next assigned person."}
          </p>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="mt-3 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200" placeholder="Optional note…" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={isLastStep ? handleDone : handlePass} disabled={isPending} className={`rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-60 ${isLastStep ? "bg-green-700 hover:bg-green-800" : "bg-neutral-900 hover:bg-neutral-700"}`}>
              {isPending ? "Processing…" : isLastStep ? "Confirm completion" : "Confirm handoff"}
            </button>
            <button onClick={() => { setShowRemarks(false); setRemarks(""); setError(null) }} disabled={isPending} className="rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-600 transition hover:bg-white">
              Cancel
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

function PipelineCard({ row, currentUserId, onPassed, onDone }: { row: PipelineRow; currentUserId: string; onPassed: (nextUserName: string | null, refNo: string) => void; onDone: () => void }) {
  const activeStep = row.steps.find(step => step.status === "ACTIVE")
  const nextStep = activeStep ? row.steps.find(step => step.step_order > activeStep.step_order && step.status === "PENDING") : null
  const isMine = activeStep?.assigned_user_id === currentUserId
  const isCompleted = row.pipeline_status === "COMPLETED"
  const doneCount = row.steps.filter(step => step.status === "DONE").length

  return (
    <article className={`rounded-[28px] bg-white p-5 ring-1 transition sm:p-6 ${isMine ? "ring-neutral-900/20 shadow-sm" : "ring-neutral-200/70"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-neutral-500">{row.letter.ref_no}</span>
            {row.letter.file_name && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">{row.letter.file_name}</span>}
            {isMine && <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">Waiting for you</span>}
            {isCompleted && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Completed</span>}
          </div>
          <h3 className="mt-2 text-base font-semibold text-neutral-900 sm:text-lg">{row.letter.subject}</h3>
          <p className="mt-1 text-sm text-neutral-500">
            {row.letter.sender_name}
            {row.letter.recipient_department ? ` · ${row.letter.recipient_department}` : ""}
            {` · Received ${fmtDate(row.letter.date_received)}`}
          </p>
        </div>
        <Link href={`/pipeline/${row.letter.id}`} className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50">
          View tracking details
        </Link>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-start">
            {row.steps.map((step, index) => (
              <ChainNode key={step.id} step={step} isCurrentUser={step.assigned_user_id === currentUserId} isLast={index === row.steps.length - 1} />
            ))}
          </div>
        </div>

        <aside className="rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-200/70">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Current status</p>
          {activeStep ? (
            <>
              <p className="mt-3 text-sm text-neutral-500">Currently with</p>
              <p className="text-base font-semibold text-neutral-900">{activeStep.assigned_user?.full_name ?? "Unassigned"}</p>
              <p className="mt-1 text-xs text-neutral-500">{activeStep.title}</p>
              <p className="mt-2 text-xs text-neutral-500">Received {fmtDateTime(activeStep.assigned_at ?? null)}</p>
              {nextStep && <p className="mt-2 text-xs text-neutral-500">Next: <span className="font-medium text-neutral-700">{nextStep.assigned_user?.full_name ?? "Unassigned"}</span></p>}
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-semibold text-green-700">Completed</p>
              <p className="mt-1 text-xs text-neutral-500">Finished {fmtDateTime(row.completed_at)}</p>
            </>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl bg-white p-3 ring-1 ring-neutral-200/70">
              <p className="text-neutral-400">Done</p>
              <p className="mt-1 font-semibold text-neutral-900">{doneCount}/{row.steps.length}</p>
            </div>
            <div className="rounded-2xl bg-white p-3 ring-1 ring-neutral-200/70">
              <p className="text-neutral-400">Started</p>
              <p className="mt-1 font-semibold text-neutral-900">{fmtDate(row.started_at)}</p>
            </div>
          </div>
        </aside>
      </div>

      <ActionPanel row={row} currentUserId={currentUserId} onPassed={onPassed} onDone={onDone} />
    </article>
  )
}

export function PipelineChainList({ myRows, otherRows, currentUserId }: Props) {
  const [showWaiting, setShowWaiting] = useState(false)
  const [showAssigned, setShowAssigned] = useState<{ nextUserName: string; letterRef: string } | null>(null)
  const [query, setQuery] = useState("")
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    if (myRows.length > 0) {
      const timer = setTimeout(() => setShowWaiting(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [myRows.length])

  const handlePassed = useCallback((nextUserName: string | null, letterRef: string) => {
    if (nextUserName) setShowAssigned({ nextUserName, letterRef })
  }, [])

  const allRows = useMemo(() => [...myRows, ...otherRows], [myRows, otherRows])
  const filteredRows = useMemo(() => {
    const normalized = query.toLowerCase().trim()
    if (!normalized) return allRows
    return allRows.filter(row => {
      const active = row.steps.find(step => step.status === "ACTIVE")
      const next = active ? row.steps.find(step => step.step_order > active.step_order && step.status === "PENDING") : null
      return [
        row.letter.ref_no,
        row.letter.subject,
        row.letter.sender_name,
        row.letter.recipient_department ?? "",
        row.letter.file_name ?? "",
        active?.assigned_user?.full_name ?? "",
        next?.assigned_user?.full_name ?? "",
      ].some(value => value.toLowerCase().includes(normalized))
    })
  }, [allRows, query])

  const filteredMine = filteredRows.filter(row => myRows.some(my => my.pipeline_id === row.pipeline_id))
  const filteredOther = filteredRows.filter(row => !myRows.some(my => my.pipeline_id === row.pipeline_id))

  return (
    <>
      {showWaiting && myRows.length > 0 && <WaitingPopup count={myRows.length} onDismiss={() => setShowWaiting(false)} />}
      {showAssigned && <AssignedPopup nextUserName={showAssigned.nextUserName} letterRef={showAssigned.letterRef} onDismiss={() => setShowAssigned(null)} />}

      <section className="rounded-[28px] bg-white p-5 ring-1 ring-neutral-200/70 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Find any tracked file or letter</p>
            <p className="mt-1 text-sm text-neutral-500">Search by reference, scanned file name, subject, current holder, or next person.</p>
          </div>
          <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600 ring-1 ring-neutral-200/70">Total: <span className="font-semibold text-neutral-900">{allRows.length}</span></div>
          <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600 ring-1 ring-neutral-200/70">Waiting for you: <span className="font-semibold text-neutral-900">{myRows.length}</span></div>
          <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600 ring-1 ring-neutral-200/70">Completed: <span className="font-semibold text-neutral-900">{allRows.filter(row => row.pipeline_status === "COMPLETED").length}</span></div>
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search reference, file name, subject, current holder, or next step…" className="mt-4 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200" />
      </section>

      {filteredRows.length === 0 ? (
        <div className="rounded-[28px] bg-white p-10 text-center ring-1 ring-neutral-200/70">
          <p className="text-sm font-semibold text-neutral-900">No tracked items match your search.</p>
          <p className="mt-2 text-sm text-neutral-500">Try a reference number, file name, subject, or handler name.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredMine.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Waiting for you · {filteredMine.length}</h2>
              <div className="space-y-4">
                {filteredMine.map(row => (
                  <PipelineCard key={row.pipeline_id} row={row} currentUserId={currentUserId} onPassed={handlePassed} onDone={() => {}} />
                ))}
              </div>
            </section>
          )}

          {filteredOther.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">All tracked items · {filteredOther.length}</h2>
              <div className="space-y-4">
                {filteredOther.map(row => (
                  <PipelineCard key={row.pipeline_id} row={row} currentUserId={currentUserId} onPassed={handlePassed} onDone={() => {}} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}
