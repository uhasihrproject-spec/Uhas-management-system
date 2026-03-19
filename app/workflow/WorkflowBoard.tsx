"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock3, Forward, Search, UserRound } from "lucide-react";

type WorkflowRow = {
  id: string;
  refNo: string;
  subject: string;
  confidentiality: string | null;
  letterStatus: string | null;
  createdAt: string | null;
  workflowStatus: "NOT_STARTED" | "IN_PROGRESS" | "DONE";
  currentStep: number;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
  completedByName: string | null;
  completedAt: string | null;
  lastActionAt: string | null;
  canAdvance: boolean;
  history: Array<{
    id: string;
    type: "STARTED" | "ROUTED" | "COMPLETED";
    stepNumber: number;
    actorName: string;
    fromUserName: string | null;
    toUserName: string | null;
    note: string | null;
    createdAt: string;
  }>;
};

type UserPick = {
  id: string;
  full_name: string | null;
  department: string | null;
  role?: string | null;
};

function statusTone(status: WorkflowRow["workflowStatus"]) {
  if (status === "DONE") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "IN_PROGRESS") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-neutral-100 text-neutral-700 ring-neutral-200";
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function WorkflowBoard({
  rows,
  currentUserId,
}: {
  rows: WorkflowRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "mine" | "active">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserPick[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [targetUser, setTargetUser] = useState<UserPick | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (scope === "mine" && row.currentAssigneeId !== currentUserId) return false;
      if (scope === "active" && row.workflowStatus !== "IN_PROGRESS") return false;
      if (!q) return true;
      return [row.refNo, row.subject, row.currentAssigneeName || ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, currentUserId, query, scope]);

  const selectedRow = filtered.find((row) => row.id === selectedId) || rows.find((row) => row.id === selectedId) || null;

  async function searchUsers(value: string) {
    setUserQuery(value);
    setError("");

    const q = value.trim();
    if (q.length < 2) {
      setUserResults([]);
      return;
    }

    setUserLoading(true);
    try {
      const res = await fetch(`/api/workflow/users?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to search users");
      setUserResults(Array.isArray(json?.users) ? json.users : []);
    } catch (e: any) {
      setError(e?.message || "Failed to search users");
    } finally {
      setUserLoading(false);
    }
  }

  async function submit(action: "ROUTE" | "COMPLETE") {
    if (!selectedRow) return;
    if (action === "ROUTE" && !targetUser) {
      setError("Select the next person before routing this letter.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterId: selectedRow.id,
          action,
          targetUserId: targetUser?.id || null,
          note,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Workflow update failed");

      setSelectedId(null);
      setNote("");
      setUserQuery("");
      setUserResults([]);
      setTargetUser(null);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Workflow update failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_420px]">
      <section className="rounded-3xl bg-white ring-1 ring-neutral-200/70 overflow-hidden">
        <div className="border-b border-neutral-200/70 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Letter workflow board</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Route work from one officer to the next and keep the full chain visible to everyone.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ref, subject, assignee..."
                  className="w-full rounded-2xl border border-neutral-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/15 sm:w-72"
                />
              </label>

              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as typeof scope)}
                className="rounded-2xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/15"
              >
                <option value="all">All visible letters</option>
                <option value="mine">Assigned to me</option>
                <option value="active">Only active workflows</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-neutral-200/70">
          {filtered.map((row) => {
            const isSelected = row.id === selectedId;
            return (
              <button
                type="button"
                key={row.id}
                onClick={() => {
                  setSelectedId(row.id);
                  setError("");
                  setNote("");
                  setTargetUser(null);
                  setUserQuery("");
                  setUserResults([]);
                }}
                className={`w-full p-5 text-left transition ${
                  isSelected ? "bg-emerald-50/60" : "hover:bg-neutral-50"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200">
                        {row.refNo}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusTone(row.workflowStatus)}`}>
                        {row.workflowStatus === "NOT_STARTED"
                          ? "Not started"
                          : row.workflowStatus === "DONE"
                          ? "Completed"
                          : `Step ${row.currentStep}`}
                      </span>
                      {row.currentAssigneeName ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200">
                          {row.currentAssigneeName}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-neutral-900">{row.subject || "Untitled letter"}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                      <span>Letter status: {row.letterStatus || "—"}</span>
                      <span>Confidentiality: {row.confidentiality || "—"}</span>
                      <span>Last workflow action: {fmtDate(row.lastActionAt || row.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                    <Link href={`/letters/${row.id}`} className="font-semibold text-emerald-700 hover:underline">
                      Open letter
                    </Link>
                    <span>{row.history.length} event{row.history.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </button>
            );
          })}

          {!filtered.length ? (
            <div className="p-8 text-sm text-neutral-600">No letters match this workflow view yet.</div>
          ) : null}
        </div>
      </section>

      <aside className="rounded-3xl bg-white ring-1 ring-neutral-200/70 overflow-hidden">
        <div className="border-b border-neutral-200/70 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-neutral-900">Workflow details</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Select a letter, choose the next person, and keep the chain moving until it is done.
          </p>
        </div>

        {selectedRow ? (
          <div className="p-5 sm:p-6 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200">
                  {selectedRow.refNo}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusTone(selectedRow.workflowStatus)}`}>
                  {selectedRow.workflowStatus === "IN_PROGRESS"
                    ? `Assigned to ${selectedRow.currentAssigneeName || "Unassigned"}`
                    : selectedRow.workflowStatus === "DONE"
                    ? `Completed by ${selectedRow.completedByName || "Unknown user"}`
                    : "Ready to start"}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-neutral-900">{selectedRow.subject || "Untitled letter"}</h3>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-neutral-900">Timeline</div>
              <div className="space-y-3">
                {selectedRow.history.length ? (
                  selectedRow.history.map((step) => (
                    <div key={step.id} className="rounded-2xl border border-neutral-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-neutral-900">
                            {step.type === "COMPLETED"
                              ? `Completed at step ${step.stepNumber}`
                              : `${step.type === "STARTED" ? "Started" : "Passed on"} to ${step.toUserName || "Next user"}`}
                          </div>
                          <div className="mt-1 text-xs text-neutral-500">
                            By {step.actorName} • {fmtDate(step.createdAt)}
                          </div>
                        </div>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-700 ring-1 ring-neutral-200">
                          Step {step.stepNumber}
                        </span>
                      </div>
                      {step.note ? <p className="mt-3 text-sm text-neutral-700">{step.note}</p> : null}
                      {step.fromUserName || step.toUserName ? (
                        <p className="mt-2 text-xs text-neutral-500">
                          {step.fromUserName ? `${step.fromUserName} → ` : ""}
                          {step.toUserName || "Done"}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-600">
                    No workflow steps yet. Start by assigning this letter to the first person.
                  </div>
                )}
              </div>
            </div>

            {selectedRow.canAdvance ? (
              <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">Advance this letter</div>
                  <p className="mt-1 text-xs text-neutral-600">
                    Route the letter to the next officer or mark it done when the work is complete.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-neutral-700">Find next person</label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      value={userQuery}
                      onChange={(e) => searchUsers(e.target.value)}
                      placeholder="Search staff, department, role..."
                      className="w-full rounded-2xl border border-neutral-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/15"
                    />
                  </div>
                  {userLoading ? <p className="mt-2 text-xs text-neutral-500">Searching users…</p> : null}
                  {targetUser ? (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-3">
                      <div className="text-sm font-semibold text-neutral-900">{targetUser.full_name || "Unnamed User"}</div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {targetUser.department || "No department"}
                        {targetUser.role ? ` • ${targetUser.role}` : ""}
                      </div>
                    </div>
                  ) : null}
                  {!targetUser && userResults.length ? (
                    <div className="mt-3 max-h-56 space-y-2 overflow-auto">
                      {userResults.map((user) => (
                        <button
                          type="button"
                          key={user.id}
                          onClick={() => {
                            setTargetUser(user);
                            setUserResults([]);
                            setUserQuery(user.full_name?.trim() || "Unnamed User");
                          }}
                          className="w-full rounded-2xl border border-neutral-200 bg-white p-3 text-left hover:border-emerald-200 hover:bg-emerald-50/60"
                        >
                          <div className="text-sm font-semibold text-neutral-900">{user.full_name || "Unnamed User"}</div>
                          <div className="mt-1 text-xs text-neutral-500">
                            {user.department || "No department"}
                            {user.role ? ` • ${user.role}` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-neutral-700">Hand-over note</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    placeholder="Add context, next action, or deadline."
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/15"
                  />
                </div>

                {error ? <p className="text-sm text-red-700">{error}</p> : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => submit("ROUTE")}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
                  >
                    <Forward className="h-4 w-4" />
                    Route to next person
                  </button>
                  <button
                    type="button"
                    onClick={() => submit("COMPLETE")}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark done
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                You can view this workflow, but only the current holder, an admin, or a secretary can pass it on.
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-sm text-neutral-600">
            Pick a letter from the board to see its current holder, full trail, and next action controls.
          </div>
        )}
      </aside>
    </div>
  );
}
