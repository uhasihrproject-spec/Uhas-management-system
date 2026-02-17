"use client";

import React, { useMemo, useRef, useState } from "react";
import { Mail, Save, Trash2, UserPlus, Search } from "lucide-react";

type Role = "ADMIN" | "SECRETARY" | "STAFF";

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  department: string | null;
  created_at: string;
};

const inputCls =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-black bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all";

const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all";

const iconBtn =
  "inline-flex items-center justify-center rounded-full p-2.5 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all";

const dangerIconBtn =
  "inline-flex items-center justify-center rounded-full p-2.5 bg-red-100 hover:bg-red-200 active:bg-red-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function RoleBadge({ role }: { role: Role }) {
  const colors = {
    ADMIN: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SECRETARY: "bg-amber-50 text-amber-700 border-amber-200",
    STAFF: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${colors[role]}`}>
      {role}
    </span>
  );
}

/* ---------------- Add User Form ---------------- */

function AddUserForm({
  onCreated,
  onError,
}: {
  onCreated: (u: UserRow) => void;
  onError: (m: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<Role>("STAFF");
  const [creating, setCreating] = useState(false);
  const [ok, setOk] = useState("");

  async function create() {
    try {
      setOk("");
      onError("");
      setCreating(true);

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          department,
          role,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create");

      setOk("Account created successfully ✅");
      setTimeout(() => setOk(""), 3000);

      onCreated({
        id: json.userId,
        email: email || null,
        full_name: fullName || null,
        department: department || null,
        role,
        created_at: new Date().toISOString(),
      });

      setEmail("");
      setPassword("");
      setFullName("");
      setDepartment("");
      setRole("STAFF");
      setIsOpen(false);
    } catch (e: any) {
      onError(e.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  const canCreate = !!email && isEmail(email) && password.length >= 8;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={btnPrimary}
      >
        <UserPlus className="h-4 w-4" />
        Add New User
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-50/50 to-amber-50/30 p-5 border border-emerald-100/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-neutral-900">Create New Account</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Full Name</label>
          <input
            className={inputCls}
            placeholder="e.g. John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Department</label>
          <input
            className={inputCls}
            placeholder="e.g. IT"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Role</label>
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="STAFF">STAFF</option>
            <option value="SECRETARY">SECRETARY</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Email *</label>
          <input
            className={inputCls}
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Temporary Password * (min 8 chars)</label>
          <input
            className={inputCls}
            placeholder="User can change this after first login"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="text"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="text-xs text-neutral-600">
          User can log in immediately. Ask them to change password after first sign-in.
        </p>

        <button onClick={create} disabled={creating || !canCreate} className={btnPrimary}>
          <UserPlus className="h-4 w-4" />
          {creating ? "Creating…" : "Create Account"}
        </button>
      </div>

      {ok && (
        <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-700">{ok}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Mobile: User Card ---------------- */

function MobileUserCard({
  u,
  busy,
  saving,
  updatingEmail,
  removing,
  onChange,
  onSave,
  onUpdateEmail,
  onRemove,
}: {
  u: UserRow;
  busy: boolean;
  saving: boolean;
  updatingEmail: boolean;
  removing: boolean;
  onChange: (next: Partial<UserRow>) => void;
  onSave: () => void;
  onUpdateEmail: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-4 hover:border-neutral-300 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-neutral-900 truncate">
            {u.full_name || "Unnamed User"}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <RoleBadge role={u.role} />
            <span className="text-xs text-neutral-500">{u.department || "No dept"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="text-xs font-medium text-neutral-600 mb-1 block">Full Name</label>
          <input
            className={inputCls}
            value={u.full_name ?? ""}
            onChange={(e) => onChange({ full_name: e.target.value })}
            placeholder="Full name"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-1 block">Department</label>
            <input
              className={inputCls}
              value={u.department ?? ""}
              onChange={(e) => onChange({ department: e.target.value })}
              placeholder="Department"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-1 block">Role</label>
            <select
              className={inputCls}
              value={u.role}
              onChange={(e) => onChange({ role: e.target.value as Role })}
            >
              <option value="STAFF">STAFF</option>
              <option value="SECRETARY">SECRETARY</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-600 mb-1 block">Email</label>
          <input
            className={inputCls}
            value={u.email ?? ""}
            onChange={(e) => onChange({ email: e.target.value })}
            type="email"
            placeholder="user@example.com"
          />
          {u.email && !isEmail(u.email) && (
            <p className="mt-1 text-xs text-red-600">Invalid email format</p>
          )}
        </div>

        <div className="text-xs text-neutral-400 font-mono truncate">
          ID: {u.id}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={onSave} disabled={busy} className={btnPrimary + " flex-1"}>
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </button>

        <button
          onClick={onUpdateEmail}
          disabled={busy}
          className={iconBtn}
          title="Update email"
        >
          <Mail className="h-4 w-4 text-neutral-700" />
        </button>

        <button
          onClick={onRemove}
          disabled={busy}
          className={dangerIconBtn}
          title="Delete user"
        >
          <Trash2 className="h-4 w-4 text-red-700" />
        </button>
      </div>

      {(updatingEmail || removing) && (
        <p className="mt-2 text-xs text-neutral-600">
          {updatingEmail && "Updating email…"}
          {removing && "Removing user…"}
        </p>
      )}
    </div>
  );
}

/* ---------------- Main Component ---------------- */

export default function UsersAdminClient({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [q, setQ] = useState("");

  const [savingId, setSavingId] = useState("");
  const [emailSavingId, setEmailSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const [leavingIds, setLeavingIds] = useState<Record<string, true>>({});

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const name = (u.full_name || "").toLowerCase();
      const dept = (u.department || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return (
        u.id.toLowerCase().includes(s) ||
        name.includes(s) ||
        dept.includes(s) ||
        email.includes(s) ||
        u.role.toLowerCase().includes(s)
      );
    });
  }, [users, q]);

  function flashOk(message: string) {
    setOk(message);
    window.setTimeout(() => setOk(""), 3000);
  }

  function markLeaving(id: string) {
    setLeavingIds((p) => ({ ...p, [id]: true }));
    window.setTimeout(() => {
      setUsers((prev) => prev.filter((x) => x.id !== id));
      setLeavingIds((p) => {
        const copy = { ...p };
        delete copy[id];
        return copy;
      });
    }, 300);
  }

  async function saveProfile(u: UserRow) {
    try {
      setErr("");
      setOk("");
      setSavingId(u.id);

      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: u.id,
          role: u.role,
          department: u.department,
          full_name: u.full_name,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      flashOk("Profile saved ✅");
    } catch (e: any) {
      setErr(e.message || "Failed to save");
    } finally {
      setSavingId("");
    }
  }

  async function updateEmail(u: UserRow) {
    try {
      setErr("");
      setOk("");
      setEmailSavingId(u.id);

      const email = (u.email || "").trim().toLowerCase();
      if (!email) throw new Error("Email cannot be empty.");
      if (!isEmail(email)) throw new Error("Enter a valid email address.");

      const res = await fetch("/api/admin/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, email }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update email");

      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, email } : x)));
      flashOk("Email updated ✅");
    } catch (e: any) {
      setErr(e.message || "Failed to update email");
    } finally {
      setEmailSavingId("");
    }
  }

  async function removeUser(u: UserRow) {
    const yes = window.confirm(
      `Delete this user?\n\n${u.full_name || "(no name)"}\n${u.email || "(no email)"}\n\nThis cannot be undone.`
    );
    if (!yes) return;

    try {
      setErr("");
      setOk("");
      setDeletingId(u.id);

      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id }),
      });

      let json: any = {};
      try {
        json = await res.json();
      } catch {}

      if (!res.ok) {
        throw new Error(json?.detail || json?.error || `Delete failed (${res.status})`);
      }

      markLeaving(u.id);
      flashOk("User deleted ✅");
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {err && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{err}</p>
        </div>
      )}

      {ok && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-900">{ok}</p>
        </div>
      )}

      {/* Main Card */}
      <div className="rounded-2xl bg-white border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">User Management</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Create accounts and manage user details
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                Total users: <span className="font-medium text-neutral-900">{users.length}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search users…"
                  className="w-full sm:w-[280px] rounded-xl border border-neutral-200 pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all"
                />
              </div>

              <AddUserForm
                onCreated={(newUser) => setUsers((prev) => [newUser, ...prev])}
                onError={(m) => setErr(m)}
              />
            </div>
          </div>
        </div>

        {/* MOBILE View */}
        <div className="md:hidden p-4 space-y-3 bg-neutral-50">
          {shown.map((u) => {
            const busy = savingId === u.id || emailSavingId === u.id || deletingId === u.id;

            return (
              <div
                key={u.id}
                className={`transition-all duration-300 ${
                  leavingIds[u.id] ? "opacity-0 scale-95" : "opacity-100 scale-100"
                }`}
              >
                <MobileUserCard
                  u={u}
                  busy={busy}
                  saving={savingId === u.id}
                  updatingEmail={emailSavingId === u.id}
                  removing={deletingId === u.id}
                  onChange={(next) =>
                    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...next } : x)))
                  }
                  onSave={() => saveProfile(u)}
                  onUpdateEmail={() => updateEmail(u)}
                  onRemove={() => removeUser(u)}
                />
              </div>
            );
          })}

          {!shown.length && (
            <div className="rounded-2xl bg-white border border-neutral-200 p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="mt-3 text-sm text-neutral-600">No users found</p>
            </div>
          )}
        </div>

        {/* DESKTOP Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200">
              {shown.map((u) => {
                const busy = savingId === u.id || emailSavingId === u.id || deletingId === u.id;

                return (
                  <tr
                    key={u.id}
                    className={`transition-all duration-300 hover:bg-neutral-50 ${
                      leavingIds[u.id] ? "bg-red-50 opacity-0 scale-95" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        className={inputCls}
                        value={u.full_name ?? ""}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((x) => (x.id === u.id ? { ...x, full_name: e.target.value } : x))
                          )
                        }
                        placeholder="Full name"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <input
                        className={inputCls}
                        value={u.department ?? ""}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((x) => (x.id === u.id ? { ...x, department: e.target.value } : x))
                          )
                        }
                        placeholder="Department"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <select
                        className={inputCls}
                        value={u.role}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((x) => (x.id === u.id ? { ...x, role: e.target.value as Role } : x))
                          )
                        }
                      >
                        <option value="STAFF">STAFF</option>
                        <option value="SECRETARY">SECRETARY</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    <td className="py-3 px-4">
                      <input
                        className={inputCls}
                        value={u.email ?? ""}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((x) => (x.id === u.id ? { ...x, email: e.target.value } : x))
                          )
                        }
                        type="email"
                        placeholder="user@example.com"
                      />
                      {u.email && !isEmail(u.email) && (
                        <p className="mt-1 text-xs text-red-600">Invalid email</p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-xs text-neutral-500 font-mono">{u.id.slice(0, 8)}...</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => saveProfile(u)}
                          disabled={busy}
                          className={btnPrimary}
                          title="Save profile"
                        >
                          <Save className="h-4 w-4" />
                          {savingId === u.id ? "Saving…" : "Save"}
                        </button>

                        <button
                          onClick={() => updateEmail(u)}
                          disabled={busy}
                          className={iconBtn}
                          title="Update email"
                        >
                          <Mail className="h-4 w-4 text-neutral-700" />
                        </button>

                        <button
                          onClick={() => removeUser(u)}
                          disabled={busy}
                          className={dangerIconBtn}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4 text-red-700" />
                        </button>
                      </div>

                      {(emailSavingId === u.id || deletingId === u.id) && (
                        <p className="mt-1 text-xs text-neutral-500 text-right">
                          {emailSavingId === u.id && "Updating email…"}
                          {deletingId === u.id && "Deleting…"}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!shown.length && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <svg className="w-12 h-12 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="mt-3 text-sm text-neutral-600">No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}