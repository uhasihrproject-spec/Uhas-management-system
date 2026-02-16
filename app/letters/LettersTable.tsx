"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Direction = "INCOMING" | "OUTGOING";
type Status = "RECEIVED" | "SCANNED" | "ASSIGNED" | "ARCHIVED";
type Conf = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";

type Row = {
  // id may be named differently depending on your DB
  id?: string | null;
  letter_id?: string | null;
  uuid?: string | null;

  ref_no?: string | null;
  direction?: Direction | null;
  date_received?: string | null;
  sender_name?: string | null;
  recipient_department?: string | null;
  subject?: string | null;
  status?: Status | null;
  confidentiality?: Conf | null;

  created_at?: string | null;
};

function isUuidLike(v: unknown) {
  if (typeof v !== "string") return false;
  // simple uuid check: 8-4-4-4-12 hex
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function getRowId(r: Row) {
  const candidate =
    r.id ?? r.letter_id ?? r.uuid ?? null;

  // only accept uuid-like ids to avoid pushing bad routes
  return isUuidLike(candidate) ? candidate : null;
}

function Pill({
  text,
  tone,
}: {
  text: string;
  tone: "green" | "yellow" | "gray" | "red";
}) {
  const cls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "yellow"
      ? "bg-amber-50 text-amber-800 ring-amber-100"
      : tone === "red"
      ? "bg-red-50 text-red-700 ring-red-100"
      : "bg-neutral-100 text-neutral-700 ring-neutral-200";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ring-1 ${cls}`}>
      {text}
    </span>
  );
}

function toneForStatus(s?: Status | null) {
  if (!s) return "gray";
  if (s === "ARCHIVED") return "gray";
  if (s === "ASSIGNED") return "yellow";
  if (s === "SCANNED") return "green";
  return "red";
}

function fmtDirection(d?: Direction | null) {
  if (!d) return "—";
  return d === "INCOMING" ? "Incoming" : "Outgoing";
}

export default function LettersTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [localQ, setLocalQ] = useState(sp.get("q") || "");

  const direction = sp.get("direction") || "";
  const status = sp.get("status") || "";
  const conf = sp.get("conf") || "";

  const shown = useMemo(() => rows ?? [], [rows]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`/letters?${params.toString()}`);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setParam("q", localQ.trim());
  }

  function clearAll() {
    router.push("/letters");
  }

  function goToLetter(r: Row) {
    const id = getRowId(r);
    if (!id) return; // do nothing (prevents /undefined)
    router.push(`/letters/${id}`);
  }

  const total = shown.length;

  return (
    <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 sm:p-5 border-b border-neutral-200/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={submitSearch} className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Search ref, sender, subject, department..."
              className="w-full lg:w-[420px] rounded-2xl border border-neutral-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15"
            />
            <button className="w-full sm:w-auto rounded-2xl px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-amber-500 hover:brightness-95">
              Search
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            <select
              value={direction}
              onChange={(e) => setParam("direction", e.target.value)}
              className="w-full sm:w-auto rounded-2xl border border-neutral-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">All Directions</option>
              <option value="INCOMING">Incoming</option>
              <option value="OUTGOING">Outgoing</option>
            </select>

            <select
              value={status}
              onChange={(e) => setParam("status", e.target.value)}
              className="w-full sm:w-auto rounded-2xl border border-neutral-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">All Status</option>
              <option value="RECEIVED">Received</option>
              <option value="SCANNED">Scanned</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <select
              value={conf}
              onChange={(e) => setParam("conf", e.target.value)}
              className="w-full sm:w-auto rounded-2xl border border-neutral-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">All Confidentiality</option>
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="CONFIDENTIAL">Confidential</option>
            </select>

            <button
              type="button"
              onClick={clearAll}
              className="w-full sm:w-auto rounded-2xl border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-neutral-500">
          Showing <span className="font-medium text-neutral-700">{total}</span> letters
        </div>
      </div>

      {/* MOBILE: Cards */}
      <div className="md:hidden p-3 sm:p-4">
        <div className="space-y-3">
          {shown.map((r) => {
            const id = getRowId(r);
            const clickable = Boolean(id);

            return (
              <button
                key={id ?? r.ref_no ?? crypto.randomUUID()}
                onClick={() => goToLetter(r)}
                disabled={!clickable}
                className={[
                  "w-full text-left rounded-2xl border p-4 transition",
                  clickable
                    ? "border-neutral-200/70 hover:bg-emerald-50/30"
                    : "border-red-200 bg-red-50/30 cursor-not-allowed",
                ].join(" ")}
                title={clickable ? "Open letter" : "Missing primary key (id). Fix DB/select."}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 truncate">
                      {r.ref_no ?? "(no ref)"}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {r.date_received ?? "—"} • {r.recipient_department ?? "—"}
                    </div>

                    {!clickable ? (
                      <div className="mt-1 text-[11px] text-red-600">
                        Missing ID (cannot open)
                      </div>
                    ) : null}
                  </div>

                  <Pill
                    text={fmtDirection(r.direction)}
                    tone={r.direction === "INCOMING" ? "green" : "yellow"}
                  />
                </div>

                <div className="mt-3">
                  <div className="text-xs text-neutral-500">Sender</div>
                  <div className="text-sm text-neutral-900">{r.sender_name ?? "—"}</div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-neutral-500">Subject</div>
                  <div className="text-sm text-neutral-900 line-clamp-2">{r.subject ?? "—"}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill text={r.status ?? "—"} tone={toneForStatus(r.status)} />
                  <Pill
                    text={r.confidentiality ?? "—"}
                    tone={r.confidentiality === "CONFIDENTIAL" ? "red" : "gray"}
                  />
                </div>
              </button>
            );
          })}

          {!shown.length ? (
            <div className="rounded-2xl border border-neutral-200/70 p-6 text-sm text-neutral-600">
              No letters yet. Click <span className="font-medium">New Letter</span> to add the first record.
            </div>
          ) : null}
        </div>
      </div>

      {/* DESKTOP: Table */}
      <div className="hidden md:block overflow-auto">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200/70">
              <th className="py-3 px-4">Ref No</th>
              <th className="py-3 px-4">Direction</th>
              <th className="py-3 px-4">Received</th>
              <th className="py-3 px-4">Sender</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Conf.</th>
            </tr>
          </thead>

          <tbody>
            {shown.map((r) => {
              const id = getRowId(r);
              const clickable = Boolean(id);

              return (
                <tr
                  key={id ?? r.ref_no ?? crypto.randomUUID()}
                  className={[
                    "border-b border-neutral-200/60",
                    clickable ? "hover:bg-emerald-50/30 cursor-pointer" : "bg-red-50/20",
                  ].join(" ")}
                  onClick={() => goToLetter(r)}
                  title={clickable ? "Open letter" : "Missing primary key (id). Fix DB/select."}
                >
                  <td className="py-3 px-4 font-medium">
                    {clickable ? (
                      <span className="text-emerald-700 hover:underline">
                        {r.ref_no ?? "(no ref)"}
                      </span>
                    ) : (
                      <span className="text-red-600">
                        Missing ID • {r.ref_no ?? "(no ref)"}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">{fmtDirection(r.direction)}</td>
                  <td className="py-3 px-4">{r.date_received ?? "—"}</td>
                  <td className="py-3 px-4">{r.sender_name ?? "—"}</td>
                  <td className="py-3 px-4">{r.recipient_department ?? "—"}</td>
                  <td className="py-3 px-4 max-w-[360px] truncate">{r.subject ?? "—"}</td>
                  <td className="py-3 px-4">
                    <Pill text={r.status ?? "—"} tone={toneForStatus(r.status)} />
                  </td>
                  <td className="py-3 px-4">
                    <Pill
                      text={r.confidentiality ?? "—"}
                      tone={r.confidentiality === "CONFIDENTIAL" ? "red" : "gray"}
                    />
                  </td>
                </tr>
              );
            })}

            {!shown.length ? (
              <tr>
                <td className="py-8 px-4 text-neutral-500" colSpan={8}>
                  No letters yet. Click <span className="font-medium">New Letter</span> to add the first record.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
