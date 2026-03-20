"use client"
// components/pipeline/WorkReminder.tsx
// Used only on the pipeline DETAIL page (/pipeline/[letterId]).
// The list page (/pipeline) has its own inline popups (PipelineChainList).
// Shows once after a short delay; does not repeat after snooze.

import { useEffect, useRef, useState } from "react"
import type { Pipeline } from "@/lib/pipeline/types"

interface Props {
  pipeline:      Pipeline | null
  currentUserId: string
  letterRefNo:   string
}

export function WorkReminder({ pipeline, currentUserId, letterRefNo }: Props) {
  const [visible, setVisible] = useState(false)
  const [snoozed, setSnoozed] = useState(false)
  const shownRef              = useRef(false)

  const activeStep = pipeline?.steps.find(
    s => s.status === "ACTIVE" && s.assigned_user_id === currentUserId
  )

  useEffect(() => {
    if (!activeStep || snoozed || shownRef.current) return
    const t = setTimeout(() => {
      shownRef.current = true
      setVisible(true)
    }, 8000)
    return () => clearTimeout(t)
  }, [activeStep?.id, snoozed])

  if (!activeStep || !visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl bg-white
      ring-1 ring-neutral-200/80 shadow-lg p-4
      animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-900">Action needed</p>
        <button
          onClick={() => { setVisible(false); setSnoozed(true) }}
          className="text-neutral-400 hover:text-neutral-700 text-lg leading-none mt-0.5"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
        You are the current holder of{" "}
        <span className="font-medium text-neutral-900">{letterRefNo}</span>.
        Step {activeStep.step_order}: <em className="not-italic text-neutral-800">{activeStep.title}</em>{" "}
        is waiting for your action.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setVisible(false)}
          className="flex-1 rounded-xl border border-neutral-200 py-2 text-xs font-medium
            text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          Remind later
        </button>
        <button
          onClick={() => {
            setVisible(false)
            document.getElementById(`step-${activeStep.id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" })
          }}
          className="flex-1 rounded-xl bg-neutral-900 py-2 text-xs font-medium
            text-white hover:bg-neutral-700 transition-colors"
        >
          Go to step
        </button>
      </div>
    </div>
  )
}