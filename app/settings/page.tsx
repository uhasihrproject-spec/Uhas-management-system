"use client";

import { useEffect, useMemo, useState } from "react";
import ChangePasswordModal from "@/components/settings/ChangePasswordModal";
import { supabaseBrowser } from "@/lib/supabase/browser";
import Link from "next/link";

type Profile = {
  full_name: string | null;
  department: string | null;
  role: "ADMIN" | "SECRETARY" | "STAFF" | null;
};

const inputCls =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all";

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
          <div className="flex items-center gap-3">
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
  const [profile, setProfile] = useState<Profile>({
    full_name: null,
    department: null,
    role: null,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const [pwOpen, setPwOpen] = useState(false);

  // preferences (local only for now)
  const [compactMode, setCompactMode] = useState(false);
  const [showHints, setShowHints] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      setMsg("");

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        setLoading(false);
        setErr("You are not signed in.");
        return;
      }

      setEmail(user.email ?? "");

      const { data: p, error } = await supabase
        .from("profiles")
        .select("full_name, department, role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) setErr(error.message);
      if (p) setProfile(p as any);

      // local preferences
      setCompactMode(localStorage.getItem("pref_compact") === "1");
      setShowHints(localStorage.getItem("pref_hints") !== "0");

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

  function savePrefs() {
    localStorage.setItem("pref_compact", compactMode ? "1" : "0");
    localStorage.setItem("pref_hints", showHints ? "1" : "0");
    setMsg("Preferences saved ✅");
    setTimeout(() => setMsg(""), 3000);
    setErr("");
  }

  const roleLabel = useMemo(() => profile.role ?? "STAFF", [profile.role]);

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
        description="Keep your account protected."
      >
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Update your password securely using your current password.
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

          <div className="rounded-xl border border-neutral-200 p-5 opacity-60">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-neutral-900">Two-factor authentication</div>
                <div className="mt-1 text-sm text-neutral-600">
                  Coming soon: extra verification for Admin accounts.
                </div>
              </div>
            </div>
            <button
              className="mt-4 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-400 cursor-not-allowed"
              type="button"
              disabled
            >
              Enable 2FA (soon)
            </button>
          </div>
        </div>
      </CollapsibleSection>

      {/* Preferences Section */}
      <CollapsibleSection
        title="Preferences"
        description="Customize how the system feels."
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
                  Display small tips like "Use search + filters…".
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
              className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-all active:scale-95"
            >
              Save preferences
            </button>
          </div>
        </div>
      </CollapsibleSection>

      {/* Activity Section */}
      <CollapsibleSection
        title="Activity"
        description="View recent actions like viewed / updated / downloaded."
      >
        <div className="p-5 sm:p-6">
          <div className="rounded-xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-neutral-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-neutral-900">Audit logs</div>
                <div className="mt-1 text-sm text-neutral-600">
                  Track all system activities and changes for compliance.
                </div>
              </div>
            </div>
            <Link
              href="/admin/audits"
              className="block w-full rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-all active:scale-95 text-center"
            >
              Open audit logs
            </Link>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}