"use client"

import { useMemo, useRef, useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createPipeline } from "@/lib/pipeline/actions"
import type { CreatePipelineInput, SlimProfile } from "@/lib/pipeline/types"

interface LetterOption {
  id: string
  ref_no: string
  subject: string
  sender_name: string
  date_received: string
  status: string
  recipient_department: string | null
  file_name?: string | null
}

interface StepDraft {
  key: number
  title: string
  action_note: string
  user_id: string
}

interface Props {
  preselectedLetterId: string | null
  letters: LetterOption[]
  users: SlimProfile[]
}

let nextKey = 2

function fmtDate(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "?"
}

function SearchableLetterPicker({ letters, selected, onSelect }: { letters: LetterOption[]; selected: LetterOption | null; onSelect: (value: LetterOption | null) => void }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return letters.slice(0, 30)
    return letters.filter(letter =>
      letter.ref_no.toLowerCase().includes(q) ||
      letter.subject.toLowerCase().includes(q) ||
      letter.sender_name.toLowerCase().includes(q) ||
      (letter.file_name ?? "").toLowerCase().includes(q)
    )
  }, [letters, query])

  return (
    <div ref={ref} className="relative">
      {selected ? (
        <button type="button" onClick={() => onSelect(null)} className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left transition hover:bg-white">
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span className="font-mono">{selected.ref_no}</span>
            {selected.file_name && <span>{selected.file_name}</span>}
          </div>
          <p className="mt-1 text-sm font-semibold text-neutral-900">{selected.subject}</p>
          <p className="mt-1 text-xs text-neutral-500">{selected.sender_name}{selected.date_received ? ` · ${fmtDate(selected.date_received)}` : ""}</p>
          <p className="mt-2 text-xs text-neutral-400">Tap to change</p>
        </button>
      ) : (
        <>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search letter by reference, subject, sender, or file name…"
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
          />
          {open && (
            <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg">
              <div className="max-h-72 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-neutral-500">No available letters found.</p>
                ) : filtered.map(letter => (
                  <button
                    type="button"
                    key={letter.id}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { onSelect(letter); setOpen(false); setQuery("") }}
                    className="mb-2 w-full rounded-2xl px-3 py-3 text-left transition hover:bg-neutral-50 last:mb-0"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="font-mono">{letter.ref_no}</span>
                      {letter.file_name && <span>{letter.file_name}</span>}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-neutral-900">{letter.subject}</p>
                    <p className="mt-1 text-xs text-neutral-500">{letter.sender_name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function UserPicker({ users, selectedUserId, onSelect }: { users: SlimProfile[]; selectedUserId: string; onSelect: (value: string) => void }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = users.find(user => user.id === selectedUserId) ?? null

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(user => user.full_name.toLowerCase().includes(q) || (user.department ?? "").toLowerCase().includes(q))
  }, [users, query])

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-left transition hover:border-neutral-300">
        {selected ? (
          <>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-xs font-semibold text-white">{initials(selected.full_name)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-neutral-900">{selected.full_name}</span>
              <span className="block truncate text-xs text-neutral-500">{selected.department ?? selected.role}</span>
            </span>
          </>
        ) : (
          <span className="text-sm text-neutral-500">Select a person…</span>
        )}
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg">
          <div className="border-b border-neutral-100 p-3">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or department…" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200" />
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {filtered.map(user => (
              <button key={user.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onSelect(user.id); setOpen(false); setQuery("") }} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition last:mb-0 ${selectedUserId === user.id ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${selectedUserId === user.id ? "bg-white/10" : "bg-neutral-100 text-neutral-700"}`}>{initials(user.full_name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{user.full_name}</span>
                  <span className={`block truncate text-xs ${selectedUserId === user.id ? "text-neutral-300" : "text-neutral-500"}`}>{user.department ?? user.role}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StepEditor({ steps, users, onChange, onAdd, onRemove }: { steps: StepDraft[]; users: SlimProfile[]; onChange: (key: number, field: keyof Omit<StepDraft, "key">, value: string) => void; onAdd: () => void; onRemove: (key: number) => void }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={step.key} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Step {index + 1}</p>
              <p className="text-xs text-neutral-500">3-day timer starts when this person receives it.</p>
            </div>
            {steps.length > 1 && <button type="button" onClick={() => onRemove(step.key)} className="text-xs text-neutral-400 hover:text-red-600">Remove</button>}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-500">Person</label>
              <UserPicker users={users} selectedUserId={step.user_id} onSelect={value => onChange(step.key, "user_id", value)} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-500">What should they do?</label>
              <input value={step.title} onChange={e => onChange(step.key, "title", e.target.value)} placeholder="e.g. Review and pass on" className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200" />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-2 block text-xs font-medium text-neutral-500">Note (optional)</label>
            <textarea value={step.action_note} onChange={e => onChange(step.key, "action_note", e.target.value)} rows={2} placeholder="Extra instruction for this step…" className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200" />
          </div>
        </div>
      ))}

      <button type="button" onClick={onAdd} className="rounded-2xl border border-dashed border-neutral-300 px-4 py-2.5 text-sm text-neutral-600 transition hover:bg-neutral-50">+ Add another step</button>
    </div>
  )
}

export function NewPipelineForm({ preselectedLetterId, letters, users }: Props) {
  const router = useRouter()
  const preselected = useMemo(() => letters.find(letter => letter.id === preselectedLetterId) ?? null, [letters, preselectedLetterId])
  const [sourceType, setSourceType] = useState<"letter" | "file">(preselected ? "letter" : "file")
  const [selectedLetter, setSelectedLetter] = useState<LetterOption | null>(preselected)
  const [manualFileName, setManualFileName] = useState("")
  const [manualIdentifier, setManualIdentifier] = useState("")
  const [manualSubject, setManualSubject] = useState("")
  const [steps, setSteps] = useState<StepDraft[]>([
    { key: 1, title: "", action_note: "", user_id: "" },
    { key: 2, title: "", action_note: "", user_id: "" },
  ])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const addStep = () => {
    nextKey += 1
    setSteps(current => [...current, { key: nextKey, title: "", action_note: "", user_id: "" }])
  }

  const removeStep = (key: number) => setSteps(current => current.filter(step => step.key !== key))
  const updateStep = (key: number, field: keyof Omit<StepDraft, "key">, value: string) => setSteps(current => current.map(step => step.key === key ? { ...step, [field]: value } : step))

  const handleSubmit = () => {
    setError(null)

    if (sourceType === "letter" && !selectedLetter) {
      setError("Select a letter first.")
      return
    }

    if (sourceType === "file" && !manualFileName.trim()) {
      setError("Enter the file name you want to track.")
      return
    }

    if (steps.some(step => !step.user_id || !step.title.trim())) {
      setError("Each step needs both a person and a short action.")
      return
    }

    startTransition(async () => {
      const input: CreatePipelineInput = {
        letter_id: sourceType === "letter" ? selectedLetter?.id : undefined,
        manual_item: sourceType === "file" ? {
          file_name: manualFileName.trim(),
          ref_no: manualIdentifier.trim() || undefined,
          subject: manualSubject.trim() || undefined,
        } : undefined,
        steps: steps.map((step, index) => ({
          step_order: index + 1,
          title: step.title.trim(),
          action_note: step.action_note.trim() || undefined,
          assigned_user_id: step.user_id,
        })),
      }

      const res = await createPipeline(input)
      if (!res.ok) {
        setError(res.error)
        return
      }

      const destinationLetterId = sourceType === "letter" ? selectedLetter?.id : null
      router.push(destinationLetterId ? `/pipeline/${destinationLetterId}` : "/pipeline")
      router.refresh()
    })
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">UHAS Procurement Directorate</p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Track Progress</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Keep this simple: choose a letter already in the system, or type the name of a physical file and identifier, then assign the people in order.
        </p>
      </div>

      <div className="space-y-5">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-neutral-900">What are you tracking?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setSourceType("letter")} className={`rounded-2xl px-4 py-2 text-sm transition ${sourceType === "letter" ? "bg-emerald-700 text-white" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
              Letter in system
            </button>
            <button type="button" onClick={() => setSourceType("file")} className={`rounded-2xl px-4 py-2 text-sm transition ${sourceType === "file" ? "bg-emerald-700 text-white" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
              Physical file not in system
            </button>
          </div>

          {sourceType === "letter" ? (
            <div className="mt-4">
              <SearchableLetterPicker letters={letters} selected={selectedLetter} onSelect={setSelectedLetter} />
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-neutral-500">File name</label>
                <input value={manualFileName} onChange={e => setManualFileName(e.target.value)} placeholder="e.g. Marketing tender file" className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-neutral-500">Identifier / reference</label>
                <input value={manualIdentifier} onChange={e => setManualIdentifier(e.target.value)} placeholder="e.g. MKT-2026-04" className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium text-neutral-500">Short description (optional)</label>
                <input value={manualSubject} onChange={e => setManualSubject(e.target.value)} placeholder="Optional title to show in tracking" className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200" />
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Who should handle it?</p>
              <p className="mt-1 text-xs text-neutral-500">Each person gets 3 days from the time the item reaches them. The countdown keeps running until they finish.</p>
            </div>
          </div>
          <StepEditor steps={steps} users={users} onChange={updateStep} onAdd={addStep} onRemove={removeStep} />
        </section>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleSubmit} disabled={isPending} className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60">
            {isPending ? "Saving…" : "Publish track progress"}
          </button>
          <button type="button" onClick={() => router.push("/pipeline")} className="rounded-2xl border border-neutral-200 px-5 py-3 text-sm text-neutral-600 transition hover:bg-white">Cancel</button>
        </div>
      </div>
    </div>
  )
}
