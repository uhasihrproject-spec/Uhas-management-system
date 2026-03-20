"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkflowSummary, Role } from "@/lib/workflow";

export default function WorkflowActions({ letterId, workflow, role, userId }: { letterId: string; workflow: WorkflowSummary; role: Role; userId: string; }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [nextUserId, setNextUserId] = useState("");
  const [error, setError] = useState("");

  if (!workflow.tableAvailable || !workflow.currentStep) return null;

  const canManage = role === "ADMIN" || role === "SECRETARY" || workflow.currentStep.user_id === userId;
  if (!canManage) return null;

  async function post(url: string, body: Record<string, unknown>) {
    setLoading(true); setError("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed");
      setNote(""); setNextUserId("");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Request failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-[0_20px_70px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Workflow actions</h3>
          <p className="mt-1 text-xs text-neutral-500">Assigned users can update progress. Secretaries and admins can hand off to the next handler.</p>
        </div>
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add handoff or completion notes" className="mt-4 min-h-24 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-emerald-300" />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button disabled={loading} onClick={() => post('/api/workflow/status', { letterId, status: 'IN_PROGRESS', notes: note })} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">Mark in progress</button>
        <button disabled={loading} onClick={() => post('/api/workflow/status', { letterId, status: 'DONE', notes: note })} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">Mark done</button>
      </div>
      {(role === "ADMIN" || role === "SECRETARY") ? (
        <div className="mt-4 rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/70">
          <label className="mb-2 block text-xs font-medium text-neutral-600">Pass to next user ID</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={nextUserId} onChange={(e) => setNextUserId(e.target.value)} placeholder="Paste next handler user ID" className="flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-300" />
            <button disabled={loading || !nextUserId.trim()} onClick={() => post('/api/workflow/pass', { letterId, nextUserId, notes: note })} className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 disabled:opacity-50">Pass forward</button>
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
