"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const colors: Record<Role, string> = {
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

/* ---------------- Modal ---------------- */

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close modal backdrop" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl ring-1 ring-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-900 truncate">{title}</div>
              <div className="text-xs text-neutral-500">Fill details and create the account</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 transition"
              aria-label="Close modal"
              title="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Add User Popup Form ---------------- */

function AddUserPopup({
  onCreated,
  onError,
}: {
  onCreated: (u: UserRow) => void;
  onError: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<Role>("STAFF");
  const [creating, setCreating] = useState(false);

  function reset() {
    setEmail("");
    setPassword("");
    setFullName("");
    setDepartment("");
    setRole("STAFF");
  }

  async function create() {
    try {
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
      if (!res.ok) throw new Error(json?.detail || json?.error || "Failed to create user");

      onCreated({
        id: json.userId,
        email: email || null,
        full_name: fullName || null,
        department: department || null,
        role,
        created_at: new Date().toISOString(),
      });

      reset();
      setOpen(false);
    } catch (e: any) {
      onError(e?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  const canCreate = !!email && isEmail(email) && password.length >= 8;

  return (
    <>
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        <UserPlus className="h-4 w-4" />
        Add User
      </button>

      <Modal open={open} title="Create New User" onClose={() => (!creating ? setOpen(false) : null)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Full Name</label>
            <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. John Doe" />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Department</label>
            <input className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. IT" />
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
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" type="email" />
            {email && !isEmail(email) ? <div className="mt-1 text-xs text-red-600">Invalid email</div> : null}
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Temporary Password * (min 8 chars)</label>
            <input className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="User can change this after first login" type="text" />
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-600">
            Tip: user can log in immediately. Ask them to change password after first sign-in.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (creating) return;
                reset();
                setOpen(false);
              }}
              className={btnSecondary}
              disabled={creating}
            >
              Cancel
            </button>
            <button onClick={create} disabled={creating || !canCreate} className={btnPrimary}>
              <UserPlus className="h-4 w-4" />
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ---------------- Mobile card (no swipe here) ---------------- */

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
          <div className="text-sm font-semibold text-neutral-900 truncate">{u.full_name || "Unnamed User"}</div>
          <div className="mt-1 flex items-center gap-2">
            <RoleBadge role={u.role} />
            <span className="text-xs text-neutral-500">{u.department || "No dept"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="text-xs font-medium text-neutral-600 mb-1 block">Full Name</label>
          <input className={inputCls} value={u.full_name ?? ""} onChange={(e) => onChange({ full_name: e.target.value })} placeholder="Full name" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-1 block">Department</label>
            <input className={inputCls} value={u.department ?? ""} onChange={(e) => onChange({ department: e.target.value })} placeholder="Department" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-1 block">Role</label>
            <select className={inputCls} value={u.role} onChange={(e) => onChange({ role: e.target.value as Role })}>
              <option value="STAFF">STAFF</option>
              <option value="SECRETARY">SECRETARY</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-600 mb-1 block">Email</label>
          <input className={inputCls} value={u.email ?? ""} onChange={(e) => onChange({ email: e.target.value })} type="email" placeholder="user@example.com" />
          {u.email && !isEmail(u.email) ? <p className="mt-1 text-xs text-red-600">Invalid email format</p> : null}
        </div>

        <div className="text-xs text-neutral-400 font-mono truncate">ID: {u.id}</div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={onSave} disabled={busy} className={btnPrimary + " flex-1"}>
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </button>

        <button onClick={onUpdateEmail} disabled={busy} className={iconBtn} title="Update email" aria-label="Update email">
          <Mail className="h-4 w-4 text-neutral-700" />
        </button>

        <button onClick={onRemove} disabled={busy} className={dangerIconBtn} title="Delete user" aria-label="Delete user">
          <Trash2 className="h-4 w-4 text-red-700" />
        </button>
      </div>

      {(updatingEmail || removing) ? (
        <p className="mt-2 text-xs text-neutral-600">
          {updatingEmail ? "Updating email…" : null}
          {removing ? "Removing user…" : null}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------- Main ---------------- */

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
      return u.id.toLowerCase().includes(s) || name.includes(s) || dept.includes(s) || email.includes(s) || u.role.toLowerCase().includes(s);
    });
  }, [users, q]);

  function flashOk(message: string) {
    setOk(message);
    window.setTimeout(() => setOk(""), 2600);
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
    }, 280);
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
      if (!res.ok) throw new Error(json?.detail || json?.error || "Failed to save");
      flashOk("Profile saved ✅");
    } catch (e: any) {
      setErr(e?.message || "Failed to save");
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
      if (!res.ok) throw new Error(json?.detail || json?.error || "Failed to update email");

      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, email } : x)));
      flashOk("Email updated ✅");
    } catch (e: any) {
      setErr(e?.message || "Failed to update email");
    } finally {
      setEmailSavingId("");
    }
  }

  async function removeUser(u: UserRow) {
    const yes = window.confirm(`Delete this user?\n\n${u.full_name || "(no name)"}\n${u.email || "(no email)"}\n\nThis cannot be undone.`);
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

      if (!res.ok) throw new Error(json?.detail || json?.error || `Delete failed (${res.status})`);

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
      {err ? (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <div className="mt-0.5 h-5 w-5 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold">!</div>
          <p className="text-sm text-red-700">{err}</p>
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
          <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">✓</div>
          <p className="text-sm text-emerald-900">{ok}</p>
        </div>
      ) : null}

      {/* Main Card */}
      <div className="rounded-2xl bg-white border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">User Management</h2>
              <p className="mt-1 text-sm text-neutral-600">Create accounts and manage user details</p>
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

              <AddUserPopup
                onCreated={(newUser) => setUsers((prev) => [newUser, ...prev])}
                onError={(m) => setErr(m)}
              />
            </div>
          </div>
        </div>

        {/* MOBILE */}
        <div className="md:hidden p-4 space-y-3 bg-neutral-50">
          {shown.map((u) => {
            const busy = savingId === u.id || emailSavingId === u.id || deletingId === u.id;

            return (
              <div
                key={u.id}
                className={`transition-all duration-300 ${leavingIds[u.id] ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"}`}
                style={{ background: leavingIds[u.id] ? "rgba(239,68,68,0.06)" : undefined, borderRadius: 16 }}
              >
                <MobileUserCard
                  u={u}
                  busy={busy}
                  saving={savingId === u.id}
                  updatingEmail={emailSavingId === u.id}
                  removing={deletingId === u.id}
                  onChange={(next) => setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...next } : x)))}
                  onSave={() => saveProfile(u)}
                  onUpdateEmail={() => updateEmail(u)}
                  onRemove={() => removeUser(u)}
                />
              </div>
            );
          })}

          {!shown.length ? (
            <div className="rounded-2xl bg-white border border-neutral-200 p-8 text-center">
              <p className="text-sm text-neutral-600">No users found</p>
            </div>
          ) : null}
        </div>

        {/* DESKTOP */}
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
                    className={`transition-all duration-300 hover:bg-neutral-50 ${leavingIds[u.id] ? "bg-red-50 opacity-0 translate-x-2" : ""}`}
                  >
                    <td className="py-3 px-4">
                      <input
                        className={inputCls}
                        value={u.full_name ?? ""}
                        onChange={(e) => setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, full_name: e.target.value } : x)))}
                        placeholder="Full name"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <input
                        className={inputCls}
                        value={u.department ?? ""}
                        onChange={(e) => setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, department: e.target.value } : x)))}
                        placeholder="Department"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <select
                        className={inputCls}
                        value={u.role}
                        onChange={(e) => setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: e.target.value as Role } : x)))}
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
                        onChange={(e) => setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, email: e.target.value } : x)))}
                        type="email"
                        placeholder="user@example.com"
                      />
                      {u.email && !isEmail(u.email) ? <p className="mt-1 text-xs text-red-600">Invalid email</p> : null}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-xs text-neutral-500 font-mono">{u.id}</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => saveProfile(u)} disabled={busy} className={btnPrimary} title="Save profile">
                          <Save className="h-4 w-4" />
                          {savingId === u.id ? "Saving…" : "Save"}
                        </button>

                        <button onClick={() => updateEmail(u)} disabled={busy} className={iconBtn} title="Update email" aria-label="Update email">
                          <Mail className="h-4 w-4 text-neutral-700" />
                        </button>

                        <button onClick={() => removeUser(u)} disabled={busy} className={dangerIconBtn} title="Delete user" aria-label="Delete user">
                          <Trash2 className="h-4 w-4 text-red-700" />
                        </button>
                      </div>

                      {(emailSavingId === u.id || deletingId === u.id) ? (
                        <p className="mt-1 text-xs text-neutral-500 text-right">
                          {emailSavingId === u.id ? "Updating email…" : null}
                          {deletingId === u.id ? "Deleting…" : null}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}

              {!shown.length ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-neutral-600">
                    No users found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
