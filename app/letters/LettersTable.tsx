"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Direction = "INCOMING" | "OUTGOING";
type Status = "RECEIVED" | "SCANNED" | "ASSIGNED" | "ARCHIVED";
type Conf = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";

type Row = {
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function getRowId(r: Row) {
  const candidate = r.id ?? r.letter_id ?? r.uuid ?? null;
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

function toneForStatus(s?: Status | null): "green" | "yellow" | "gray" | "red" {
  if (!s) return "gray";
  if (s === "ARCHIVED") return "gray";
  if (s === "ASSIGNED") return "yellow";
  if (s === "SCANNED") return "green";
  return "red"; // RECEIVED
}

function fmtDirection(d?: Direction | null) {
  if (!d) return "—";
  return d === "INCOMING" ? "Incoming" : "Outgoing";
}

function toneForConf(c?: Conf | null): "green" | "yellow" | "gray" | "red" {
  if (!c) return "gray";
  if (c === "PUBLIC") return "green";
  if (c === "INTERNAL") return "yellow";
  return "red";
}

function fmtConf(c?: Conf | null) {
  if (!c) return "—";
  if (c === "PUBLIC") return "Public";
  if (c === "INTERNAL") return "Internal";
  return "Confidential";
}

const inputCls =
  "w-full rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-emerald-600/15 transition-all";
const selectCls =
  "w-full rounded-2xl border border-neutral-200 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium border border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap";

export default function LettersTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [localQ, setLocalQ] = useState(sp.get("q") || "");

  const direction = sp.get("direction") || "";
  const status = sp.get("status") || "";
  const conf = sp.get("conf") || "";

  const shown = useMemo(() => rows ?? [], [rows]);
  const total = shown.length;

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
    if (!id) return;
    router.push(`/letters/${id}`);
  }

  return (
    <div className="w-full min-w-0">
      <div className="text-neutral-700 rounded-3xl bg-white ring-1 ring-neutral-200/70 overflow-hidden">
        {/* Header bar */}
        <div className="p-5 sm:p-6 border-b border-neutral-200/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left */}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-900">Letters registry</div>
              <div className="mt-1 text-sm text-neutral-600">
                Showing <span className="font-medium text-neutral-900">{total}</span> letters
              </div>
            </div>

            {/* Right: Search */}
            <form
              onSubmit={submitSearch}
              className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
            >
              <input
                value={localQ}
                onChange={(e) => setLocalQ(e.target.value)}
                placeholder="Search ref, sender, subject, department..."
                className="w-full sm:w-90 lg:w-105 rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15"
              />
              <button type="submit" className={btnPrimary}>
                Search
              </button>
            </form>
          </div>

          {/* Filters row */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <select
              value={direction}
              onChange={(e) => setParam("direction", e.target.value)}
              className={selectCls}
            >
              <option value="">All Directions</option>
              <option value="INCOMING">Incoming</option>
              <option value="OUTGOING">Outgoing</option>
            </select>

            <select value={status} onChange={(e) => setParam("status", e.target.value)} className={selectCls}>
              <option value="">All Status</option>
              <option value="RECEIVED">Received</option>
              <option value="SCANNED">Scanned</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <select value={conf} onChange={(e) => setParam("conf", e.target.value)} className={selectCls}>
              <option value="">All Confidentiality</option>
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="CONFIDENTIAL">Confidential</option>
            </select>

            <button type="button" onClick={clearAll} className={btnGhost}>
              Clear
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4">
          {/* MOBILE: Cards */}
          <div className="md:hidden space-y-3">
            {shown.map((r, i) => {
              const id = getRowId(r);
              const clickable = Boolean(id);

              return (
                <button
                  key={id ?? r.ref_no ?? `row-${i}`}
                  onClick={() => goToLetter(r)}
                  disabled={!clickable}
                  className={[
                    "w-full text-left rounded-2xl border p-4 transition-colors",
                    clickable
                      ? "border-neutral-200/70 hover:bg-emerald-50/30 active:bg-emerald-50/60"
                      : "border-red-200 bg-red-50/30 cursor-not-allowed",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 truncate">
                        {r.ref_no ?? "(no ref)"}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {r.date_received ?? "—"} • {r.recipient_department ?? "—"}
                      </div>
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
                    <Pill text={fmtConf(r.confidentiality)} tone={toneForConf(r.confidentiality)} />
                  </div>
                </button>
              );
            })}

            {!shown.length ? (
              <div className="rounded-2xl border border-neutral-200/70 p-6 text-sm text-neutral-600">
                No letters yet.
              </div>
            ) : null}
          </div>

          {/* DESKTOP: Table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto rounded-2xl ring-1 ring-neutral-200/70">
              <table className="min-w-full w-full text-sm bg-white">
                <thead className="bg-white sticky top-0">
                  <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200/70">
                    <th className="py-3 px-4 whitespace-nowrap">Ref No</th>
                    <th className="py-3 px-4 whitespace-nowrap">Direction</th>
                    <th className="py-3 px-4 whitespace-nowrap">Received</th>
                    <th className="py-3 px-4 whitespace-nowrap">Sender</th>
                    <th className="py-3 px-4 hidden lg:table-cell whitespace-nowrap">Department</th>
                    <th className="py-3 px-4 whitespace-nowrap">Subject</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    {/* ✅ show from lg not xl */}
                    <th className="py-3 px-4 hidden lg:table-cell whitespace-nowrap">Conf.</th>
                  </tr>
                </thead>

                <tbody>
                  {shown.map((r, i) => {
                    const id = getRowId(r);
                    const clickable = Boolean(id);

                    return (
                      <tr
                        key={id ?? r.ref_no ?? `row-${i}`}
                        className={[
                          "border-b border-neutral-200/60 transition-colors",
                          clickable
                            ? "hover:bg-emerald-50/30 cursor-pointer"
                            : "bg-red-50/20 cursor-not-allowed",
                        ].join(" ")}
                        onClick={() => clickable && goToLetter(r)}
                        title={clickable ? "Open letter" : "Missing ID"}
                      >
                        <td className="py-3 px-4 font-semibold text-emerald-700 whitespace-nowrap">
                          {r.ref_no ?? "(no ref)"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">{fmtDirection(r.direction)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{r.date_received ?? "—"}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{r.sender_name ?? "—"}</td>

                        <td className="py-3 px-4 hidden lg:table-cell whitespace-nowrap">
                          {r.recipient_department ?? "—"}
                        </td>

                        <td className="py-3 px-4 max-w-[320px] truncate">{r.subject ?? "—"}</td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <Pill text={r.status ?? "—"} tone={toneForStatus(r.status)} />
                        </td>

                        <td className="py-3 px-4 hidden lg:table-cell whitespace-nowrap">
                          <Pill
                            text={fmtConf(r.confidentiality)}
                            tone={toneForConf(r.confidentiality)}
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {!shown.length ? (
                    <tr>
                      <td colSpan={8} className="py-10 px-4 text-neutral-500 text-center">
                        No letters yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Desktop note if conf is hidden on smaller screens */}
            <div className="mt-3 text-xs text-neutral-500">
              Tip: “Conf.” shows from <span className="font-medium">lg</span> screens and above.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
