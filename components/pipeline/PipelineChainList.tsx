"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { passToNext, markDone } from "@/lib/pipeline/actions"
import type { SlimProfile } from "@/lib/pipeline/types"

interface StepShape {
  id: string
  pipeline_id: string
  step_order: number
  title: string
  status: "PENDING" | "ACTIVE" | "DONE" | "SKIPPED"
  assigned_user_id: string | null
  assigned_at?: string | null
  assigned_user: { id: string; full_name: string; department: string | null } | null
}

interface PipelineRow {
  pipeline_id: string
  pipeline_status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  started_at: string
  completed_at: string | null
  steps: StepShape[]
  letter: {
    id: string
    ref_no: string
    subject: string
    sender_name: string
    date_received: string
    recipient_department: string | null
    file_name?: string | null
  }
}

interface Props {
  myRows: PipelineRow[]
  otherRows: PipelineRow[]
  currentUserId: string
  allUsers: SlimProfile[]
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
}

function getCountdown(assignedAt: string | null | undefined) {
  if (!assignedAt) return null
  const due = new Date(assignedAt).getTime() + 3 * 24 * 60 * 60 * 1000
  const diff = due - Date.now()
  const hours = Math.ceil(Math.abs(diff) / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  const label = days > 0 ? `${days}d ${remHours}h` : `${remHours}h`
  return diff <= 0
    ? { label: `Overdue ${label}`, tone: "bg-red-50 text-red-700" }
    : { label: `${label} left`, tone: "bg-amber-50 text-amber-700" }
}

function WaitingPopup({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white p-4 shadow-lg ring-1 ring-neutral-200/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{count === 1 ? "1 item is waiting for you" : `${count} items are waiting for you`}</p>
          <p className="mt-1 text-sm text-neutral-500">Your active work appears first below.</p>
        </div>
        <button onClick={onDismiss} className="text-neutral-400 hover:text-neutral-700">×</button>
      </div>
    </div>
  )
}

function ActionPanel({ row, currentUserId, allUsers, onPassed }: { row: PipelineRow; currentUserId: string; allUsers: SlimProfile[]; onPassed: (name: string | null, ref: string) => void }) {
  const activeStep = row.steps.find(step => step.status === "ACTIVE")
  const isLast = activeStep ? !row.steps.some(step => step.step_order > activeStep.step_order && step.status === "PENDING") : false
  const nextStep = activeStep ? row.steps.find(step => step.step_order > activeStep.step_order && step.status === "PENDING") ?? null : null
  const [remarks, setRemarks] = useState("")
  const [nextUserId, setNextUserId] = useState("")
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!activeStep) return null

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const res = isLast
        ? await markDone({ pipeline_id: row.pipeline_id, step_id: activeStep.id, remarks: remarks || undefined })
        : await passToNext({ pipeline_id: row.pipeline_id, step_id: activeStep.id, remarks: remarks || undefined, next_user_id: nextStep?.assigned_user_id ? undefined : nextUserId || undefined })
      if (!res.ok) {
        setError(res.error)
        return
      }
      if (!isLast && res.data) onPassed("next_user_name" in res.data ? res.data.next_user_name : null, row.letter.ref_no)
      setOpen(false)
      setRemarks("")
      setNextUserId("")
    })
  }

  return (
    <div className="mt-4 border-t border-neutral-100 pt-4">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={`rounded-2xl px-4 py-2.5 text-sm font-medium text-white ${isLast ? "bg-green-700 hover:bg-green-800" : "bg-neutral-900 hover:bg-neutral-700"}`}>
          {isLast ? "Mark as done" : "Move to next person"}
        </button>
      ) : (
        <div className="max-w-lg rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/70">
          <p className="text-sm font-medium text-neutral-900">Optional note</p>
          {!isLast && nextStep && !nextStep.assigned_user_id && (
            <div className="mt-3">
              <label className="mb-2 block text-xs font-medium text-neutral-500">Choose who should receive the next step</label>
              <select value={nextUserId} onChange={e => setNextUserId(e.target.value)} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-200">
                <option value="">Select a person…</option>
                {allUsers.map(user => <option key={user.id} value={user.id}>{user.full_name}{user.department ? ` — ${user.department}` : ""}</option>)}
              </select>
            </div>
          )}
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="mt-3 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200" placeholder="Add a short note…" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={handleConfirm} disabled={isPending || (!isLast && !!nextStep && !nextStep.assigned_user_id && !nextUserId)} className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{isPending ? "Saving…" : "Confirm"}</button>
            <button type="button" onClick={() => { setOpen(false); setRemarks(""); setError(null); setNextUserId("") }} className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600">Cancel</button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

function PipelineCard({ row, currentUserId, allUsers, onPassed }: { row: PipelineRow; currentUserId: string; allUsers: SlimProfile[]; onPassed: (name: string | null, ref: string) => void }) {
  const active = row.steps.find(step => step.status === "ACTIVE")
  const next = active ? row.steps.find(step => step.step_order > active.step_order && step.status === "PENDING") : null
  const doneCount = row.steps.filter(step => step.status === "DONE").length
  const countdown = getCountdown(active?.assigned_at)
  const isMine = active?.assigned_user_id === currentUserId

  return (
    <article className="rounded-3xl bg-white p-5 ring-1 ring-neutral-200/70 transition hover:ring-neutral-300">
      <Link href={`/pipeline/${row.letter.id}`} className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-300" aria-label={`Open tracking details for ${row.letter.ref_no}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span className="font-mono">{row.letter.ref_no}</span>
              {row.letter.file_name && <span>{row.letter.file_name}</span>}
              {isMine && <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">Your turn</span>}
            </div>
            <h3 className="mt-1 text-base font-semibold text-neutral-900">{row.letter.subject}</h3>
            <p className="mt-1 text-sm text-neutral-500">{row.letter.sender_name} · Received {fmtDate(row.letter.date_received)}</p>
          </div>
          <span className="text-sm font-medium text-neutral-500 underline underline-offset-2">Open</span>
        </div>

        <div className="mt-4 rounded-2xl bg-neutral-50 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Now with</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{active?.assigned_user?.full_name ?? "Completed"}</p>
              <p className="mt-1 text-sm text-neutral-500">{active?.title ?? "All steps completed"}</p>
            </div>
            <div className="text-right text-sm text-neutral-500">
              <p>{active?.assigned_at ? `Since ${fmtDateTime(active.assigned_at)}` : row.completed_at ? `Completed ${fmtDateTime(row.completed_at)}` : "—"}</p>
              {countdown && <p className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${countdown.tone}`}>{countdown.label}</p>}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Next</p>
              <p className="mt-1 text-sm font-medium text-neutral-900">{next?.assigned_user?.full_name ?? (next ? "Choose when handing over" : "Final / done")}</p>
              <p className="mt-1 text-xs text-neutral-500">{next?.title ?? "No pending next step"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Progress</p>
              <p className="mt-1 text-sm font-medium text-neutral-900">{doneCount}/{row.steps.length} steps done</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {row.steps.map(step => (
            <div key={step.id} className={`rounded-full px-3 py-1 text-xs ${step.status === "DONE" ? "bg-green-50 text-green-700" : step.status === "ACTIVE" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}>
              {step.step_order}. {step.assigned_user?.full_name?.split(" ")[0] ?? "Pending"}
            </div>
          ))}
        </div>
      </Link>

      <ActionPanel row={row} currentUserId={currentUserId} allUsers={allUsers} onPassed={onPassed} />
    </article>
  )
}

export function PipelineChainList({ myRows, otherRows, currentUserId, allUsers }: Props) {
  const [showWaiting, setShowWaiting] = useState(false)
  const [query, setQuery] = useState("")
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    if (myRows.length > 0) {
      const t = setTimeout(() => setShowWaiting(true), 1000)
      return () => clearTimeout(t)
    }
  }, [myRows.length])

  const allRows = useMemo(() => [...myRows, ...otherRows], [myRows, otherRows])
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter(row => [row.letter.ref_no, row.letter.subject, row.letter.sender_name, row.letter.file_name ?? "", row.steps.find(step => step.status === "ACTIVE")?.assigned_user?.full_name ?? ""].some(value => value.toLowerCase().includes(q)))
  }, [allRows, query])
  const myIds = new Set(myRows.map(row => row.pipeline_id))
  const mine = filteredRows.filter(row => myIds.has(row.pipeline_id))
  const others = filteredRows.filter(row => !myIds.has(row.pipeline_id))

  const handlePassed = useCallback(() => {}, [])

  return (
    <>
      {showWaiting && myRows.length > 0 && <WaitingPopup count={myRows.length} onDismiss={() => setShowWaiting(false)} />}

      <section className="rounded-3xl bg-white p-5 ring-1 ring-neutral-200/70">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by reference, file name, subject, or current holder…" className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200" />
      </section>

      <div className="space-y-6">
        {mine.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Waiting for you</h2>
            <div className="space-y-4">
              {mine.map(row => <PipelineCard key={row.pipeline_id} row={row} currentUserId={currentUserId} allUsers={allUsers} onPassed={handlePassed} />)}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">All items</h2>
            <div className="space-y-4">
              {others.map(row => <PipelineCard key={row.pipeline_id} row={row} currentUserId={currentUserId} allUsers={allUsers} onPassed={handlePassed} />)}
            </div>
          </section>
        )}

        {filteredRows.length === 0 && <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-neutral-200/70"><p className="text-sm text-neutral-500">No tracked items found.</p></div>}
      </div>
    </>
  )
}
