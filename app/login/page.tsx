"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) setErr(error.message);
    else window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center px-4 sm:px-6">
      
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 ring-1 ring-neutral-200/70 shadow-lg">
        
        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            UHAS Procurement Directorate
          </p>

          <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-neutral-900">
            Records Login
          </h1>

          <p className="mt-2 text-sm sm:text-base text-neutral-600">
            Sign in to manage and search letters.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={signIn} className="space-y-4">
          
          <div>
            <label className="text-xs text-neutral-500">Email</label>
            <input
              className="mt-1 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              placeholder="staff@uhas.edu.gh"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <div>
            <label className="text-xs text-neutral-500">Password</label>
            <input
              className="mt-1 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>

          {err ? (
            <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
              {err}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-600 text-white py-3 text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Accounts are created by system administrator.
        </p>
      </div>
    </div>
  );
}
