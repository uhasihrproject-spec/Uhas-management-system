"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const supabase = supabaseBrowser();

  const [ready, setReady] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    // When Supabase opens recovery session, user becomes available in client
    setReady(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk("");
    setErr("");

    if (newPassword.length < 8) return setErr("Password must be at least 8 characters.");
    if (newPassword !== confirm) return setErr("Passwords do not match.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setOk("Password reset successfully ✅ You can log in now.");
      setNewPassword("");
      setConfirm("");
    } catch (e: any) {
      setErr(e?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          UHAS Procurement Directorate
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Set new password</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Enter a new password to complete the reset.
        </p>

        {!ready ? (
          <p className="mt-6 text-sm text-neutral-600">Preparing reset…</p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15"
              placeholder="New password (min 8 chars)"
              required
            />

            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15"
              placeholder="Confirm password"
              required
            />

            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}

            <button
              disabled={loading}
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-black
               bg-emerald-100 hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}

        <div className="mt-4 text-sm">
          <Link href="/login" className="text-emerald-700 font-semibold hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
