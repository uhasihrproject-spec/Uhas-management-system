"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
      className={[
        "block rounded-xl px-4 py-3 text-sm font-semibold border transition-colors",
        isActive
          ? "bg-emerald-50 border-emerald-100 text-neutral-900"
          : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  return (
    <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 bg-neutral-50 ring-neutral-200 text-neutral-800">
      {role ?? "STAFF"}
    </span>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/settings") return pathname === "/settings";
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/");
  if (href === "/letters/new") return pathname === "/letters/new";
  if (href === "/letters")
    return pathname === "/letters" || (pathname.startsWith("/letters/") && pathname !== "/letters/new");
  return pathname === href;
}

export default function MobileNav({
  userEmail,
  role,
  userName,
}: {
  userEmail: string;
  role: "ADMIN" | "SECRETARY" | "STAFF" | null;
  userName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const canManageLetters = role === "ADMIN" || role === "SECRETARY";
  const isAdmin = role === "ADMIN";
  const displayName = userName ?? userEmail;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/letters", label: "Letters", show: true },
    { href: "/letters/new", label: "New letter", show: canManageLetters },
    { href: "/admin", label: "Manage records", show: isAdmin },
    { href: "/settings", label: "Settings", show: true },
  ].filter((i) => i.show);

  // lock background scroll when drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // close drawer on navigation
  useEffect(() => {
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-neutral-200 h-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-full flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl px-3 py-2 text-sm font-semibold border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1 flex items-center justify-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
              <Image
                src="/logo/Uhas.png"
                alt="UHAS Logo"
                width={32}
                height={32}
                className="object-contain w-full h-full"
                priority
              />
            </div>

            <div className="min-w-0 text-center">
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 truncate">
                UHAS Procurement
              </p>
              <p className="text-sm font-bold text-neutral-900 truncate">
                Records Registry
              </p>
            </div>
          </div>

          <form action="/auth/logout" method="post">
            <button className="rounded-xl px-3 py-2 text-sm font-semibold border border-neutral-200 text-neutral-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors">
              Logout
            </button>
          </form>
        </div>
      </header>

      {/* Drawer layer (100% screen height using dvh) */}
      <div
        className={[
          "lg:hidden fixed left-0 top-0 w-screen h-[100dvh] z-50",
          open ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <button
          className={[
            "absolute left-0 top-0 w-screen h-[100dvh] bg-black/30 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          ].join(" ")}
          onClick={() => setOpen(false)}
          aria-label="Close menu backdrop"
          tabIndex={open ? 0 : -1}
        />

        {/* Panel (full width on phones, max width on larger) */}
        <div
          className={[
            "absolute left-0 top-0 bg-white shadow-2xl flex flex-col",
            "h-[100dvh]",
            "w-screen sm:w-[92vw] sm:max-w-[460px]",
            "transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-5 border-b border-neutral-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                    <Image
                      src="/logo/Uhas.png"
                      alt="UHAS Logo"
                      width={48}
                      height={48}
                      className="object-contain w-full h-full"
                      priority
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
                      UHAS Procurement
                    </p>
                    <h2 className="mt-1 text-base font-bold text-neutral-900 truncate">
                      Records Registry
                    </h2>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <RoleBadge role={role} />
                  <p className="text-xs text-neutral-600 truncate">{displayName}</p>
                </div>
              </div>

              <button
                className="rounded-xl px-3 py-2 text-sm font-semibold border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  isActive={isActivePath(pathname, item.href)}
                  onClick={() => setOpen(false)}
                />
              ))}
            </div>
          </nav>

          {/* Footer pinned bottom + safe-area */}
          <div className="mt-auto p-4 border-t border-neutral-200 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            <form action="/auth/logout" method="post">
              <button className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors">
                Sign out
              </button>
            </form>

            <div className="mt-3 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-700">Tip:</span> Swipe back or tap outside to close.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
