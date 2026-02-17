"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

const inputCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15";

export default function ResetPasswordFinishPage() {
  const supabase = supabaseBrowser();

  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      // Some Supabase links arrive with ?code=... (PKCE)
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.history.replaceState({}, "", "/auth/reset");
        }
        setReady(true);
      } catch (e: any) {
        setErr(e?.message || "Invalid or expired reset link. Please request a new one.");
        setReady(true);
      }
    })();
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");

    if (pw.length < 8) return setErr("Password must be at least 8 characters.");
    if (pw !== confirm) return setErr("Passwords do not match.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;

      setOk("Password reset successful ✅ You can now sign in.");
    } catch (e: any) {
      setErr(e?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          UHAS Procurement Directorate
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
          Set a new password
        </h1>

        {!ready ? (
          <p className="mt-4 text-sm text-neutral-700">Preparing secure reset…</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-700">
              Choose a strong password you’ll remember.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-3">
              <input
                className={inputCls}
                type="password"
                placeholder="New password (min 8 chars)"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
              />
              <input
                className={inputCls}
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />

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

              <button
                disabled={loading}
                className="w-full rounded-2xl bg-emerald-100 text-black py-3 text-sm font-semibold hover:brightness-95 disabled:opacity-60"
              >
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>

            <div className="mt-4 text-sm flex items-center justify-between">
              <Link href="/" className="font-semibold text-neutral-800 hover:underline">
                Back to login
              </Link>
              <Link href="/auth/forgot" className="font-semibold text-neutral-800 hover:underline">
                Request a new link
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
