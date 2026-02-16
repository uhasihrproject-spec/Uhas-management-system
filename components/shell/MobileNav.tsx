"use client";

import { useState } from "react";
import Link from "next/link";

function NavItem({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-xl px-3 py-2 text-sm text-neutral-700 hover:bg-emerald-50 hover:text-emerald-800 transition"
    >
      {label}
    </Link>
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

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-neutral-200/70">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl px-3 py-2 text-sm ring-1 ring-neutral-200 hover:bg-neutral-50"
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 truncate">
              UHAS Procurement
            </p>
            <p className="text-sm font-semibold truncate">Records Console</p>
          </div>

          <form action="/auth/logout" method="post">
            <button className="rounded-xl px-3 py-2 text-sm text-red-600 ring-1 ring-neutral-200 hover:bg-red-50 transition">
              Logout
            </button>
          </form>
        </div>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-label="Close menu backdrop"
          />
          <div className="absolute left-0 top-0 h-full w-[84%] max-w-sm bg-white shadow-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                  UHAS Procurement
                </p>
                <h2 className="mt-2 text-lg font-semibold">Records Console</h2>
              </div>

              <button
                className="rounded-xl px-3 py-2 text-sm ring-1 ring-neutral-200 hover:bg-neutral-50"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <nav className="mt-6 space-y-1">
              <NavItem href="/dashboard" label="Dashboard" onClick={() => setOpen(false)} />
              <NavItem href="/letters" label="Letters" onClick={() => setOpen(false)} />
            </nav>

            <div className="mt-6 rounded-2xl bg-neutral-50 p-3 ring-1 ring-neutral-200/60">
              <p className="text-xs text-neutral-500">Signed in</p>
              <p className="mt-1 text-sm font-medium truncate">{userEmail}</p>
            </div>

            <form action="/auth/logout" method="post" className="mt-4">
              <button className="w-full rounded-2xl bg-white px-4 py-2 text-sm text-red-600 ring-1 ring-neutral-200 hover:bg-red-50 transition">
                Logout
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
