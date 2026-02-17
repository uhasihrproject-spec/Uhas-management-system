"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import PointerGlow from "@/components/ui/PointerGlow";

const inputCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none " +
  "focus:ring-2 focus:ring-emerald-600/15 focus:border-neutral-300 transition";

function parseDomain(email: string) {
  const e = email.trim().toLowerCase();
  const at = e.indexOf("@");
  if (at === -1) return { domain: "", hasAt: false };
  return { domain: e.slice(at + 1), hasAt: true };
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function ForgotPasswordPage() {
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const info = useMemo(() => {
    const { domain, hasAt } = parseDomain(email);
    const valid = isValidEmail(email);
    const isUhas = domain === "uhas.edu.gh" || domain.endsWith(".uhas.edu.gh");

    let progress = 0;
    if (email.trim().length > 0) progress += 20;
    if (hasAt) progress += 20;
    if (domain.length > 0) progress += 20;
    if (domain.includes(".")) progress += 20;
    if (valid) progress += 20;

    const label =
      !email.trim()
        ? "Start typing your email"
        : !hasAt
        ? "Waiting for domain"
        : domain.length === 0
        ? "Type the domain"
        : isUhas
        ? "UHAS domain detected"
        : "Non-UHAS domain";

    const tone =
      !email.trim() || !hasAt || domain.length === 0 ? "neutral" : isUhas ? "uhas" : "other";

    const chip = !hasAt ? "" : domain.length ? `@${domain}` : "@";

    const helper =
      !email.trim()
        ? "Use the email registered on your account."
        : valid
        ? "Format looks valid. You can send the reset link."
        : "Complete the email format before sending.";

    return { domain, hasAt, valid, isUhas, progress, label, tone, chip, helper };
  }, [email]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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

  const chipCls =
    info.tone === "uhas"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : "bg-neutral-100 text-neutral-700 ring-neutral-200";

  const canSend = info.valid && !loading;

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
                Reset password
              </h1>
              <Link href="/" className="text-sm font-semibold text-neutral-800 hover:underline">
                Back to login
              </Link>
            </div>
            <p className="mt-2 text-sm text-neutral-600 max-w-3xl">
              Enter your account email and we will send a secure reset link.
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left: Domain recognition */}
            <section className="lg:col-span-5 animate-slideIn">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-neutral-900">Domain recognition</h2>

                <div
                  className={[
                    "inline-flex items-center rounded-full px-3 py-1 text-xs ring-1 transition-all duration-300",
                    info.hasAt ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none",
                    chipCls,
                  ].join(" ")}
                  aria-hidden={!info.hasAt}
                >
                  {info.chip}
                </div>
              </div>

              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{info.label}</p>

              <div className="mt-4">
                <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-200 transition-all duration-500"
                    style={{ width: `${info.progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-500">{info.helper}</p>
              </div>

              <div className="mt-6 text-sm text-neutral-600">
                <div className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
                  <span>Reset links expire automatically.</span>
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
                  <span>Check spam/junk folders if you do not receive the email.</span>
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
                  <span>If you cannot access your email, contact an Admin.</span>
                </div>
              </div>
            </section>

            {/* Right: Form */}
            <section className="lg:col-span-7 animate-fadeIn">
              <div className="bg-white rounded-3xl ring-1 ring-neutral-200/70 shadow-sm">
                <div className="p-6 sm:p-7">
                  {!sent ? (
                    <>
                      <div className="mb-5">
                        <h2 className="text-lg font-semibold text-neutral-900">Send reset link</h2>
                        <p className="mt-1 text-sm text-neutral-600">
                          Provide the email address used for your account.
                        </p>
                      </div>

                      <form onSubmit={submit} className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-neutral-800">Email address</label>
                          <input
                            className={`${inputCls} mt-2`}
                            type="email"
                            required
                            placeholder="name@uhas.edu.gh"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                          />
                        </div>

                        {err ? (
                          <div className="rounded-2xl bg-red-50 ring-1 ring-red-100 p-3 animate-fadeIn">
                            <p className="text-sm text-red-700">{err}</p>
                          </div>
                        ) : null}

                        <button
                          disabled={!canSend}
                          className="w-full rounded-2xl bg-emerald-100 text-black py-3 text-sm font-semibold
                                     hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                          {loading ? "Sending…" : "Send reset link"}
                        </button>

                        <p className="text-xs text-neutral-500">
                          Tip: Use the email registered on your account.
                        </p>
                      </form>
                    </>
                  ) : (
                    <div className="animate-fadeIn">
                      <h2 className="text-lg font-semibold text-neutral-900">Check your email</h2>
                      <p className="mt-2 text-sm text-neutral-700">
                        We sent a password reset link to{" "}
                        <span className="font-semibold">{email}</span>. Open your inbox and use the link
                        to continue.
                      </p>

                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a
                          href="https://mail.google.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl bg-emerald-100 text-black px-4 py-3 text-sm font-semibold
                                     hover:brightness-95 text-center transition"
                        >
                          Open Gmail
                        </a>

                        <a
                          href="https://outlook.live.com/mail/"
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-800
                                     hover:bg-neutral-50 text-center transition"
                        >
                          Open Outlook
                        </a>
                      </div>

                      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <button
                          onClick={() => setSent(false)}
                          className="rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-800
                                     hover:bg-neutral-50 transition"
                        >
                          Use a different email
                        </button>

                        <Link href="/" className="text-sm font-semibold text-neutral-800 hover:underline text-center">
                          Back to login
                        </Link>
                      </div>
                    </div>
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
