"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Users, Building2, Globe, Lock, FileText } from "lucide-react";

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

type UserPick = {
  id: string;
  full_name: string | null;
  department: string | null;
  role?: string | null;
};

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

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const inputCls =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all";

function userLabel(u: UserPick) {
  return u.full_name?.trim() || "Unnamed User";
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
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function NewLetterForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetchingRef, setFetchingRef] = useState(false);
  const [err, setErr] = useState("");

  const [refNo, setRefNo] = useState("");
  const [direction, setDirection] = useState<Direction>("INCOMING");
  const [status, setStatus] = useState<Status>("RECEIVED");
  const [dateReceived, setDateReceived] = useState(todayISO());
  const [dateOnLetter, setDateOnLetter] = useState("");

  const [senderName, setSenderName] = useState("");
  const [senderOrg, setSenderOrg] = useState("");

  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");

  // Department: text for INCOMING, dropdown for OUTGOING
  const [deptText, setDeptText] = useState("");
  const [internalDept, setInternalDept] = useState<Dept>("PROCUREMENT_DIRECTORATE");

  const [confidentiality, setConfidentiality] = useState<Conf>("INTERNAL");

  const [file, setFile] = useState<File | null>(null);

  const [recModalOpen, setRecModalOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userLoading, setUserLoading] = useState(false);
  const [userResults, setUserResults] = useState<UserPick[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserPick[]>([]);

  const year = useMemo(() => new Date(dateReceived).getFullYear(), [dateReceived]);

  // Direction-based labels
  const nameLabel = direction === "INCOMING" ? "Sender Name" : "Recipient Name";
  const orgLabel = direction === "INCOMING" ? "Sender Organization" : "Recipient Organization";
  const deptLabel = direction === "INCOMING" ? "From Department" : "Sending Department";

  async function loadNextRef() {
    setErr("");
    setFetchingRef(true);
    try {
      const res = await fetch("/api/letters/next-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, year }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to generate ref");
      setRefNo(json.refNo);
    } catch (e: any) {
      setErr(e.message || "Failed to generate reference number");
    } finally {
      setFetchingRef(false);
    }
  }

  useEffect(() => {
    loadNextRef();
  }, [direction, year]);

  useEffect(() => {
    setErr("");
    if (confidentiality !== "CONFIDENTIAL") {
      setSelectedUsers([]);
      setUserQuery("");
      setUserResults([]);
      setRecModalOpen(false);
    }
  }, [confidentiality]);

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
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
   
    if (loading) return;
    if (!refNo.trim()) return setErr("Reference number is missing.");
    if (!senderName.trim()) return setErr(`${nameLabel} is required.`);
    if (!subject.trim()) return setErr("Subject is required.");
    if (!file) return setErr("Please upload the scanned letter (PDF/JPG/PNG).");

    // Department validation
    const finalDept = direction === "OUTGOING" ? internalDept : deptText.trim();
    if (!finalDept) {
      return setErr(`${deptLabel} is required.`);
    }

    if (confidentiality === "INTERNAL" && !internalDept) {
      return setErr("Select a department/directorate for Internal letters.");
    }
    if (confidentiality === "CONFIDENTIAL" && selectedUsers.length === 0) {
      return setErr("Add at least one recipient for Confidential letters.");
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("refNo", refNo);

      const upRes = await fetch("/api/letters/upload", { method: "POST", body: fd });
      const upJson = await upRes.json();
      if (!upRes.ok) throw new Error(upJson?.error || "Upload failed");

      const payload = {
        ref_no: refNo,
        direction,
        date_received: dateReceived,
        date_on_letter: dateOnLetter || null,
        sender_name: senderName,
        sender_org: senderOrg || null,
        subject,
        summary: summary || null,
        category: category || null,
        confidentiality,
        status,
        recipient_department: finalDept, // ✅ Always filled based on direction
        recipient_user_ids: confidentiality === "CONFIDENTIAL" ? selectedUsers.map((u) => u.id) : [],
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        file_bucket: upJson.fileBucket,
        file_path: upJson.filePath,
        file_name: upJson.fileName,
        mime_type: upJson.mimeType,
      };

      const crRes = await fetch("/api/letters/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const crJson = await crRes.json();
      if (!crRes.ok) throw new Error(crJson?.error || "Failed to create record");

      router.push("/letters");
      router.refresh();
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">New Letter</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Record a new incoming or outgoing letter
              </p>
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 self-start">
              <Lock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-medium text-emerald-700">Secure</span>
            </div>
          </div>
        </div>

        {/* Reference Number */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-neutral-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-neutral-900">Reference Number</h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              className={`${inputCls} flex-1 font-mono text-sm`}
              placeholder="UHAS/PROC/IN/2026/0001"
            />
            <button
              type="button"
              onClick={loadNextRef}
              disabled={fetchingRef || loading}
              className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-medium text-neutral-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {fetchingRef ? "Generating..." : "Auto Generate"}
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Auto-generated based on direction and year
          </p>
        </div>

        {/* Visibility Control */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-200 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-neutral-900">Who Can View This?</h3>
          </div>

          {/* Visibility Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setConfidentiality("PUBLIC")}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                confidentiality === "PUBLIC"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <Globe className={`w-6 h-6 mx-auto mb-2 ${confidentiality === "PUBLIC" ? "text-emerald-600" : "text-neutral-400"}`} />
              <div className="text-sm font-medium text-neutral-900">Public</div>
              <div className="text-xs text-neutral-600 mt-1">Everyone can view</div>
            </button>

            <button
              type="button"
              onClick={() => setConfidentiality("INTERNAL")}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                confidentiality === "INTERNAL"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <Building2 className={`w-6 h-6 mx-auto mb-2 ${confidentiality === "INTERNAL" ? "text-emerald-600" : "text-neutral-400"}`} />
              <div className="text-sm font-medium text-neutral-900">Internal</div>
              <div className="text-xs text-neutral-600 mt-1">One department</div>
            </button>

            <button
              type="button"
              onClick={() => setConfidentiality("CONFIDENTIAL")}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                confidentiality === "CONFIDENTIAL"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <Lock className={`w-6 h-6 mx-auto mb-2 ${confidentiality === "CONFIDENTIAL" ? "text-emerald-600" : "text-neutral-400"}`} />
              <div className="text-sm font-medium text-neutral-900">Confidential</div>
              <div className="text-xs text-neutral-600 mt-1">Select users</div>
            </button>
          </div>

          {/* Audience Selection */}
          <div className="rounded-xl bg-white border border-neutral-200 p-4">
            {confidentiality === "PUBLIC" && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-sm text-neutral-700">All departments and staff can view</span>
              </div>
            )}

            {confidentiality === "INTERNAL" && (
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-2">Select Department</label>
                <select
                  value={internalDept}
                  onChange={(e) => setInternalDept(e.target.value as Dept)}
                  className={inputCls}
                  required
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
                    {selectedUsers.length} recipient{selectedUsers.length !== 1 ? "s" : ""} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setRecModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-sm font-medium text-emerald-800 transition-colors"
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
                        <span className="font-medium text-neutral-800 text-xs sm:text-sm">{userLabel(u)}</span>
                        <button
                          type="button"
                          onClick={() => removeUser(u.id)}
                          className="hover:bg-neutral-200 rounded p-0.5 transition-colors flex-shrink-0"
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
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-2">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as Direction)}
                className={inputCls}
              >
                <option value="INCOMING">Incoming</option>
                <option value="OUTGOING">Outgoing</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className={inputCls}
              >
                <option value="RECEIVED">Received</option>
                <option value="SCANNED">Scanned</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-2">
                Date Received <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-2">
                Date on Letter
              </label>
              <input
                type="date"
                value={dateOnLetter}
                onChange={(e) => setDateOnLetter(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-2">
                {nameLabel} <span className="text-red-500">*</span>
              </label>
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className={inputCls}
                placeholder="e.g. John Mensah"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-2">
                {orgLabel}
              </label>
              <input
                value={senderOrg}
                onChange={(e) => setSenderOrg(e.target.value)}
                className={inputCls}
                placeholder="e.g. ABC Supplies Ltd"
              />
            </div>

            {/* Department field - changes based on direction */}
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-2">
                {deptLabel} <span className="text-red-500">*</span>
              </label>
              {direction === "OUTGOING" ? (
                <select
                  value={internalDept}
                  onChange={(e) => setInternalDept(e.target.value as Dept)}
                  className={inputCls}
                  required
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
                  required
                />
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-neutral-700 block mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputCls}
                placeholder="Brief description of the letter"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-neutral-700 block mb-2">
                Summary / Notes
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className={`${inputCls} min-h-[100px] resize-y`}
                placeholder="Additional details, action required, etc..."
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-2">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls}
                placeholder="e.g. Tender, Invoice"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-2">Tags</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className={inputCls}
                placeholder="urgent, procurement"
              />
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-neutral-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-neutral-900">
              Upload Scanned Letter <span className="text-red-500">*</span>
            </h3>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 transition-all ${
              file
                ? "border-emerald-300 bg-emerald-50"
                : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100"
            }`}
          >
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              required
            />

            <div className="text-center pointer-events-none">
              {file ? (
                <>
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-900 break-all px-2">{file.name}</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-neutral-400" />
                  <p className="text-sm font-medium text-neutral-900">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">PDF, JPG or PNG (max 10MB)</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 flex-1">{err}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pb-8">
          <button
            type="button"
            onClick={() => router.push("/letters")}
            className="w-full sm:w-auto px-6 py-3 rounded-full border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-emerald-100 text-black text-sm font-semibold hover:bg-emerald-200 disabled:opacity-50 transition-all"
          >
            {loading ? "Saving..." : "Save Letter"}
          </button>
        </div>
      </form>

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
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 hover:border-red-300 hover:bg-red-50 transition-all group"
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
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-neutral-100 last:border-b-0 transition-colors"
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