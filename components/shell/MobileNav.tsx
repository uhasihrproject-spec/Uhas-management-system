"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({
  href,
  label,
  onClick,
  isActive,
}: {
  href: string;
  label: string;
  onClick?: () => void;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors
        ${
          isActive
            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
            : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
        }
      `}
    >
      {label}
    </Link>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const config = {
    ADMIN: "bg-emerald-50 text-emerald-600 border-emerald-100",
    SECRETARY: "bg-amber-50 text-amber-600 border-amber-100",
    STAFF: "bg-neutral-50 text-neutral-500 border-neutral-100",
  };

  const style = config[role as keyof typeof config] || config.STAFF;

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${style}`}>
      {role ?? "STAFF"}
    </span>
  );
}

export default function MobileNav({
  userEmail,
  role,
}: {
  userEmail: string;
  role: "ADMIN" | "SECRETARY" | "STAFF" | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const canManageLetters = role === "ADMIN" || role === "SECRETARY";
  const isAdmin = role === "ADMIN";

  const navItems = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/letters", label: "Letters", show: true },
    { href: "/letters/new", label: "New Letter", show: canManageLetters },
    { href: "/admin", label: "Manage Records", show: isAdmin },
  ].filter((item) => item.show);

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg px-3 py-2 text-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 truncate">
              UHAS Procurement
            </p>
            <p className="text-sm font-semibold text-neutral-900 truncate">Records</p>
          </div>

          <form action="/auth/logout" method="post">
            <button className="rounded-lg px-3 py-2 text-sm border border-neutral-200 text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
              Logout
            </button>
          </form>
        </div>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/20"
            onClick={() => setOpen(false)}
            aria-label="Close menu backdrop"
          />
          <div className="absolute left-0 top-0 h-full w-[84%] max-w-sm bg-white shadow-xl flex flex-col">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-200 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                  UHAS Procurement
                </p>
                <h2 className="mt-1 text-lg font-bold text-neutral-900">Records</h2>
                
                <div className="mt-3">
                  <RoleBadge role={role} />
                </div>
              </div>

              <button
                className="rounded-lg px-3 py-2 text-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {navItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    isActive={pathname === item.href}
                    onClick={() => setOpen(false)}
                  />
                ))}
              </div>
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-neutral-200">
              <div className="rounded-lg bg-neutral-50 border border-neutral-100 p-3 mb-3">
                <p className="text-xs text-neutral-500">Signed in</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 truncate">{userEmail}</p>
                <p className="mt-1 text-xs text-neutral-500">Role: {role ?? "STAFF"}</p>
              </div>

              <form action="/auth/logout" method="post">
                <button className="w-full rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}