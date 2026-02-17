"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import PointerGlow from "@/components/ui/PointerGlow";

const inputCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none " +
  "focus:ring-2 focus:ring-emerald-600/15 focus:border-neutral-300 transition";

function strengthScore(pw: string) {
  const p = (pw || "").trim();

  const len = p.length;
  const hasMix = /[a-z]/.test(p) && /[A-Z]/.test(p);
  const hasNum = /[0-9]/.test(p);
  const hasSym = /[^A-Za-z0-9]/.test(p);

  // Calm scoring: not “rules”, just guidance
  let score = 0;
  if (len > 0) score += 10;
  if (len >= 8) score += 35;
  if (len >= 12) score += 15;
  if (hasMix) score += 15;
  if (hasNum) score += 15;
  if (hasSym) score += 10;
  if (score > 100) score = 100;

  const label =
    score >= 85 ? "Strong" :
    score >= 65 ? "Good" :
    score >= 40 ? "Fair" :
    len ? "Weak" : "—";

  const helper =
    !len
      ? "Choose a password you can remember."
      : score >= 85
      ? "Looks strong."
      : score >= 65
      ? "Looks good. More length can make it stronger."
      : "Add more length to improve strength.";

  return { score, label, helper };
}

function DotRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={[
          "mt-2 h-1.5 w-1.5 rounded-full shrink-0",
          ok ? "bg-emerald-300" : "bg-neutral-300",
        ].join(" ")}
      />
      <span className="text-sm text-neutral-700">{text}</span>
    </div>
  );
}

export default function ResetPasswordFinishPage() {
  const supabase = supabaseBrowser();

  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const meter = useMemo(() => strengthScore(pw), [pw]);

  const minOk = pw.length >= 8;
  const matchOk = confirm.length > 0 && pw === confirm;

  useEffect(() => {
    (async () => {
      setErr("");

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

    if (!minOk) return setErr("Password must be at least 8 characters.");
    if (pw !== confirm) return setErr("Passwords do not match.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;

      setOk("Password updated successfully. You can now sign in.");
      setPw("");
      setConfirm("");
    } catch (e: any) {
      setErr(e?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = ready && !loading && minOk && pw === confirm;

  return (
    <div className="relative min-h-screen bg-neutral-50 overflow-hidden">
      <PointerGlow />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              UHAS Procurement Directorate
            </p>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                Set a new password
              </h1>

              <Link href="/" className="text-sm font-semibold text-neutral-800 hover:underline">
                Back to login
              </Link>
            </div>

            <p className="mt-2 text-sm text-neutral-600 max-w-3xl">
              Create a new password for your account. This reset link is time-limited.
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left: calm guidance (not noisy) */}
            <section className="lg:col-span-5 animate-slideIn">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-neutral-900">
                  Security guidance
                </h2>

                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs ring-1 bg-neutral-100 text-neutral-700 ring-neutral-200">
                  {meter.label}
                </span>
              </div>

              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Choose a password that is easy for you to remember, but difficult for others to guess.
              </p>

              {/* Strength bar */}
              <div className="mt-4">
                <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-200 transition-all duration-500"
                    style={{ width: `${meter.score}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-500">{meter.helper}</p>
              </div>

              {/* Only two essentials */}
              <div className="mt-6 space-y-3">
                <DotRow ok={minOk} text="Minimum 8 characters" />
                <DotRow ok={matchOk} text="Passwords must match" />
              </div>

              <div className="mt-6 text-sm text-neutral-600">
                <div className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
                  <span>Do not reuse passwords from other systems.</span>
                </div>
              </div>
            </section>

            {/* Right: form */}
            <section className="lg:col-span-7 animate-fadeIn">
              <div className="bg-white rounded-3xl ring-1 ring-neutral-200/70 shadow-sm">
                <div className="p-6 sm:p-7">
                  {!ready ? (
                    <p className="text-sm text-neutral-700">Preparing secure reset…</p>
                  ) : (
                    <>
                      <div className="mb-5">
                        <h2 className="text-lg font-semibold text-neutral-900">
                          Update password
                        </h2>
                        <p className="mt-1 text-sm text-neutral-600">
                          Enter your new password and confirm it.
                        </p>
                      </div>

                      <form onSubmit={submit} className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-neutral-800">
                            New password
                          </label>
                          <input
                            className={`${inputCls} mt-2`}
                            type="password"
                            placeholder="Minimum 8 characters"
                            value={pw}
                            onChange={(e) => setPw(e.target.value)}
                            required
                            autoComplete="new-password"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-neutral-800">
                            Confirm new password
                          </label>
                          <input
                            className={`${inputCls} mt-2`}
                            type="password"
                            placeholder="Re-type new password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            autoComplete="new-password"
                          />
                        </div>

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

                        <button
                          disabled={!canSubmit}
                          className="w-full rounded-2xl bg-emerald-100 text-black py-3 text-sm font-semibold
                                     hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                          {loading ? "Saving…" : "Update password"}
                        </button>

                        <div className="pt-1 text-sm flex items-center justify-between">
                          <Link href="/" className="font-semibold text-neutral-800 hover:underline">
                            Back to login
                          </Link>
                          <Link href="/auth/forgot" className="font-semibold text-neutral-800 hover:underline">
                            Request a new link
                          </Link>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>

          <p className="mt-8 text-xs text-neutral-500">
            © {new Date().getFullYear()} UHAS Procurement Directorate
          </p>
        </main>
      </div>
    </div>
  );
}
