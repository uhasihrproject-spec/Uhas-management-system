"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Direction = "INCOMING" | "OUTGOING";
type Status = "RECEIVED" | "SCANNED" | "ASSIGNED" | "ARCHIVED";
type Conf = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-xs font-medium text-neutral-700">{label}</label>
        {hint ? <span className="text-[11px] text-neutral-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15";
const selectCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15";

export default function NewLetterForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [refNo, setRefNo] = useState("");
  const [fetchingRef, setFetchingRef] = useState(false);
  const [err, setErr] = useState("");

  const [direction, setDirection] = useState<Direction>("INCOMING");
  const [dateReceived, setDateReceived] = useState(todayISO());
  const [dateOnLetter, setDateOnLetter] = useState("");

  const [senderName, setSenderName] = useState("");
  const [senderOrg, setSenderOrg] = useState("");
  const [recipientDepartment, setRecipientDepartment] = useState("Procurement");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [confidentiality, setConfidentiality] = useState<Conf>("INTERNAL");
  const [status, setStatus] = useState<Status>("RECEIVED");
  const [tags, setTags] = useState("");

  const [file, setFile] = useState<File | null>(null);

  const year = useMemo(() => new Date(dateReceived).getFullYear(), [dateReceived]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, year]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    if (!refNo.trim()) return setErr("Reference number is missing.");
    if (!senderName.trim()) return setErr("Sender name is required.");
    if (!recipientDepartment.trim()) return setErr("Recipient department is required.");
    if (!subject.trim()) return setErr("Subject is required.");
    if (!file) return setErr("Please upload the scanned letter (PDF/JPG/PNG).");

    setLoading(true);

    try {
      // Upload file (private bucket)
      const fd = new FormData();
      fd.append("file", file);
      fd.append("refNo", refNo);

      const upRes = await fetch("/api/letters/upload", {
        method: "POST",
        body: fd,
      });
      const upJson = await upRes.json();
      if (!upRes.ok) throw new Error(upJson?.error || "Upload failed");

      // Create record
      const payload = {
        ref_no: refNo,
        direction,
        date_received: dateReceived,
        date_on_letter: dateOnLetter || null,
        sender_name: senderName,
        sender_org: senderOrg || null,
        recipient_department: recipientDepartment,
        subject,
        summary: summary || null,
        category: category || null,
        confidentiality,
        status,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        file_bucket: upJson.fileBucket,
        file_path: upJson.filePath,
        file_name: upJson.fileName,
        mime_type: upJson.mimeType,
      };

      const crRes = await fetch("/api/letters/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    <form onSubmit={onSubmit} className="text-neutral-700 rounded-3xl bg-white ring-1 ring-neutral-200/70">
      {/* Header bar */}
      <div className="p-5 sm:p-6 border-b border-neutral-200/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Letter Details</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Fill the metadata and upload the scan.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-emerald-100">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Private storage • signed links
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">
        {/* Responsive grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Ref No - full width */}
          <div className="md:col-span-2">
            <Field label="Reference Number" hint="Auto is recommended">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className={inputCls}
                  placeholder="UHAS/PROC/IN/2026/0001"
                />
                <button
                  type="button"
                  onClick={loadNextRef}
                  disabled={fetchingRef || loading}
                  className="rounded-2xl px-4 py-3 text-sm font-medium border border-neutral-200 hover:bg-neutral-50 disabled:opacity-60 sm:w-[110px]"
                >
                  {fetchingRef ? "..." : "Auto"}
                </button>
              </div>
            </Field>
          </div>

          <Field label="Direction">
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as Direction)}
              className={selectCls}
            >
              <option value="INCOMING">Incoming</option>
              <option value="OUTGOING">Outgoing</option>
            </select>
          </Field>

          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className={selectCls}
            >
              <option value="RECEIVED">Received</option>
              <option value="SCANNED">Scanned</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>

          <Field label="Date Received">
            <input
              type="date"
              value={dateReceived}
              onChange={(e) => setDateReceived(e.target.value)}
              className={inputCls}
              required
            />
          </Field>

          <Field label="Date on Letter (optional)">
            <input
              type="date"
              value={dateOnLetter}
              onChange={(e) => setDateOnLetter(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Sender Name">
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className={inputCls}
              placeholder="e.g., Kwame Mensah"
              required
            />
          </Field>

          <Field label="Sender Organisation (optional)">
            <input
              value={senderOrg}
              onChange={(e) => setSenderOrg(e.target.value)}
              className={inputCls}
              placeholder="e.g., ABC Supplies Ltd."
            />
          </Field>

          <Field label="Recipient Department">
            <input
              value={recipientDepartment}
              onChange={(e) => setRecipientDepartment(e.target.value)}
              className={inputCls}
              placeholder="Procurement"
              required
            />
          </Field>

          <Field label="Confidentiality">
            <select
              value={confidentiality}
              onChange={(e) => setConfidentiality(e.target.value as Conf)}
              className={selectCls}
            >
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="CONFIDENTIAL">Confidential</option>
            </select>
          </Field>

          {/* Subject full width */}
          <div className="md:col-span-2">
            <Field label="Subject">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputCls}
                placeholder="Short title of the letter"
                required
              />
            </Field>
          </div>

          {/* Summary full width */}
          <div className="md:col-span-2">
            <Field label="Description / Summary (optional)">
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className={`${inputCls} min-h-[120px]`}
                placeholder="Key details, action needed, notes..."
              />
            </Field>
          </div>

          <Field label="Category (optional)">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
              placeholder="Tender / Supplier / Memo / etc."
            />
          </Field>

          <Field label="Tags (comma-separated, optional)" hint="e.g. urgent, invoice">
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={inputCls}
              placeholder="urgent, invoice, procurement"
            />
          </Field>

          {/* Upload full width */}
          <div className="md:col-span-2">
            <Field label="Upload Scan" hint="PDF / JPG / PNG">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm"
                required
              />
              {file ? (
                <p className="text-xs text-neutral-500">
                  Selected: <span className="font-medium text-neutral-700">{file.name}</span>
                </p>
              ) : null}
            </Field>
          </div>
        </div>

        {err ? (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
            <p className="text-sm text-red-700">{err}</p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push("/letters")}
            className="w-full sm:w-auto rounded-2xl px-4 py-3 text-sm font-medium border border-neutral-200 hover:bg-neutral-50"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto rounded-2xl px-5 py-3 text-sm font-medium text-white
                       btn-brand btn-brand:hover disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Letter"}
          </button>
        </div>
      </div>
    </form>
  );
}
