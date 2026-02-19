"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  Users,
  FileText,
  Lock,
  Building2,
  Globe,
  RefreshCw,
  Eye,
} from "lucide-react";

type Direction = "INCOMING" | "OUTGOING";
type Status = "RECEIVED" | "SCANNED" | "ASSIGNED" | "ARCHIVED";
type Conf = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";

type Dept =
  | "PROCUREMENT_DIRECTORATE"
  | "FINANCE_DIRECTORATE"
  | "HR_DIRECTORATE"
  | "ACADEMIC_AFFAIRS"
  | "REGISTRY"
  | "ICT"
  | "LEGAL"
  | "ESTATE"
  | "TRANSPORT"
  | "SECURITY";

const DEPTS: Array<{ value: Dept; label: string }> = [
  { value: "PROCUREMENT_DIRECTORATE", label: "Procurement Directorate" },
  { value: "FINANCE_DIRECTORATE", label: "Finance Directorate" },
  { value: "HR_DIRECTORATE", label: "HR Directorate" },
  { value: "ACADEMIC_AFFAIRS", label: "Academic Affairs" },
  { value: "REGISTRY", label: "Registry" },
  { value: "ICT", label: "ICT" },
  { value: "LEGAL", label: "Legal" },
  { value: "ESTATE", label: "Estate" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "SECURITY", label: "Security" },
];

type UserPick = {
  id: string;
  full_name: string | null;
  department: string | null;
  role?: string | null;
};

export type LetterEditInitial = {
  id: string;
  ref_no: string;
  direction: Direction;
  status: Status;
  confidentiality: Conf;
  date_received: string;
  date_on_letter: string | null;
  sender_name: string;
  sender_org: string | null;
  recipient_department: string | null;
  subject: string;
  summary: string | null;
  category: string | null;
  tags: string[] | null;
  file_name: string;
};

const inputCls =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all";

const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-emerald-100 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-200 active:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

function userLabel(u: UserPick) {
  return u.full_name?.trim() || "Unnamed User";
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-700 block mb-2">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t)) onClose();
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        ref={ref}
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-neutral-200 max-h-[90vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
            <p className="mt-0.5 text-sm text-neutral-600">
              Search and select who can view this letter
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function isDept(v: string | null | undefined): v is Dept {
  if (!v) return false;
  return DEPTS.some((d) => d.value === v);
}

export default function EditLetterForm({ initial }: { initial: LetterEditInitial }) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const [direction, setDirection] = useState<Direction>(initial.direction);
  const [status, setStatus] = useState<Status>(initial.status);

  const [confidentiality, setConfidentiality] = useState<Conf>(initial.confidentiality);
  const [previousConfidentiality, setPreviousConfidentiality] = useState<Conf>(
    initial.confidentiality
  );

  const [dateReceived, setDateReceived] = useState(initial.date_received || "");
  const [dateOnLetter, setDateOnLetter] = useState(initial.date_on_letter || "");

  const [senderName, setSenderName] = useState(initial.sender_name || "");
  const [senderOrg, setSenderOrg] = useState(initial.sender_org || "");

  // Dept: supports both text (incoming external dept) and internal dropdown
  const [deptText, setDeptText] = useState(() => {
    // If stored dept is NOT one of our internal enums, keep it as text
    return initial.direction === "INCOMING" && initial.recipient_department && !isDept(initial.recipient_department)
      ? initial.recipient_department
      : "";
  });

  const [internalDept, setInternalDept] = useState<Dept>(() => {
    // If stored dept is a known internal enum, use it (works for INTERNAL + OUTGOING)
    if (isDept(initial.recipient_department)) return initial.recipient_department;
    return "PROCUREMENT_DIRECTORATE";
  });

  const [subject, setSubject] = useState(initial.subject || "");
  const [summary, setSummary] = useState(initial.summary || "");
  const [category, setCategory] = useState(initial.category || "");
  const [tags, setTags] = useState(Array.isArray(initial.tags) ? initial.tags.join(", ") : "");

  const [newFile, setNewFile] = useState<File | null>(null);

  // show correct current file (initial can be stale)
  const [currentFileName, setCurrentFileName] = useState(initial.file_name || "—");
  const [loadingFileName, setLoadingFileName] = useState(false);

  // Recipients
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userLoading, setUserLoading] = useState(false);
  const [userResults, setUserResults] = useState<UserPick[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserPick[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const busy = saving || uploading;

  const tagsArr = useMemo(
    () =>
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tags]
  );

  const nameLabel = direction === "INCOMING" ? "Sender Name" : "Recipient Name";
  const orgLabel =
    direction === "INCOMING" ? "Sender Organization" : "Recipient Organization";
  const deptLabel = direction === "INCOMING" ? "From Department" : "Sending Department";

  // Keep dept fields in sync if direction flips
  useEffect(() => {
    // If OUTGOING, deptText irrelevant; if INCOMING, internalDept may still matter (INTERNAL letters)
    if (direction === "OUTGOING") {
      // best effort: if initial stored dept is internal enum, keep it
      if (isDept(initial.recipient_department)) setInternalDept(initial.recipient_department);
    } else {
      // INCOMING: if stored dept is NOT internal enum, keep text; else keep internalDept
      if (initial.recipient_department && !isDept(initial.recipient_department)) {
        setDeptText(initial.recipient_department);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  async function loadLatestFileName() {
    setLoadingFileName(true);
    try {
      // CHANGE THIS IF YOUR ENDPOINT IS DIFFERENT:
      const res = await fetch(`/api/letters/get?letter_id=${encodeURIComponent(initial.id)}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok) {
        const file = json?.letter?.file_name ?? json?.file_name ?? json?.fileName;
        if (typeof file === "string" && file.trim()) setCurrentFileName(file);
      }
    } catch {
      // ignore: fallback to initial.file_name
    } finally {
      setLoadingFileName(false);
    }
  }

  useEffect(() => {
    loadLatestFileName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  // Load recipients if confidential (this guarantees the same selected people show up)
  useEffect(() => {
    if (confidentiality !== "CONFIDENTIAL") return;

    setLoadingRecipients(true);
    fetch(`/api/letters/recipients/list?letter_id=${encodeURIComponent(initial.id)}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.recipients)) setSelectedUsers(data.recipients);
      })
      .catch(() => {})
      .finally(() => setLoadingRecipients(false));
  }, [initial.id, confidentiality]);

  // Search users in modal
  useEffect(() => {
    if (!recModalOpen) return;
    const q = userQuery.trim();
    if (q.length < 2) {
      setUserResults([]);
      return;
    }

    const t = window.setTimeout(async () => {
      setUserLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Search failed");

        const users: UserPick[] = Array.isArray(json?.users) ? json.users : [];
        const picked = new Set(selectedUsers.map((u) => u.id));
        setUserResults(users.filter((u) => !picked.has(u.id)));
      } catch (e: any) {
        setErr(e.message || "Failed to search users");
      } finally {
        setUserLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [userQuery, recModalOpen, selectedUsers]);

  function addUser(u: UserPick) {
    setSelectedUsers((prev) => (prev.some((x) => x.id === u.id) ? prev : [...prev, u]));
    setUserResults((prev) => prev.filter((x) => x.id !== u.id));
  }

  function removeUser(id: string) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  }

  function computeFinalDept() {
    // INTERNAL always uses internalDept (matches your create page behaviour)
    if (confidentiality === "INTERNAL") return internalDept;

    // OUTGOING uses internal dropdown; INCOMING uses text field (external dept)
    return direction === "OUTGOING" ? internalDept : deptText.trim();
  }

  async function saveFields() {
    setErr("");

    const finalDept = computeFinalDept();
    if (!finalDept) return setErr(`${deptLabel} is required.`);
    if (!senderName.trim()) return setErr(`${nameLabel} is required.`);
    if (!subject.trim()) return setErr("Subject is required.");
    if (confidentiality === "CONFIDENTIAL" && selectedUsers.length === 0) {
      return setErr("Add at least one recipient for Confidential letters.");
    }

    setSaving(true);
    try {
      const res = await fetch("/api/letters/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: initial.id,
          direction,
          status,
          confidentiality,
          date_received: dateReceived,
          date_on_letter: dateOnLetter || null,
          sender_name: senderName,
          sender_org: senderOrg || null,
          recipient_department: finalDept,
          subject,
          summary: summary || null,
          category: category || null,
          tags: tagsArr,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Update failed");

      // Confidential recipients sync
      if (previousConfidentiality !== "CONFIDENTIAL" && confidentiality === "CONFIDENTIAL") {
        if (selectedUsers.length > 0) {
          await fetch("/api/letters/recipients/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              letter_id: initial.id,
              user_ids: selectedUsers.map((u) => u.id),
            }),
          });
        }
      } else if (previousConfidentiality === "CONFIDENTIAL" && confidentiality !== "CONFIDENTIAL") {
        await fetch("/api/letters/recipients/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ letter_id: initial.id }),
        });
      } else if (confidentiality === "CONFIDENTIAL") {
        await fetch("/api/letters/recipients/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ letter_id: initial.id }),
        });

        if (selectedUsers.length > 0) {
          await fetch("/api/letters/recipients/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              letter_id: initial.id,
              user_ids: selectedUsers.map((u) => u.id),
            }),
          });
        }
      }

      router.push(`/letters/${initial.id}`);
      router.refresh();
    } catch (e: any) {
      setErr(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function replaceScan() {
    if (!newFile) return setErr("Choose a file first.");
    setErr("");
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", newFile);
      fd.append("letterId", initial.id);
      fd.append("refNo", initial.ref_no);

      const res = await fetch("/api/letters/replace-scan", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Replace scan failed");

      // refresh correct file name
      await loadLatestFileName();

      router.push(`/letters/${initial.id}`);
      router.refresh();
    } catch (e: any) {
      setErr(e.message || "Replace scan failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Edit Letter</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Update letter details and replace the scanned document if needed
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 self-start">
              <Lock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-medium text-emerald-700">Secure</span>
            </div>
          </div>
        </div>

        {/* Reference */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-neutral-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-neutral-900">Reference Number</h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={initial.ref_no}
              readOnly
              className={`${inputCls} flex-1 font-mono text-sm bg-neutral-50`}
            />
            <button
              type="button"
              onClick={() => router.push(`/letters/${initial.id}`)}
              className={btnGhost}
              disabled={busy}
            >
              <Eye className="w-4 h-4" />
              View Letter
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">Ref No is fixed after creation.</p>
        </div>

        {/* Visibility Control (matches create form) */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-200 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-neutral-900">Who Can View This?</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <button
              type="button"
              onClick={() => {
                setPreviousConfidentiality(confidentiality);
                setConfidentiality("PUBLIC");
              }}
              disabled={busy}
              className={`p-4 rounded-xl border-2 transition-all text-center disabled:opacity-60 disabled:cursor-not-allowed ${
                confidentiality === "PUBLIC"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <Globe
                className={`w-6 h-6 mx-auto mb-2 ${
                  confidentiality === "PUBLIC" ? "text-emerald-600" : "text-neutral-400"
                }`}
              />
              <div className="text-sm font-medium text-neutral-900">Public</div>
              <div className="text-xs text-neutral-600 mt-1">Everyone can view</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviousConfidentiality(confidentiality);
                setConfidentiality("INTERNAL");
              }}
              disabled={busy}
              className={`p-4 rounded-xl border-2 transition-all text-center disabled:opacity-60 disabled:cursor-not-allowed ${
                confidentiality === "INTERNAL"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <Building2
                className={`w-6 h-6 mx-auto mb-2 ${
                  confidentiality === "INTERNAL" ? "text-emerald-600" : "text-neutral-400"
                }`}
              />
              <div className="text-sm font-medium text-neutral-900">Internal</div>
              <div className="text-xs text-neutral-600 mt-1">One department</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviousConfidentiality(confidentiality);
                setConfidentiality("CONFIDENTIAL");
              }}
              disabled={busy}
              className={`p-4 rounded-xl border-2 transition-all text-center disabled:opacity-60 disabled:cursor-not-allowed ${
                confidentiality === "CONFIDENTIAL"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <Lock
                className={`w-6 h-6 mx-auto mb-2 ${
                  confidentiality === "CONFIDENTIAL" ? "text-emerald-600" : "text-neutral-400"
                }`}
              />
              <div className="text-sm font-medium text-neutral-900">Confidential</div>
              <div className="text-xs text-neutral-600 mt-1">Select users</div>
            </button>
          </div>

          <div className="rounded-xl bg-white border border-neutral-200 p-4">
            {confidentiality === "PUBLIC" && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-sm text-neutral-700">
                  All departments and staff can view
                </span>
              </div>
            )}

            {confidentiality === "INTERNAL" && (
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-2">
                  Select Department
                </label>
                <select
                  value={internalDept}
                  onChange={(e) => setInternalDept(e.target.value as Dept)}
                  className={inputCls}
                  disabled={busy}
                >
                  {DEPTS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {confidentiality === "CONFIDENTIAL" && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <span className="text-xs font-medium text-neutral-700">
                    {loadingRecipients
                      ? "Loading recipients..."
                      : `${selectedUsers.length} recipient${selectedUsers.length !== 1 ? "s" : ""} selected`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRecModalOpen(true)}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-sm font-medium text-emerald-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Users className="w-4 h-4" />
                    Manage Recipients
                  </button>
                </div>

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 text-sm"
                      >
                        <span className="font-medium text-neutral-800 text-xs sm:text-sm">
                          {userLabel(u)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeUser(u.id)}
                          disabled={busy}
                          className="hover:bg-neutral-200 active:bg-neutral-300 rounded p-0.5 transition-colors flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <X className="w-3 h-3 text-neutral-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Letter Details */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Letter Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Direction">
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as Direction)}
                className={inputCls}
                disabled={busy}
              >
                <option value="INCOMING">Incoming</option>
                <option value="OUTGOING">Outgoing</option>
              </select>
            </Field>

            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className={inputCls}
                disabled={busy}
              >
                <option value="RECEIVED">Received</option>
                <option value="SCANNED">Scanned</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </Field>

            <Field label="Date Received" required>
              <input
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className={inputCls}
                disabled={busy}
              />
            </Field>

            <Field label="Date on Letter">
              <input
                type="date"
                value={dateOnLetter}
                onChange={(e) => setDateOnLetter(e.target.value)}
                className={inputCls}
                disabled={busy}
              />
            </Field>

            <Field label={nameLabel} required>
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className={inputCls}
                disabled={busy}
              />
            </Field>

            <Field label={orgLabel}>
              <input
                value={senderOrg}
                onChange={(e) => setSenderOrg(e.target.value)}
                className={inputCls}
                disabled={busy}
              />
            </Field>

            <Field label={deptLabel} required>
              {confidentiality === "INTERNAL" || direction === "OUTGOING" ? (
                <select
                  value={internalDept}
                  onChange={(e) => setInternalDept(e.target.value as Dept)}
                  className={inputCls}
                  disabled={busy}
                >
                  {DEPTS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={deptText}
                  onChange={(e) => setDeptText(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Finance Ministry"
                  disabled={busy}
                />
              )}
            </Field>

            <div className="sm:col-span-2">
              <Field label="Subject" required>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputCls}
                  disabled={busy}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Summary / Notes">
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className={`${inputCls} min-h-[100px] resize-y`}
                  disabled={busy}
                />
              </Field>
            </div>

            <Field label="Category">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls}
                disabled={busy}
              />
            </Field>

            <Field label="Tags">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className={inputCls}
                disabled={busy}
              />
            </Field>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700 flex-1">{err}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push(`/letters/${initial.id}`)}
            className={btnSecondary}
            disabled={busy}
          >
            Cancel
          </button>

          <button type="button" onClick={saveFields} disabled={busy} className={btnPrimary}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Replace Scan */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-neutral-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-neutral-900">Replace Scanned Letter</h3>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 transition-all ${
              newFile
                ? "border-emerald-300 bg-emerald-50"
                : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100"
            }`}
          >
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="text-center pointer-events-none">
              {newFile ? (
                <>
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-900 break-all px-2">
                    {newFile.name}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {(newFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-neutral-400" />
                  <p className="text-sm font-medium text-neutral-900">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">PDF, JPG or PNG</p>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-neutral-500">
              Current:{" "}
              <span className="font-medium text-neutral-700">
                {loadingFileName ? "Loading..." : currentFileName}
              </span>
            </p>

            <button
              type="button"
              onClick={replaceScan}
              disabled={busy || !newFile}
              className={`${btnGhost} rounded-full px-6 py-3 font-semibold text-neutral-800`}
            >
              <RefreshCw className="w-4 h-4" />
              {uploading ? "Uploading..." : "Replace Scan"}
            </button>
          </div>
        </div>
      </div>

      {/* Recipient Modal */}
      <Modal open={recModalOpen} title="Manage Recipients" onClose={() => setRecModalOpen(false)}>
        <div className="space-y-4">
          {selectedUsers.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-medium text-neutral-700 mb-3">
                Selected ({selectedUsers.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => removeUser(u.id)}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 hover:border-red-300 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed group"
                  >
                    <span className="text-sm font-medium text-neutral-800">{userLabel(u)}</span>
                    <X className="w-3.5 h-3.5 text-neutral-400 group-hover:text-red-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-2">Search Users</label>
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className={inputCls}
              placeholder="Type name or department (min 2 characters)"
              disabled={busy}
            />
          </div>

          <div className="rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200">
              <span className="text-xs font-medium text-neutral-600">
                {userLoading ? "Searching..." : "Results"}
              </span>
            </div>

            <div className="max-h-64 overflow-auto">
              {userResults.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-neutral-500">
                  {userQuery.length < 2 ? "Type to search..." : "No users found"}
                </div>
              ) : (
                userResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => addUser(u)}
                    disabled={busy}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 active:bg-emerald-100 border-b border-neutral-100 last:border-b-0 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="text-sm font-medium text-neutral-900">{userLabel(u)}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {u.department || "No department"} {u.role && `• ${u.role}`}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
