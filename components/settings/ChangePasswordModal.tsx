"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "./Modal";
import { supabaseBrowser } from "@/lib/supabase/browser";

const inputCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none " +
  "focus:ring-2 focus:ring-emerald-600/15 focus:border-neutral-300 transition";

function strengthScore(pw: string) {
  const p = pw || "";
  const len = p.length;

  let score = 0;
  if (len > 0) score += 10;
  if (len >= 8) score += 40;
  if (len >= 12) score += 10;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 15;
  if (/[0-9]/.test(p)) score += 15;
  if (/[^A-Za-z0-9]/.test(p)) score += 10;
  if (score > 100) score = 100;

  const label =
    score >= 85 ? "Strong" :
    score >= 65 ? "Good" :
    score >= 40 ? "Fair" :
    len ? "Weak" : "—";

  return { score, label };
}

export default function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const supabase = supabaseBrowser();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const meter = useMemo(() => strengthScore(next), [next]);

  const minOk = next.length >= 8;
  const matchOk = confirm.length > 0 && next === confirm;
  const canSubmit = !loading && current.length > 0 && minOk && next === confirm;

  // Reset state when modal closes (keeps it clean)
  useEffect(() => {
    if (!open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setOk("");
      setErr("");
      setLoading(false);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk("");
    setErr("");

    if (!minOk) return setErr("New password must be at least 8 characters.");
    if (next !== confirm) return setErr("Passwords do not match.");

    setLoading(true);
    try {
      const { data: ures, error: uerr } = await supabase.auth.getUser();
      if (uerr) throw uerr;

      const email = ures.user?.email;
      if (!email) throw new Error("Please sign in again.");

      // Re-authenticate to confirm current password
      const { error: reErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (reErr) throw new Error("Current password is incorrect.");

      const { error: upErr } = await supabase.auth.updateUser({ password: next });
      if (upErr) throw upErr;

      setOk("Password updated successfully.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e: any) {
      setErr(e?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title="Change password" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {/* Current */}
        <div>
          <label className="text-sm font-semibold text-neutral-800">Current password</label>
          <input
            className={`${inputCls} mt-2`}
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {/* New + Confirm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-neutral-800">New password</label>
            <input
              className={`${inputCls} mt-2`}
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              required
            />

            {/* Minimal strength bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Strength</span>
                <span className="text-xs text-neutral-600">{meter.label}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className="h-full bg-emerald-200 transition-all duration-500"
                  style={{ width: `${meter.score}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-neutral-800">Confirm</label>
            <input
              className={`${inputCls} mt-2`}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-type new password"
              autoComplete="new-password"
              required
            />
            <p className="mt-2 text-xs text-neutral-500">
              {confirm.length === 0 ? " " : matchOk ? "Matches" : "Does not match"}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {err ? (
          <div className="rounded-2xl bg-red-50 p-3 ring-1 ring-red-100 animate-fadeIn">
            <p className="text-sm text-red-700">{err}</p>
          </div>
        ) : null}

        {ok ? (
          <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100 animate-fadeIn">
            <p className="text-sm text-neutral-900">{ok}</p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-1">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-2xl bg-emerald-100 text-black px-4 py-3 text-sm font-semibold
                       hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? "Updating…" : "Update password"}
          </button>

          <Link
            href="/auth/forgot"
            className="text-sm font-semibold text-neutral-700 hover:underline"
            onClick={onClose}
          >
            Forgot password?
          </Link>
        </div>

        {/* Tiny helper line */}
        <p className="text-xs text-neutral-500">
          Your password update is applied immediately to this account.
        </p>
      </form>
    </Modal>
  );
}
