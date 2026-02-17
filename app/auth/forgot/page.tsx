"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk("");
    setErr("");
    setLoading(true);

    try {
      const origin = window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset`,
      });

      if (error) throw error;

      setOk("Reset link sent ✅ Check your email inbox.");
      setEmail("");
    } catch (e: any) {
      setErr(e?.message || "Failed to send reset email.");
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
        <h1 className="mt-2 text-2xl font-semibold">Reset password</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Enter your email and we’ll send you a reset link.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15"
            placeholder="Email"
          />

          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}

          <button
            disabled={loading}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-black
             bg-emerald-100 hover:brightness-95 disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <Link href="/login" className="text-emerald-700 font-semibold hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
