"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import MobileNav from "./MobileNav";
import type { ReactNode } from "react";

// ─── Route helper ─────────────────────────────────────────────────────────────

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

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function NavIcon({ name, active }: { name: string; active?: boolean }) {
  const cls = `w-[18px] h-[18px] transition-colors duration-200 ${
    active ? "text-emerald-700" : "text-neutral-400"
  }`;
  const icons: Record<string, ReactNode> = {
    Dashboard: (
      <svg viewBox="0 0 18 18" fill="none" className={cls}>
        <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="10.5" y="1.5" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3" />
        <rect x="1.5" y="10.5" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3" />
        <rect x="10.5" y="10.5" width="6" height="6" rx="1.5" fill="currentColor" />
      </svg>
    ),
    Letters: (
      <svg viewBox="0 0 18 18" fill="none" className={cls}>
        <rect x="1.5" y="3.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1.5 6.5L9 10.5L16.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    "New Letter": (
      <svg viewBox="0 0 18 18" fill="none" className={cls}>
        <rect x="1.5" y="3.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M9 7V11M7 9H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    Pipeline: (
      <svg viewBox="0 0 18 18" fill="none" className={cls}>
        <circle cx="3.5" cy="9" r="2" fill="currentColor"/>
        <circle cx="9" cy="4.5" r="2" fill="currentColor" opacity=".6"/>
        <circle cx="9" cy="13.5" r="2" fill="currentColor" opacity=".6"/>
        <circle cx="14.5" cy="9" r="2" fill="currentColor" opacity=".3"/>
        <path d="M5.5 9H7M11 4.5H12.5C13.3 4.5 14.5 5.2 14.5 6.5V7.5M11 13.5H12.5C13.3 13.5 14.5 12.8 14.5 11.5V10.5"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    "Manage Records": (
      <svg viewBox="0 0 18 18" fill="none" className={cls}>
        <rect x="1.5" y="1.5" width="15" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1.5" y="7"   width="15" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1.5" y="12.5" width="15" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    Settings: (
      <svg viewBox="0 0 18 18" fill="none" className={cls}>
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M9 1.5V3M9 15V16.5M16.5 9H15M3 9H1.5M14.3 3.7L13.2 4.8M4.8 13.2L3.7 14.3M14.3 14.3L13.2 13.2M4.8 4.8L3.7 3.7"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  };
  return <>{icons[name] ?? (name === "Track Progress" ? icons.Pipeline : null)}</>;
}

// ─── Nav item — icon fades out, text fades in, same row ──────────────────────

function NavItem({
  href,
  label,
  expanded,
  index,
}: {
  href: string;
  label: string;
  expanded: boolean;
  index: number;
}) {
  const pathname = usePathname();
  const active   = isActivePath(pathname, href);

  // Stagger: items come in left-to-right on expand, instantly collapse
  const stagger = expanded ? `${index * 28}ms` : "0ms";

  return (
    <Link
      href={href}
      title={!expanded ? label : undefined}
      className={`
        relative flex items-center rounded-lg h-10 transition-colors duration-150 group overflow-hidden
        ${expanded ? "px-3" : "justify-center px-0"}
        ${active
          ? "bg-emerald-50 text-emerald-700"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"}
      `}
    >
      {/* Active yellow pip */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-yellow-300" />
      )}

      {/* ICON — shown when collapsed, fades + scales out when expanding */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-200"
        style={{
          opacity:   expanded ? 0 : 1,
          transform: expanded ? "scale(0.7)" : "scale(1)",
          transitionDelay: expanded ? "0ms" : stagger,
        }}
      >
        <span className="transition-transform duration-150 group-hover:scale-110">
          <NavIcon name={label} active={active} />
        </span>
      </span>

      {/* TEXT — hidden when collapsed, fades + slides in when expanding */}
      <span
        className={`
          relative text-sm whitespace-nowrap transition-all duration-220 overflow-hidden
          ${active ? "font-semibold" : "font-medium"}
        `}
        style={{
          opacity:      expanded ? 1 : 0,
          transform:    expanded ? "translateX(0)" : "translateX(-6px)",
          maxWidth:     expanded ? "200px" : "0px",
          transitionDelay: stagger,
          transitionProperty: "opacity, transform, max-width",
          transitionDuration: "220ms",
          transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* hover underline */}
        <span className="relative">
          {label}
          {!active && (
            <span className="absolute -bottom-px left-0 h-px w-0 group-hover:w-full bg-emerald-400 transition-all duration-200 rounded-full" />
          )}
        </span>
      </span>
    </Link>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

const COLLAPSED_W = 62;   // px
const EXPANDED_W  = 248;  // px
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const DUR  = "270ms";

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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const canManageLetters = role === "ADMIN" || role === "SECRETARY";
  const isAdmin          = role === "ADMIN";

  const navItems = [
    { href: "/dashboard",   label: "Dashboard",     show: true },
    { href: "/letters",     label: "Letters",        show: true },
    { href: "/letters/new", label: "New Letter",     show: canManageLetters },
    { href: "/pipeline",    label: "Track Progress",       show: true },
    { href: "/admin",       label: "Manage Records", show: isAdmin },
  ].filter((i) => i.show);

  const displayName = userName ?? userEmail;
  const initial     = displayName.charAt(0).toUpperCase();

  const badgeMap: Record<string, string> = {
    ADMIN:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
    SECRETARY: "bg-amber-50 text-amber-700 border border-amber-200",
    STAFF:     "bg-neutral-100 text-neutral-500 border border-neutral-200",
  };
  const badge = badgeMap[role ?? "STAFF"] ?? badgeMap.STAFF;

  return (
    <div className="min-h-screen">
      <MobileNav userEmail={userEmail} role={role} userName={userName} />

      <div className="lg:flex lg:h-screen">

        {/* ════════════════════════════════════════════════════════════
            THE SIDEBAR — one single element that changes its own width.
            Uses max-width transition so it doesn't fight flex layout.
            Content inside uses absolute positioning for icon↔text swap.
        ════════════════════════════════════════════════════════════ */}
        <aside
          className="hidden lg:flex flex-col bg-white border-r border-neutral-200 flex-shrink-0 overflow-hidden relative z-30"
          style={{
            width: open ? EXPANDED_W : COLLAPSED_W,
            minWidth: open ? EXPANDED_W : COLLAPSED_W,
            transition: `width ${DUR} ${EASE}, min-width ${DUR} ${EASE}, box-shadow ${DUR} ${EASE}`,
            boxShadow: open ? "4px 0 24px rgba(0,0,0,0.07)" : "none",
            willChange: "width",
          }}
        >

          {/* ── Header / Logo toggle ── */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center border-b border-neutral-100 flex-shrink-0 w-full hover:bg-neutral-50 transition-colors duration-150 group overflow-hidden"
            style={{
              height: 64,
              paddingLeft: open ? 16 : 0,
              justifyContent: open ? "flex-start" : "center",
              transition: `padding ${DUR} ${EASE}`,
            }}
            title={open ? "Collapse" : "Expand"}
          >
            {/* Logo icon */}
            <div className="relative h-8 w-8 flex-shrink-0 rounded-lg overflow-hidden bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Image src="/logo/Uhas.png" alt="UHAS" width={26} height={26} className="object-contain" />
              {/* hover chevron */}
              <div className="absolute inset-0 bg-emerald-700/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-lg">
                <svg viewBox="0 0 12 12" fill="none" className={`w-3 h-3 text-white transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Wordmark — slides in beside logo */}
            <div
              className="ml-3 flex flex-col items-start overflow-hidden"
              style={{
                opacity:   open ? 1 : 0,
                maxWidth:  open ? 160 : 0,
                transform: open ? "translateX(0)" : "translateX(-8px)",
                transition: `opacity ${DUR} ${EASE}, max-width ${DUR} ${EASE}, transform ${DUR} ${EASE}`,
              }}
            >
              <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-neutral-400 whitespace-nowrap">
                UHAS Procurement
              </span>
              <span className="text-[15px] font-bold text-neutral-900 whitespace-nowrap leading-tight mt-0.5">
                Records
              </span>
            </div>
          </button>

          {/* ── Main nav ── */}
          <nav className="flex-1 overflow-hidden py-3 px-2 flex flex-col gap-0.5">
            {navItems.map((item, i) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                expanded={open}
                index={i}
              />
            ))}
          </nav>

          {/* ── Footer ── */}
          <div className="border-t border-neutral-100 flex-shrink-0 py-3 px-2 flex flex-col gap-1">

            {/* Avatar row */}
            <div
              className={`flex items-center rounded-lg h-10 overflow-hidden transition-colors duration-150 ${
                open ? "px-3 gap-2.5 hover:bg-neutral-50 cursor-default" : "justify-center"
              }`}
            >
              <div
                title={displayName}
                className="h-7 w-7 flex-shrink-0 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-bold"
              >
                {initial}
              </div>
              <div
                className="flex flex-col overflow-hidden"
                style={{
                  opacity:   open ? 1 : 0,
                  maxWidth:  open ? 160 : 0,
                  transform: open ? "translateX(0)" : "translateX(-6px)",
                  transition: `opacity ${DUR} ${EASE} 40ms, max-width ${DUR} ${EASE} 40ms, transform ${DUR} ${EASE} 40ms`,
                }}
              >
                <span className="text-xs font-semibold text-neutral-800 truncate whitespace-nowrap leading-tight">
                  {displayName}
                </span>
                <span className={`inline-flex items-center self-start rounded px-1.5 py-[2px] text-[9px] font-bold mt-0.5 ${badge}`}>
                  {role ?? "STAFF"}
                </span>
              </div>
            </div>

            {/* Settings */}
            <Link
              href="/settings"
              title={!open ? "Settings" : undefined}
              className={`
                relative flex items-center rounded-lg h-10 overflow-hidden transition-colors duration-150 group
                ${open ? "px-3" : "justify-center px-0"}
                ${isActivePath(pathname, "/settings")
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"}
              `}
            >
              {isActivePath(pathname, "/settings") && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-yellow-300" />
              )}
              {/* Icon */}
              <span
                className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                style={{ opacity: open ? 0 : 1, transform: open ? "scale(0.7)" : "scale(1)" }}
              >
                <span className="transition-transform duration-150 group-hover:scale-110">
                  <NavIcon name="Settings" active={isActivePath(pathname, "/settings")} />
                </span>
              </span>
              {/* Text */}
              <span
                className="relative text-sm font-medium whitespace-nowrap overflow-hidden"
                style={{
                  opacity:   open ? 1 : 0,
                  maxWidth:  open ? 160 : 0,
                  transform: open ? "translateX(0)" : "translateX(-6px)",
                  transition: `opacity 220ms ${EASE} 50ms, max-width 220ms ${EASE} 50ms, transform 220ms ${EASE} 50ms`,
                }}
              >
                <span className="relative">
                  Settings
                  {!isActivePath(pathname, "/settings") && (
                    <span className="absolute -bottom-px left-0 h-px w-0 group-hover:w-full bg-emerald-400 transition-all duration-200 rounded-full" />
                  )}
                </span>
              </span>
            </Link>

            {/* Sign Out */}
            <form action="/auth/logout" method="post">
              <button
                title={!open ? "Sign Out" : undefined}
                className={`
                  relative flex items-center rounded-lg h-10 w-full overflow-hidden transition-colors duration-150 group
                  ${open ? "px-3" : "justify-center px-0"}
                  text-neutral-400 hover:bg-red-50 hover:text-red-500
                `}
              >
                {/* Icon */}
                <span
                  className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                  style={{ opacity: open ? 0 : 1, transform: open ? "scale(0.7)" : "scale(1)" }}
                >
                  <span className="transition-transform duration-150 group-hover:scale-110">
                    <svg viewBox="0 0 18 18" fill="none" className="w-[17px] h-[17px]">
                      <path d="M6.5 2.5H3.5A1.5 1.5 0 0 0 2 4v10a1.5 1.5 0 0 0 1.5 1.5h3M12 12.5L16 9l-4-3.5M16 9H7"
                        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </span>
                {/* Text */}
                <span
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  style={{
                    opacity:   open ? 1 : 0,
                    maxWidth:  open ? 160 : 0,
                    transform: open ? "translateX(0)" : "translateX(-6px)",
                    transition: `opacity 220ms ${EASE} 60ms, max-width 220ms ${EASE} 60ms, transform 220ms ${EASE} 60ms`,
                  }}
                >
                  Sign Out
                </span>
              </button>
            </form>

          </div>
        </aside>

        {/* Click-outside to collapse */}
        {open && (
          <div className="fixed inset-0 z-20 hidden lg:block" onClick={() => setOpen(false)} />
        )}

        {/* ── Main ── */}
        <main className="flex-1 min-w-0 bg-neutral-50 lg:overflow-y-auto relative z-10">
          {children}
        </main>

      </div>
    </div>
  );
}