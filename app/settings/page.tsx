"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

const inputCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15";

export default function SettingsPage() {
  const supabase = supabaseBrowser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk("");
    setErr("");

    if (newPassword.length < 8) return setErr("New password must be at least 8 characters.");
    if (newPassword !== confirm) return setErr("Passwords do not match.");

    setLoading(true);
    try {
      const { data: ures, error: uerr } = await supabase.auth.getUser();
      if (uerr) throw uerr;

      const email = ures.user?.email;
      if (!email) throw new Error("No user email found. Please sign in again.");

      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthErr) throw new Error("Current password is incorrect.");

      const { error: updErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updErr) throw updErr;

      setOk("Password updated successfully ✅");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (e: any) {
      setErr(e?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <Link href="/dashboard" className="text-sm text-emerald-700 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-neutral-200/70">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              UHAS Procurement Directorate
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
              Settings
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Update your password securely.
            </p>
          </div>

          {/* Body */}
          <form onSubmit={submit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-800">
                Current password
              </label>
              <input
                type="password"
                className={`${inputCls} mt-2`}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-800">
                  New password
                </label>
                <input
                  type="password"
                  className={`${inputCls} mt-2`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-800">
                  Confirm
                </label>
                <input
                  type="password"
                  className={`${inputCls} mt-2`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-type password"
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
                <p className="text-sm text-emerald-700">{ok}</p>
              </div>
            ) : null}

            <button
              disabled={loading}
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-black
               bg-emerald-100 hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "Updating…" : "Update Password"}
            </button>

            <div className="flex items-center justify-between pt-1">
              <Link
                href="/auth/forgot"
                className="text-sm text-emerald-700 font-semibold hover:underline"
              >
                Forgot password?
              </Link>

              <span className="text-xs text-neutral-500">
                Tip: use a strong password.
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
