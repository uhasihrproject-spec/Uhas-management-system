"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard")   return pathname === "/dashboard";
  if (href === "/settings")    return pathname === "/settings";
  if (href === "/admin")       return pathname === "/admin" || pathname.startsWith("/admin/");
  if (href === "/pipeline")    return pathname === "/pipeline" || pathname.startsWith("/pipeline/");
  if (href === "/letters/new") return pathname === "/letters/new";
  if (href === "/letters")
    return pathname === "/letters" || (pathname.startsWith("/letters/") && pathname !== "/letters/new");
  return pathname === href;
}

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export default function MobileNav({
  userEmail,
  role,
  userName,
}: {
  userEmail: string;
  role: "ADMIN" | "SECRETARY" | "STAFF" | null;
  userName?: string | null;
}) {
  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false); // for stagger trigger
  const pathname              = usePathname();

  const canManageLetters = role === "ADMIN" || role === "SECRETARY";
  const isAdmin          = role === "ADMIN";
  const displayName      = userName ?? userEmail;
  const initial          = displayName.charAt(0).toUpperCase();

  const navItems = [
    { href: "/dashboard",   label: "Dashboard",     show: true },
    { href: "/letters",     label: "Letters",        show: true },
    { href: "/letters/new", label: "New Letter",     show: canManageLetters },
    { href: "/pipeline",    label: "Track Progress",       show: true },
    { href: "/admin",       label: "Manage Records", show: isAdmin },
    { href: "/settings",    label: "Settings",       show: true },
  ].filter((i) => i.show);

  const badgeMap: Record<string, string> = {
    ADMIN:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
    SECRETARY: "bg-amber-50   text-amber-700   border border-amber-200",
    STAFF:     "bg-neutral-100 text-neutral-500 border border-neutral-200",
  };
  const badge = badgeMap[role ?? "STAFF"] ?? badgeMap.STAFF;

  // lock scroll
  useEffect(() => {
    if (!open) { setMounted(false); return; }
    document.body.style.overflow = "hidden";
    // tiny delay so items animate in after panel appears
    const t = setTimeout(() => setMounted(true), 30);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open]);

  // close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-neutral-200 h-14">
        <div className="h-full px-4 flex items-center justify-between gap-3">

          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="relative h-9 w-9 rounded-xl border border-neutral-200 flex flex-col items-center justify-center gap-[5px] hover:bg-neutral-50 hover:border-neutral-300 transition-colors duration-150 group"
          >
            <span className="w-4 h-[1.5px] bg-neutral-600 rounded-full transition-all duration-200 group-hover:w-[18px]" />
            <span className="w-[18px] h-[1.5px] bg-neutral-600 rounded-full" />
            <span className="w-[14px] h-[1.5px] bg-neutral-600 rounded-full transition-all duration-200 group-hover:w-[18px]" />
          </button>

          {/* Centre wordmark */}
          <div className="flex items-center gap-2.5 absolute left-1/2 -translate-x-1/2">
            <div className="h-7 w-7 rounded-lg overflow-hidden bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <Image src="/logo/Uhas.png" alt="UHAS" width={22} height={22} className="object-contain" priority />
            </div>
            <div className="leading-tight">
              <p className="text-[9px] uppercase tracking-[0.18em] font-semibold text-neutral-400">UHAS</p>
              <p className="text-sm font-bold text-neutral-900 -mt-0.5">Records</p>
            </div>
          </div>

          {/* Sign out pill */}
          <form action="/auth/logout" method="post">
            <button className="h-9 px-3 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors duration-150">
              Out
            </button>
          </form>
        </div>
      </header>

      {/* ── Drawer ──────────────────────────────────────────────────── */}
      <div
        className={`lg:hidden fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        {/* Backdrop — frosted */}
        <div
          onClick={() => setOpen(false)}
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: "rgba(15,15,15,0.45)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            opacity: open ? 1 : 0,
          }}
        />

        {/* Panel */}
        <div
          role="dialog"
          aria-modal="true"
          className="absolute left-0 top-0 h-[100dvh] flex flex-col bg-white overflow-hidden"
          style={{
            width: "min(88vw, 340px)",
            transform: open ? "translateX(0)" : "translateX(-100%)",
            transition: `transform 300ms ${EASE}`,
            willChange: "transform",
            boxShadow: open ? "12px 0 48px rgba(0,0,0,0.15)" : "none",
          }}
        >
          {/* ── Panel header ── */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl overflow-hidden bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Image src="/logo/Uhas.png" alt="UHAS" width={32} height={32} className="object-contain" priority />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] font-semibold text-neutral-400">UHAS Procurement</p>
                <p className="text-base font-bold text-neutral-900 leading-tight">Records Registry</p>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="h-8 w-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors duration-150"
            >
              <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* ── User pill ── */}
          <div
            className="mx-4 mt-4 mb-1 flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(6px)",
              transition: `opacity 240ms ease, transform 240ms ease`,
            }}
          >
            <div className="h-8 w-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 text-sm font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-800 truncate">{displayName}</p>
              <span className={`inline-flex items-center rounded px-1.5 py-[2px] text-[9px] font-bold mt-0.5 ${badge}`}>
                {role ?? "STAFF"}
              </span>
            </div>
          </div>

          {/* ── Nav ── */}
          <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {navItems.map((item, i) => {
              const active = isActivePath(pathname, item.href);
              const delay  = mounted ? `${i * 30 + 40}ms` : "0ms";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative flex items-center h-12 rounded-xl px-4 text-sm font-medium
                    transition-all duration-150 group overflow-hidden
                    ${active
                      ? "bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent"}
                  `}
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateX(0)" : "translateX(-12px)",
                    transition: `opacity 240ms ease ${delay}, transform 240ms ease ${delay}, background-color 150ms, border-color 150ms, color 150ms`,
                  }}
                >
                  {/* active yellow pip */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-yellow-300" />
                  )}

                  {/* hover shimmer */}
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.04), transparent)" }}
                  />

                  <span className="relative">{item.label}</span>

                  {/* arrow on hover */}
                  {!active && (
                    <svg
                      viewBox="0 0 10 10"
                      fill="none"
                      className="ml-auto w-3 h-3 text-neutral-300 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200"
                    >
                      <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Footer ── */}
          <div
            className="px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 border-t border-neutral-100 flex-shrink-0"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(6px)",
              transition: `opacity 240ms ease 200ms, transform 240ms ease 200ms`,
            }}
          >
            <form action="/auth/logout" method="post">
              <button className="
                w-full h-11 rounded-xl border border-neutral-200 text-sm font-semibold
                text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600
                transition-all duration-150 flex items-center justify-center gap-2
              ">
                <svg viewBox="0 0 18 18" fill="none" className="w-4 h-4">
                  <path d="M6.5 2.5H3.5A1.5 1.5 0 0 0 2 4v10a1.5 1.5 0 0 0 1.5 1.5h3M12 12.5L16 9l-4-3.5M16 9H7"
                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sign Out
              </button>
            </form>

            <p className="mt-3 text-center text-[10px] text-neutral-400">
              Tap outside or swipe left to close
            </p>
          </div>

        </div>
      </div>
    </>
  );
}