"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

const inputCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15";

export default function ForgotPasswordPage() {
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const origin = window.location.origin;

      // ✅ redirectTo must be allowed in Supabase Auth settings
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset`,
      });

      if (error) throw error;

      setSent(true);
    } catch (e: any) {
      setErr(e?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            UHAS Procurement Directorate
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-neutral-700">
            We sent a password reset link to <b>{email}</b>. Open your inbox and click the button to continue.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="https://mail.google.com/"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-emerald-100 text-black px-4 py-3 text-sm font-semibold hover:brightness-95 text-center"
            >
              Open Gmail
            </a>

            <a
              href="https://outlook.live.com/mail/"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 text-center"
            >
              Open Outlook
            </a>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm">
            <button
              onClick={() => setSent(false)}
              className="font-semibold text-neutral-800 hover:underline"
            >
              Use a different email
            </button>
            <Link href="/" className="font-semibold text-neutral-800 hover:underline">
              Back to login
            </Link>
          </div>

          <p className="mt-4 text-xs text-neutral-500">
            Tip: If you don’t see it, check Spam / Promotions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          UHAS Procurement Directorate
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-neutral-700">
          Enter your email and we’ll send a reset link.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            className={inputCls}
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {err ? <p className="text-sm text-red-700">{err}</p> : null}

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-100 text-black py-3 text-sm font-semibold hover:brightness-95 disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <Link href="/" className="font-semibold text-neutral-800 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
