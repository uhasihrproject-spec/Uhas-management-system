"use client";

import { useEffect, useMemo, useState } from "react";
import ChangePasswordModal from "@/components/settings/ChangePasswordModal";
import { supabaseBrowser } from "@/lib/supabase/browser";
import Link from "next/link";

type Profile = {
  full_name: string | null;
  department: string | null;
  role: "ADMIN" | "SECRETARY" | "STAFF" | null;
  pref_compact?: boolean | null;
  pref_hints?: boolean | null;
};

type AuditRow = {
  id: string;
  action: string;
  created_at: string;
  letter_id: string | null;
  meta: any;
};

const inputCls =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all";

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function ActionPill({ action }: { action: string }) {
  const a = (action || "").toUpperCase();
  const cls =
    a === "DOWNLOADED"
      ? "bg-amber-50 text-amber-800 ring-amber-100"
      : a === "UPDATED" || a === "REPLACED_SCAN"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : a === "VIEWED"
      ? "bg-neutral-100 text-neutral-700 ring-neutral-200"
      : "bg-neutral-100 text-neutral-700 ring-neutral-200";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ring-1 ${cls}`}>
      {a || "ACTION"}
    </span>
  );
}

function CollapsibleSection({
  title,
  description,
  badge,
  children,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl bg-white border border-neutral-200 overflow-hidden transition-all duration-300 hover:border-neutral-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 sm:p-6 flex items-start justify-between gap-4 text-left transition-colors hover:bg-neutral-50/50"
        type="button"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-sm text-neutral-600">{description}</p>
          )}
        </div>

        {/* Chevron icon */}
        <svg
          className={`w-5 h-5 text-neutral-400 transition-transform duration-300 flex-shrink-0 mt-0.5 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content with smooth animation */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen
            ? "max-h-[2000px] opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="border-t border-neutral-200/70">{children}</div>
      </div>
    </div>
  );
}

export default function SettingsOverview() {
  const supabase = supabaseBrowser();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile>({
    full_name: null,
    department: null,
    role: null,
    pref_compact: false,
    pref_hints: true,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const [pwOpen, setPwOpen] = useState(false);

  // real prefs
  const [compactMode, setCompactMode] = useState(false);
  const [showHints, setShowHints] = useState(true);

  // activity
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityErr, setActivityErr] = useState("");
  const [activity, setActivity] = useState<AuditRow[]>([]);

  const roleLabel = useMemo(() => profile.role ?? "STAFF", [profile.role]);
  const isAdmin = profile.role === "ADMIN";

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      setMsg("");
      setActivityErr("");

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        setLoading(false);
        setErr("You are not signed in.");
        return;
      }

      setEmail(user.email ?? "");
      setLastSignInAt((user as any)?.last_sign_in_at ?? null);

      const { data: p, error } = await supabase
        .from("profiles")
        .select("full_name, department, role, pref_compact, pref_hints")
        .eq("id", user.id)
        .maybeSingle();

      if (error) setErr(error.message);

      if (p) {
        const prof = p as Profile;
        setProfile(prof);

        // ✅ use DB values, fallback to defaults
        setCompactMode(Boolean(prof.pref_compact));
        setShowHints(prof.pref_hints !== false);
      }

      // Also fetch activity (will work once you add audit_read_own policy)
      setActivityLoading(true);
      const { data: logs, error: logsErr } = await supabase
        .from("audit_logs")
        .select("id, action, created_at, letter_id, meta")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (logsErr) setActivityErr(logsErr.message);
      setActivity((logs ?? []) as any);
      setActivityLoading(false);

      setLoading(false);
    })();
  }, [supabase]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSaving(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in.");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          department: profile.department,
        })
        .eq("id", auth.user.id);

      if (error) throw error;
      setMsg("Profile updated ✅");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) {
      setErr(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function savePrefs() {
    setErr("");
    setMsg("");
    setSaving(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in.");

      const { error } = await supabase
        .from("profiles")
        .update({
          pref_compact: compactMode,
          pref_hints: showHints,
        })
        .eq("id", auth.user.id);

      if (error) throw error;

      setMsg("Preferences saved ✅");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) {
      setErr(e?.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  const roleBadge = (
    <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
      {roleLabel}
    </span>
  );

  return (
    <div className="space-y-4">
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />

      {/* Loading */}
      {loading ? (
        <div className="rounded-2xl bg-white border border-neutral-200 p-6 animate-pulse">
          <div className="h-4 w-32 bg-neutral-200 rounded" />
          <div className="mt-2 h-3 w-48 bg-neutral-100 rounded" />
        </div>
      ) : null}

      {/* Alerts */}
      {err ? (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{err}</p>
        </div>
      ) : null}

      {msg ? (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-900">{msg}</p>
        </div>
      ) : null}

      {/* Profile Section */}
      <CollapsibleSection
        title="Profile"
        description="Your account details used across the records system."
        badge={roleBadge}
        defaultOpen={true}
      >
        <form onSubmit={saveProfile} className="p-5 sm:p-6 space-y-4">
          {lastSignInAt && (
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3">
              <p className="text-xs text-neutral-600">
                Last sign-in: <span className="text-neutral-900 font-medium">{fmtTime(lastSignInAt)}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">Full name</label>
              <input
                className={`${inputCls} mt-1.5`}
                value={profile.full_name ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="e.g. Eldwin Asante"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700">Department</label>
              <input
                className={`${inputCls} mt-1.5`}
                value={profile.department ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
                placeholder="e.g. Procurement"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700">Email (read-only)</label>
            <input
              className={`${inputCls} mt-1.5 bg-neutral-50 text-neutral-600 cursor-not-allowed`}
              value={email}
              readOnly
            />
            <p className="mt-1.5 text-xs text-neutral-500">
              Contact Admin to update your email address
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              disabled={saving}
              className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
              type="submit"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </CollapsibleSection>

      {/* Security Section */}
      <CollapsibleSection
        title="Security"
        description="Password and sign-in controls."
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-neutral-900">Change password</div>
                  <div className="mt-1 text-sm text-neutral-600">
                    Update your password securely (requires your current password).
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPwOpen(true)}
                className="mt-4 w-full rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-all active:scale-95"
                type="button"
              >
                Change password
              </button>
            </div>

            <div className="rounded-xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-neutral-900">Forgot password</div>
                  <div className="mt-1 text-sm text-neutral-600">
                    Sends a reset link to your email and opens the reset page inside the app.
                  </div>
                </div>
              </div>
              <Link
                href="/auth/forgot"
                className="mt-4 block w-full rounded-xl bg-amber-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-amber-700 transition-all active:scale-95 text-center"
              >
                Send reset link
              </Link>
            </div>
          </div>

          {isAdmin && (
            <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-neutral-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-neutral-900">Admin note</div>
                  <p className="mt-1 text-sm text-neutral-600">
                    If you have users who forget their passwords, you can create reset links for them in the <Link href="/admin/users" className="text-emerald-700 hover:underline">Admin → Users</Link> page.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Preferences Section */}
      <CollapsibleSection
        title="Preferences"
        description="Stored on your account (works on any device)."
      >
        <div className="p-5 sm:p-6 space-y-3">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 p-4 cursor-pointer hover:bg-neutral-50 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-50 flex items-center justify-center flex-shrink-0 group-hover:bg-neutral-100 transition-colors">
                <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-900">Compact tables</div>
                <div className="text-sm text-neutral-600">
                  Reduce spacing to see more records on screen.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
              className="h-5 w-5 rounded border-neutral-300 text-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 p-4 cursor-pointer hover:bg-neutral-50 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-50 flex items-center justify-center flex-shrink-0 group-hover:bg-neutral-100 transition-colors">
                <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-900">Show hints</div>
                <div className="text-sm text-neutral-600">
                  Show helpful tips at the top of key pages.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={showHints}
              onChange={(e) => setShowHints(e.target.checked)}
              className="h-5 w-5 rounded border-neutral-300 text-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all"
            />
          </label>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={savePrefs}
              disabled={saving}
              className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {saving ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </div>
      </CollapsibleSection>

      {/* Recent Activity Section */}
      <CollapsibleSection
        title="Recent activity"
        description="Your latest actions in the registry (viewed / updated / downloaded)."
        badge={
          isAdmin ? (
            <Link
              href="/admin/audits"
              className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors"
            >
              View all audits →
            </Link>
          ) : undefined
        }
      >
        <div className="p-5 sm:p-6">
          {activityLoading ? (
            <div className="flex items-center gap-3 text-sm text-neutral-600">
              <div className="w-4 h-4 border-2 border-neutral-300 border-t-emerald-600 rounded-full animate-spin" />
              Loading activity…
            </div>
          ) : activityErr ? (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-red-700">{activityErr}</p>
                  <p className="mt-1 text-xs text-neutral-600">
                    If you're not admin, make sure the <b>audit_read_own</b> policy exists.
                  </p>
                </div>
              </div>
            </div>
          ) : activity.length ? (
            <div className="space-y-3">
              {activity.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-neutral-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-neutral-300 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ActionPill action={a.action} />
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {a.letter_id ? `Letter: ${a.letter_id}` : "System"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">{fmtTime(a.created_at)}</p>
                  </div>

                  {a.letter_id && (
                    <Link
                      href={`/letters/${a.letter_id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors whitespace-nowrap"
                    >
                      Open letter →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-3 text-sm text-neutral-600">
                No activity recorded yet.
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}