"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Direction = "INCOMING" | "OUTGOING";
type Status = "RECEIVED" | "SCANNED" | "ASSIGNED" | "ARCHIVED";
type Conf = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";

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
  recipient_department: string;
  subject: string;
  summary: string | null;
  category: string | null;
  tags: string[] | null;
  file_name: string;
};

const inputCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15";
const selectCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  );
}

export default function EditLetterForm({ initial }: { initial: LetterEditInitial }) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const [direction, setDirection] = useState<Direction>(initial.direction);
  const [status, setStatus] = useState<Status>(initial.status);
  const [confidentiality, setConfidentiality] = useState<Conf>(initial.confidentiality);

  const [dateReceived, setDateReceived] = useState(initial.date_received || "");
  const [dateOnLetter, setDateOnLetter] = useState(initial.date_on_letter || "");

  const [senderName, setSenderName] = useState(initial.sender_name || "");
  const [senderOrg, setSenderOrg] = useState(initial.sender_org || "");
  const [recipientDepartment, setRecipientDepartment] = useState(initial.recipient_department || "");
  const [subject, setSubject] = useState(initial.subject || "");
  const [summary, setSummary] = useState(initial.summary || "");
  const [category, setCategory] = useState(initial.category || "");
  const [tags, setTags] = useState(Array.isArray(initial.tags) ? initial.tags.join(", ") : "");

  const [newFile, setNewFile] = useState<File | null>(null);

  const busy = saving || uploading;

  const tagsArr = useMemo(
    () =>
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tags]
  );

  async function saveFields() {
    setErr("");
    setSaving(true);
    try {
      const res = await fetch("/api/letters/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initial.id,
          direction,
          status,
          confidentiality,
          date_received: dateReceived,
          date_on_letter: dateOnLetter || null,
          sender_name: senderName,
          sender_org: senderOrg || null,
          recipient_department: recipientDepartment,
          subject,
          summary: summary || null,
          category: category || null,
          tags: tagsArr,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Update failed");

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

      const res = await fetch("/api/letters/replace-scan", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Replace scan failed");

      router.push(`/letters/${initial.id}`);
      router.refresh();
    } catch (e: any) {
      setErr(e.message || "Replace scan failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70 text-neutral-900">
        <h2 className="text-sm font-semibold">Update details</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Direction">
            <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className={selectCls}>
              <option value="INCOMING">Incoming</option>
              <option value="OUTGOING">Outgoing</option>
            </select>
          </Field>

          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={selectCls}>
              <option value="RECEIVED">Received</option>
              <option value="SCANNED">Scanned</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>

          <Field label="Date Received">
            <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Date on Letter (optional)">
            <input type="date" value={dateOnLetter} onChange={(e) => setDateOnLetter(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Sender Name">
            <input value={senderName} onChange={(e) => setSenderName(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Sender Organisation (optional)">
            <input value={senderOrg} onChange={(e) => setSenderOrg(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Recipient Department">
            <input value={recipientDepartment} onChange={(e) => setRecipientDepartment(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Confidentiality">
            <select value={confidentiality} onChange={(e) => setConfidentiality(e.target.value as Conf)} className={selectCls}>
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="CONFIDENTIAL">Confidential</option>
            </select>
          </Field>

          <div className="md:col-span-2">
            <Field label="Subject">
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Summary (optional)">
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className={`${inputCls} min-h-30`} />
            </Field>
          </div>

          <Field label="Category (optional)">
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Tags (comma-separated)">
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
            <p className="text-sm text-red-700">{err}</p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={() => router.push(`/letters/${initial.id}`)}
            type="button"
            className="w-full sm:w-auto rounded-2xl px-4 py-3 text-sm font-medium border border-neutral-200 hover:bg-neutral-50"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            onClick={saveFields}
            type="button"
            disabled={busy}
            className="w-full sm:w-auto rounded-2xl px-5 py-3 text-sm font-medium text-black
             bg-emerald-100 hover:brightness-95 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70 text-neutral-900">
        <h2 className="text-sm font-semibold">Replace scanned document</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Upload a new scan to overwrite the existing one.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
          <div>
            <label className="text-xs font-medium text-neutral-700">Choose file (PDF/JPG/PNG)</label>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={replaceScan}
            disabled={busy || !newFile}
            className="w-full rounded-2xl px-5 py-3 text-sm font-medium text-white
            bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Replace Scan"}
          </button>
        </div>

        <p className="mt-3 text-xs text-neutral-500">
          Current: <span className="font-medium text-neutral-700">{initial.file_name}</span>
        </p>
      </div>
    </div>
  );
}
