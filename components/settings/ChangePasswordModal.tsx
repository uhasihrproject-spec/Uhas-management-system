"use client";

import { useState } from "react";
import Modal from "./Modal";
import { supabaseBrowser } from "@/lib/supabase/browser";

const inputCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15";

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk("");
    setErr("");

    if (next.length < 8) return setErr("New password must be at least 8 characters.");
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

      setOk("Password updated successfully ✅");
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
        <div>
          <label className="text-sm font-medium text-neutral-800">Current password</label>
          <input
            className={`${inputCls} mt-2`}
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-neutral-800">New password</label>
            <input
              className={`${inputCls} mt-2`}
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Min 8 characters"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-800">Confirm</label>
            <input
              className={`${inputCls} mt-2`}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-type"
              required
            />
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl bg-red-50 p-3 ring-1 ring-red-100">
            <p className="text-sm text-red-700">{err}</p>
          </div>
        ) : null}

        {ok ? (
          <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
            <p className="text-sm text-neutral-900">{ok}</p>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-1">
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-emerald-100 text-black px-4 py-3 text-sm font-semibold hover:brightness-95 disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update Password"}
          </button>

          <a
            className="text-sm font-semibold text-neutral-700 hover:underline"
            href="/auth/forgot"
          >
            Forgot password?
          </a>
        </div>
      </form>
    </Modal>
  );
}
