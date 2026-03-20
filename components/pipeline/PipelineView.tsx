"use client"
// components/pipeline/PipelineView.tsx
// Renders pipeline steps, sidebar summary, and audit log for one letter.
// Receives server-fetched data as props; mutations use server actions.

import { useState } from "react"
import Link          from "next/link"
import { StepCard }  from "./StepCard"
import { StatusBadge } from "./StatusBadge"
import { WorkReminder } from "./WorkReminder"
import { cancelPipeline } from "@/lib/pipeline/actions"
import type { Pipeline, LetterSummary, SlimProfile } from "@/lib/pipeline/types"

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

const AUDIT_LABELS: Record<string, string> = {
  PIPELINE_CREATED:          "Pipeline created",
  PIPELINE_STEP_ACTIVATED:   "Step activated",
  PIPELINE_STEP_COMPLETED:   "Step completed",
  PIPELINE_STEP_REASSIGNED:  "Step reassigned",
  PIPELINE_COMPLETED:        "Pipeline completed",
  PIPELINE_CANCELLED:        "Pipeline cancelled",
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

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ canManage, letterId }: { canManage: boolean; letterId: string }) {
  return (
    <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-10 text-center">
      <p className="text-sm font-semibold text-neutral-900">No pipeline yet</p>
      <p className="mt-1 text-sm text-neutral-500">
        No movement pipeline has been created for this letter.
      </p>
      {canManage && (
        <Link
          href={`/pipeline/new?letter=${letterId}`}
          className="mt-5 inline-flex items-center rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm
            text-white hover:bg-neutral-700 transition-colors"
        >
          Create pipeline
        </Link>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export interface PipelineViewProps {
  pipeline:    Pipeline | null
  letter:      LetterSummary
  currentUser: SlimProfile
  auditLog:    any[]
  allUsers:    SlimProfile[]
}

type Tab = "pipeline" | "details" | "history"

export function PipelineView({
  pipeline,
  letter,
  currentUser,
  auditLog,
  allUsers,
}: PipelineViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("pipeline")
  const [toast, setToast]         = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const canManage = currentUser.role === "ADMIN" || currentUser.role === "SECRETARY"
  const steps      = pipeline?.steps ?? []
  const done       = steps.filter((s) => s.status === "DONE").length
  const pct        = steps.length ? Math.round((done / steps.length) * 100) : 0
  const activeStep = steps.find((s) => s.status === "ACTIVE") ?? null
  const nextStep   = activeStep
    ? steps.find((s) => s.step_order > activeStep.step_order && s.status === "PENDING") ?? null
    : null

  return (
    <>
      {toast && <Toast msg={toast} />}

      <WorkReminder
        pipeline={pipeline}
        currentUserId={currentUser.id}
        letterRefNo={letter.ref_no}
      />

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5">
        {(["pipeline", "details", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors capitalize
              ${activeTab === t
                ? "bg-white text-neutral-900 ring-1 ring-neutral-200/80 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"}`}
          >
            {t === "history" ? "Audit log" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Pipeline tab ── */}
      {activeTab === "pipeline" && (
        <>
          {!pipeline ? (
            <EmptyState canManage={canManage} letterId={letter.id} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-5 items-start">

              {/* Left: steps */}
              <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-6">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <h2 className="text-sm font-semibold text-neutral-900">File movement</h2>
                  <StatusBadge status={pipeline.status} size="md" />
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
                    <span>{done} of {steps.length} steps complete</span>
                    <span className="font-medium text-neutral-700">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500
                        ${pipeline.status === "COMPLETED"
                          ? "bg-green-400"
                          : "bg-yellow-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Steps */}
                <div>
                  {steps.map((step, i) => (
                    <StepCard
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

                {/* Completion notice */}
                {pipeline.status === "COMPLETED" && (
                  <div className="mt-5 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800 font-medium">
                    Pipeline complete. Letter has been marked as Completed.
                  </div>
                )}

                {/* Cancel */}
                {canManage && pipeline.status === "IN_PROGRESS" && (
                  <button
                    onClick={async () => {
                      if (!confirm("Cancel this pipeline? This action cannot be undone.")) return
                      const res = await cancelPipeline(pipeline.id)
                      showToast(res.ok ? "Pipeline cancelled." : res.error)
                    }}
                    className="mt-5 text-xs text-red-400 underline underline-offset-2 hover:text-red-600"
                  >
                    Cancel pipeline
                  </button>
                )}
              </div>

              {/* Right: summary */}
              <div className="flex flex-col gap-4">

                {/* Current holder */}
                <div className={`rounded-3xl ring-1 p-4
                  ${activeStep
                    ? "bg-yellow-50 ring-yellow-200/80"
                    : "bg-green-50 ring-green-200/80"}`}
                >
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">
                    Current holder
                  </p>
                  {activeStep ? (
                    <>
                      <p className="text-sm font-semibold text-neutral-900">
                        {activeStep.assigned_user?.full_name ?? "Unassigned"}
                      </p>
                      {activeStep.assigned_department && (
                        <p className="text-xs text-neutral-500 mt-0.5">{activeStep.assigned_department}</p>
                      )}
                      <p className="mt-2 text-xs text-neutral-600 font-medium">
                        Step {activeStep.step_order}: {activeStep.title}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-green-800">
                      Complete — no current holder
                    </p>
                  )}
                </div>

                {/* Next holder */}
                {nextStep && (
                  <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">
                      Next holder
                    </p>
                    <p className="text-sm font-medium text-neutral-800">
                      {nextStep.assigned_user?.full_name ?? "Unassigned"}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Step {nextStep.step_order}: {nextStep.title}
                    </p>
                  </div>
                )}

                {/* Summary */}
                <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">
                    Summary
                  </p>
                  {([
                    ["Steps",     steps.length],
                    ["Done",      done],
                    ["Remaining", steps.length - done],
                    ["Started",   fmtDate(pipeline.started_at)],
                  ] as [string, string | number][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1 text-xs">
                      <span className="text-neutral-500">{k}</span>
                      <span className="font-medium text-neutral-900">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Admin shortcut */}
                {canManage && (
                  <Link
                    href={`/pipeline/new?letter=${letter.id}`}
                    className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-4 text-xs
                      text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 transition-colors
                      text-center block"
                  >
                    Edit / replace pipeline
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Details tab ── */}
      {activeTab === "details" && (
        <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-6">
          <h2 className="text-sm font-semibold text-neutral-900 mb-5">Letter details</h2>
          {([
            ["Reference",    letter.ref_no],
            ["Subject",      letter.subject],
            ["From",         letter.sender_name],
            ["Date received",fmtDate(letter.date_received)],
            ["Department",   letter.recipient_department ?? "—"],
            ["Status",       letter.status],
            ["Access",       letter.confidentiality],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex gap-4 py-2.5 border-b border-neutral-100 last:border-0">
              <span className="w-36 flex-shrink-0 text-xs text-neutral-400">{k}</span>
              <span className="text-sm text-neutral-900 font-medium">
                {k === "Status" || k === "Access"
                  ? <StatusBadge status={v} size="md" />
                  : v}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Audit log tab ── */}
      {activeTab === "history" && (
        <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-6">
          <h2 className="text-sm font-semibold text-neutral-900 mb-5">Audit log</h2>
          {auditLog.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">No pipeline events logged yet.</p>
          ) : (
            <div>
              {auditLog.map((e: any, i: number) => (
                <div key={e.id ?? i}
                  className="flex gap-3 py-3 border-b border-neutral-100 last:border-0"
                >
                  <span className="mt-0.5 flex-shrink-0 rounded-lg bg-neutral-900 px-2 py-1
                    text-[10px] font-medium text-white h-fit whitespace-nowrap">
                    {AUDIT_LABELS[e.action] ?? e.action}
                  </span>
                  <div className="min-w-0">
                    {e.meta?.step_title && (
                      <p className="text-xs font-medium text-neutral-800 truncate">{e.meta.step_title}</p>
                    )}
                    {e.meta?.remarks && (
                      <p className="text-xs italic text-neutral-500 mt-0.5">{e.meta.remarks}</p>
                    )}
                    <p className="text-xs text-neutral-400 mt-1">
                      By{" "}
                      <span className="font-medium text-neutral-600">
                        {e.actor?.full_name ?? "—"}
                      </span>
                      {" · "}
                      {fmtDateTime(e.created_st)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}