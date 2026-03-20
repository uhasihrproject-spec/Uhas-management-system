"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

interface ReminderItem {
  step_id: string
  title: string
  assigned_at: string | null
  letter_id: string | null
  ref_no: string
  subject: string | null
  file_name: string | null
}

function fmtDateTime(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
}

export default function GlobalTrackReminder() {
  const [items, setItems] = useState<ReminderItem[]>([])
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true

    const scheduleNextPoll = () => {
      if (!active) return
      const nextDelay = 45_000 + Math.floor(Math.random() * 135_000)
      timerRef.current = setTimeout(loadReminders, nextDelay)
    }

    const loadReminders = () => {
      fetch("/api/pipeline/reminders", { cache: "no-store" })
        .then(res => res.ok ? res.json() : { items: [] })
        .then(data => {
          if (!active) return
          const nextItems = Array.isArray(data?.items) ? data.items : []
          setItems(nextItems)
          if (nextItems.length > 0) setOpen(true)
        })
        .catch(() => {})
        .finally(() => scheduleNextPoll())
    }

    loadReminders()

    return () => {
      active = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!open || items.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white p-4 shadow-lg ring-1 ring-neutral-200/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Track Progress reminder</p>
          <p className="mt-1 text-sm text-neutral-500">You have {items.length} active item{items.length > 1 ? "s" : ""} waiting for your action.</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700">×</button>
      </div>

      <div className="mt-3 space-y-2">
        {items.slice(0, 3).map(item => (
          <div key={item.step_id} className="rounded-xl bg-neutral-50 px-3 py-2">
            <p className="text-sm font-medium text-neutral-900">{item.ref_no}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{item.file_name ?? item.subject ?? item.title}</p>
            <p className="mt-0.5 text-xs text-neutral-400">Received {fmtDateTime(item.assigned_at)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-neutral-200 py-2 text-xs font-medium text-neutral-600">Later</button>
        <Link href="/pipeline" className="flex-1 rounded-xl bg-neutral-900 py-2 text-center text-xs font-medium text-white">Open Track Progress</Link>
      </div>
    </div>
  )
}
