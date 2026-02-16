import Link from "next/link";
import MobileNav from "./MobileNav";
import type { ReactNode } from "react";

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl px-3 py-2 text-sm text-neutral-800 hover:bg-emerald-50 hover:text-emerald-900 transition"
      prefetch={true}
    >
      {label}
    </Link>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const cls =
    role === "ADMIN"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
      : role === "SECRETARY"
      ? "bg-amber-100 text-amber-900 ring-amber-200"
      : "bg-neutral-100 text-neutral-700 ring-neutral-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${cls}`}
    >
      {role ?? "STAFF"}
    </span>
  );
}

export default function AppShell({
  children,
  userEmail,
  userName,
  role,
}: {
  children: ReactNode;
  userEmail: string;
  userName?: string | null;
  role: "ADMIN" | "SECRETARY" | "STAFF" | null;
}) {
  const canManageLetters = role === "ADMIN" || role === "SECRETARY";
  const isAdmin = role === "ADMIN";

  return (
    <div className="min-h-screen">
      {/* Mobile header + drawer */}
      <MobileNav userEmail={userEmail} role={role} />

      <div className="lg:flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-[290px] p-5">
          <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-5 shadow-sm">
            {/* Brand */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                  UHAS Procurement
                </p>
                <p className="mt-1 text-lg font-semibold text-neutral-900">
                  Records
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <RoleBadge role={role} />
                  <p className="text-xs text-neutral-500 truncate">
                    {userName ?? userEmail}
                  </p>
                </div>
              </div>

              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-amber-500" />
            </div>

            {/* Nav */}
            <div className="mt-6 space-y-1">
            <NavItem href="/dashboard" label="Dashboard" />
            <NavItem href="/letters" label="Letters" />

            {canManageLetters ? (
                <NavItem href="/letters/new" label="New Letter" />
            ) : null}

            {isAdmin ? (
                <NavItem href="/admin" label="Manage Records" />
            ) : null}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
