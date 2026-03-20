"use client"
// app/pipeline/new/NewPipelineForm.tsx

import { useState, useTransition, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createPipeline } from "@/lib/pipeline/actions"
import type { CreatePipelineInput, SlimProfile } from "@/lib/pipeline/types"

interface LetterOption {
  id: string; ref_no: string; subject: string
  sender_name: string; date_received: string
  status: string; recipient_department: string | null
}
interface StepDraft { key: number; title: string; action_note: string; user_id: string }
interface Props { preselectedLetterId: string | null; letters: LetterOption[]; users: SlimProfile[] }

let _key = 2

function fmtDate(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

const STATUS_PILL: Record<string, string> = {
  RECEIVED: "bg-neutral-100 text-neutral-500",
  SCANNED:  "bg-blue-50 text-blue-600",
  ASSIGNED: "bg-yellow-50 text-yellow-700",
}

// ── Letter picker ──────────────────────────────────────────────────────────

function LetterPicker({ letters, selected, onSelect, showError }: {
  letters: LetterOption[]; selected: LetterOption | null
  onSelect: (l: LetterOption | null) => void; showError: boolean
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return letters.slice(0, 50)
    return letters.filter(l =>
      l.ref_no.toLowerCase().includes(q) ||
      l.subject.toLowerCase().includes(q) ||
      l.sender_name.toLowerCase().includes(q) ||
      (l.recipient_department ?? "").toLowerCase().includes(q)
    )
  }, [letters, query])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])

  if (selected) {
    return (
      <div className="rounded-2xl bg-neutral-50 ring-1 ring-neutral-200/70 p-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-mono text-neutral-400">{selected.ref_no}</p>
          <p className="mt-0.5 text-sm font-semibold text-neutral-900 truncate">{selected.subject}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            From {selected.sender_name}
            {selected.recipient_department ? ` · ${selected.recipient_department}` : ""}
            {selected.date_received ? ` · Received ${fmtDate(selected.date_received)}` : ""}
          </p>
        </div>
        <button onClick={() => onSelect(null)}
          className="flex-shrink-0 text-xs text-neutral-400 hover:text-neutral-700 underline underline-offset-2 mt-0.5">
          Change
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text" value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search by reference, subject, or sender…"
        className={`w-full rounded-2xl border px-4 py-2.5 text-sm text-neutral-800
          placeholder:text-neutral-300 focus:outline-none focus:ring-1 transition
          ${showError ? "border-red-300 focus:ring-red-200" : "border-neutral-200 focus:ring-neutral-300 bg-white"}`}
      />
      {showError && <p className="mt-1.5 text-xs text-red-500">Please select a letter.</p>}

      {open && (
        <div className="absolute z-40 mt-1.5 w-full rounded-2xl bg-white shadow-xl ring-1 ring-neutral-200/80 overflow-hidden max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-neutral-400">No letters found{query ? ` for "${query}"` : ""}.</p>
              <p className="mt-0.5 text-xs text-neutral-300">Letters already in a pipeline are not listed.</p>
            </div>
          ) : filtered.map(l => (
            <button key={l.id}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(l); setQuery(""); setOpen(false) }}
              className="w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0 transition-colors"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-mono text-neutral-400">{l.ref_no}</span>
                {l.status && (
                  <span className={`rounded-full px-2 py-px text-[10px] font-medium ${STATUS_PILL[l.status] ?? "bg-neutral-100 text-neutral-500"}`}>
                    {l.status.charAt(0) + l.status.slice(1).toLowerCase()}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-neutral-900 truncate">{l.subject}</p>
              <p className="text-xs text-neutral-400 truncate">
                From {l.sender_name}{l.recipient_department ? ` · ${l.recipient_department}` : ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step rows ──────────────────────────────────────────────────────────────

function StepRows({ steps, users, onChange, onAdd, onRemove, showError }: {
  steps: StepDraft[]; users: SlimProfile[]
  onChange: (key: number, f: keyof Omit<StepDraft,"key">, v: string) => void
  onAdd: () => void; onRemove: (key: number) => void; showError: boolean
}) {
  const inp = "rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 w-full placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 transition"

  return (
    <div>
      {steps.map((s, i) => (
        <div key={s.key} className="flex gap-3 items-start mb-3">
          {/* Number + connector */}
          <div className="flex flex-col items-center flex-shrink-0 pt-2.5">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 flex-shrink-0
              ${showError && (!s.user_id || !s.title.trim())
                ? "border-red-300 bg-red-50 text-red-500"
                : "border-neutral-300 bg-white text-neutral-600"}`}>
              {i + 1}
            </div>
            {i < steps.length - 1 && <div className="mt-1.5 w-px bg-neutral-200 flex-1 min-h-[20px]" />}
          </div>

          {/* Fields */}
          <div className="flex-1 pb-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                {i === 0 && <label className="text-[11px] uppercase tracking-wide text-neutral-400 block mb-1">Who handles this step</label>}
                <select value={s.user_id} onChange={e => onChange(s.key, "user_id", e.target.value)}
                  className={`${inp} ${showError && !s.user_id ? "border-red-300" : ""}`}>
                  <option value="">Select a person…</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}{u.department ? ` — ${u.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {i === 0 && <label className="text-[11px] uppercase tracking-wide text-neutral-400 block mb-1">What they need to do</label>}
                <input value={s.title}
                  onChange={e => onChange(s.key, "title", e.target.value)}
                  placeholder={i === 0 ? "e.g. Initial review" : i === steps.length - 1 ? "e.g. Final approval" : "e.g. Sign and forward"}
                  className={`${inp} ${showError && !s.title.trim() ? "border-red-300" : ""}`}
                />
              </div>
            </div>
          </div>

          {/* Remove */}
          {steps.length > 1 && (
            <button onClick={() => onRemove(s.key)}
              className="mt-2.5 flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-xl
                border border-neutral-200 text-neutral-300 hover:border-red-200 hover:text-red-400 transition-colors"
              aria-label="Remove">×
            </button>
          )}
        </div>
      ))}

      <button onClick={onAdd}
        className="mt-1 flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-neutral-300 text-xs">+</span>
        Add another step
      </button>
    </div>
  )
}

// ── Chain preview ──────────────────────────────────────────────────────────

function ChainPreview({ steps, users, letter }: { steps: StepDraft[]; users: SlimProfile[]; letter: LetterOption | null }) {
  const hasAny = steps.some(s => s.user_id) || letter
  if (!hasAny) return null

  return (
    <div className="rounded-2xl bg-neutral-50 ring-1 ring-neutral-200/70 p-4">
      {letter && (
        <div className="mb-3 pb-3 border-b border-neutral-100">
          <p className="text-xs text-neutral-500">
            <span className="font-mono text-neutral-400">{letter.ref_no}</span>
            {" · "}{letter.subject}
          </p>
        </div>
      )}
      <p className="text-xs text-neutral-500 mb-3">This letter will pass through:</p>
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((s, i) => {
          const user  = users.find(u => u.id === s.user_id)
          const isLast = i === steps.length - 1
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className="rounded-xl bg-white ring-1 ring-neutral-200 px-3 py-1.5 text-xs leading-tight">
                <span className="font-medium text-neutral-800">
                  {user ? user.full_name.split(" ")[0] : `Step ${i + 1}`}
                </span>
                {s.title && <span className="text-neutral-400 ml-1.5">{s.title}</span>}
              </div>
              <span className="text-neutral-300 text-sm">{isLast ? "→ ✓" : "→"}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function NewPipelineForm({ preselectedLetterId, letters, users }: Props) {
  const router = useRouter()

  const preselected = useMemo(
    () => letters.find(l => l.id === preselectedLetterId) ?? null,
    [letters, preselectedLetterId]
  )

  const [selectedLetter, setSelectedLetter] = useState<LetterOption | null>(preselected)
  const [steps, setSteps] = useState<StepDraft[]>([
    { key: 1, title: "", action_note: "", user_id: "" },
    { key: 2, title: "", action_note: "", user_id: "" },
  ])
  const [submitted, setSubmitted]       = useState(false)
  const [formError, setFormError]       = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  const addStep    = () => { _key++; setSteps(p => [...p, { key: _key, title: "", action_note: "", user_id: "" }]) }
  const removeStep = (key: number) => setSteps(p => p.filter(s => s.key !== key))
  const updateStep = (key: number, f: keyof Omit<StepDraft,"key">, v: string) =>
    setSteps(p => p.map(s => s.key === key ? { ...s, [f]: v } : s))

  const handleSubmit = () => {
    setSubmitted(true); setFormError(null)
    if (!selectedLetter)              { setFormError("Select a letter first."); return }
    if (steps.some(s => !s.title.trim())) { setFormError("Every step needs a description."); return }
    if (steps.some(s => !s.user_id))  { setFormError("Every step needs a person assigned."); return }

    const input: CreatePipelineInput = {
      letter_id: selectedLetter.id,
      steps: steps.map((s, i) => ({
        step_order: i + 1, title: s.title.trim(),
        action_note: s.action_note.trim() || undefined,
        assigned_user_id: s.user_id,
      })),
    }
    startTransition(async () => {
      const res = await createPipeline(input)
      if (!res.ok) { setFormError(res.error); return }
      router.push(`/pipeline/${selectedLetter.id}`)
    })
  }

  return (
    <div className="w-full min-w-0">
      {/* Header — matches letters page exactly */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">UHAS Procurement Directorate</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold">New pipeline</h1>
          <p className="mt-2 text-sm text-neutral-800">
            Choose a letter and set the people who will review it in order.
            When each person is done, the letter moves to the next person automatically.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-2xl space-y-5">

          {/* 1. Which letter */}
          <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-6">
            <h2 className="text-sm font-semibold text-neutral-900 mb-0.5">Which letter?</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Only letters that don't already have a pipeline are shown here.
            </p>
            <LetterPicker
              letters={letters} selected={selectedLetter}
              onSelect={l => { setSelectedLetter(l); setFormError(null) }}
              showError={submitted && !selectedLetter}
            />
          </div>

          {/* 2. Who reviews it */}
          <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-6">
            <h2 className="text-sm font-semibold text-neutral-900 mb-0.5">Who reviews it, and in what order?</h2>
            <p className="text-xs text-neutral-500 mb-5">
              Person 1 gets it first. When they pass it on, it goes to person 2, and so on until the last person marks it done.
            </p>
            <StepRows
              steps={steps} users={users}
              onChange={updateStep} onAdd={addStep} onRemove={removeStep}
              showError={submitted}
            />
          </div>

          {/* 3. Preview + save */}
          <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-6">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">Check before saving</h2>
            <ChainPreview steps={steps} users={users} letter={selectedLetter} />

            {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

            <div className="mt-5 flex gap-3">
              <button onClick={handleSubmit} disabled={isPending}
                className="inline-flex items-center rounded-2xl px-5 py-2.5 text-sm font-medium
                  text-white btn-brand disabled:opacity-50 transition-colors">
                {isPending ? "Creating…" : "Create pipeline"}
              </button>
              <button onClick={() => router.push("/pipeline")}
                className="inline-flex items-center rounded-2xl border border-neutral-200 px-5 py-2.5
                  text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}