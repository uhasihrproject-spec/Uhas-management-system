"use client";

import { useMemo, useState } from "react";

type Role = "ADMIN" | "SECRETARY" | "STAFF";

type UserRow = {
  id: string;
  full_name: string | null;
  role: Role;
  department: string | null;
  created_at: string;
};

const inputCls =
  "w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15";

function AddUserForm({
  onCreated,
  onError,
}: {
  onCreated: (u: UserRow) => void;
  onError: (m: string) => void;
}) {
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

      onCreated({
        id: json.userId,
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
    } catch (e: any) {
      onError(e.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-200/70">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <input className={inputCls} placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input className={inputCls} placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="STAFF">STAFF</option>
          <option value="SECRETARY">SECRETARY</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <input className={inputCls} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <input className={inputCls} placeholder="Temporary password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} type="text" />
      </div>

      <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="text-xs text-neutral-600">
          Create the account, then staff can log in immediately. (Tell them to change password later.)
        </p>

        <button
          onClick={create}
          disabled={creating || !email || password.length < 8}
          className="rounded-2xl px-4 py-2 text-sm font-semibold text-white
          bg-gradient-to-r from-emerald-600 to-amber-500 hover:brightness-95 disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create Account"}
        </button>
      </div>

      {ok ? (
        <div className="mt-3 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
          <p className="text-sm text-emerald-700">{ok}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function UsersAdminClient({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState("");
  const [err, setErr] = useState("");

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const name = (u.full_name || "").toLowerCase();
      const dept = (u.department || "").toLowerCase();
      return (
        u.id.toLowerCase().includes(s) ||
        name.includes(s) ||
        dept.includes(s) ||
        u.role.toLowerCase().includes(s)
      );
    });
  }, [users, q]);

  async function save(u: UserRow) {
    try {
      setErr("");
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
    } catch (e: any) {
      setErr(e.message || "Failed to save");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 overflow-hidden">
      {/* Top controls */}
      <div className="p-4 sm:p-5 border-b border-neutral-200/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="text-sm font-semibold text-neutral-900">Add staff account</div>
            <div className="mt-1 text-sm text-neutral-600">
              Create a login, then manage role/department below.
            </div>
          </div>

          <div className="w-full lg:w-[320px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users…"
              className="w-full rounded-2xl border border-neutral-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600/15"
            />
          </div>
        </div>

        <div className="mt-4">
          <AddUserForm
            onCreated={(newUser) => setUsers((prev) => [newUser, ...prev])}
            onError={(m) => setErr(m)}
          />
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 ring-1 ring-red-100">
            <p className="text-sm text-red-700">{err}</p>
          </div>
        ) : null}

        <div className="mt-4 text-sm text-neutral-600">
          Total users: <span className="font-medium text-neutral-900">{users.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-white sticky top-0">
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200/70">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">User ID</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>

          <tbody>
            {shown.map((u) => (
              <tr key={u.id} className="border-b border-neutral-200/60">
                <td className="py-3 px-4">
                  <input
                    className={inputCls}
                    value={u.full_name ?? ""}
                    onChange={(e) =>
                      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, full_name: e.target.value } : x)))
                    }
                  />
                </td>

                <td className="py-3 px-4">
                  <input
                    className={inputCls}
                    value={u.department ?? ""}
                    onChange={(e) =>
                      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, department: e.target.value } : x)))
                    }
                  />
                </td>

                <td className="py-3 px-4">
                  <select
                    className={inputCls}
                    value={u.role}
                    onChange={(e) =>
                      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: e.target.value as Role } : x)))
                    }
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="SECRETARY">SECRETARY</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>

                <td className="py-3 px-4 text-xs text-neutral-500 font-mono">{u.id}</td>

                <td className="py-3 px-4">
                  <button
                    onClick={() => save(u)}
                    disabled={savingId === u.id}
                    className="rounded-2xl px-4 py-2 text-sm font-semibold text-white
                    bg-gradient-to-r from-emerald-600 to-amber-500 hover:brightness-95 disabled:opacity-60"
                  >
                    {savingId === u.id ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            ))}

            {!shown.length ? (
              <tr>
                <td colSpan={5} className="py-8 px-4 text-neutral-500">
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
