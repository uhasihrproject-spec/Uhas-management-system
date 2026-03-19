"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MobileNav from "./MobileNav";

function NavItem({
  href,
  label,
  isActive,
  compact,
}: {
  href: string;
  label: string;
  isActive: boolean;
  compact: boolean;
}) {
  return (
    <Link
      href={href}
      title={compact ? label : undefined}
      className={[
        "group relative flex items-center rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200 ease-out",
        compact ? "justify-center px-3" : "justify-start",
        isActive
          ? "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm"
          : "border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900",
      ].join(" ")}
      prefetch
    >
      {isActive ? (
        <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-yellow-200" />
      ) : null}
      <span className={`relative ${compact ? "sr-only" : ""}`}>{label}</span>
      {compact ? <span className="text-xs font-semibold tracking-wide">{label.slice(0, 2).toUpperCase()}</span> : null}
    </Link>
  );
}

function RoleBadge({ role, compact }: { role: string | null; compact: boolean }) {
  const config = {
    ADMIN: "bg-emerald-50 text-emerald-600 border-emerald-100",
    SECRETARY: "bg-amber-50 text-amber-600 border-amber-100",
    STAFF: "bg-neutral-50 text-neutral-500 border-neutral-100",
  };

  const style = config[role as keyof typeof config] || config.STAFF;

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${style}`}
      title={role ?? "STAFF"}
    >
      {compact ? (role ?? "STAFF").slice(0, 2) : role ?? "STAFF"}
    </span>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/settings") return pathname === "/settings";
  if (href === "/workflow") return pathname === "/workflow" || pathname.startsWith("/workflow/");
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/");
  if (href === "/letters/new") return pathname === "/letters/new";
  if (href === "/letters") return pathname === "/letters" || (pathname.startsWith("/letters/") && pathname !== "/letters/new");
  return pathname === href;
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
  const pathname = usePathname();
  const canManageLetters = role === "ADMIN" || role === "SECRETARY";
  const isAdmin = role === "ADMIN";
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar_collapsed") === "1");
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/workflow", label: "Workflow", show: true },
    { href: "/letters", label: "Letters", show: true },
    { href: "/letters/new", label: "New Letter", show: canManageLetters },
    { href: "/admin", label: "Manage Records", show: isAdmin },
  ].filter((item) => item.show);

  const displayName = userName ?? userEmail;

  return (
    <div className="min-h-screen">
      <MobileNav userEmail={userEmail} role={role} userName={userName} />

      <div className="lg:flex lg:h-screen">
        <aside
          className={`hidden border-r border-neutral-200 bg-white transition-[width] duration-300 ease-out lg:flex lg:flex-col ${
            collapsed ? "lg:w-[96px]" : "lg:w-[296px]"
          }`}
        >
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className={`min-w-0 flex-1 ${collapsed ? "text-center" : ""}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    UHAS Procurement
                  </p>
                  {!collapsed ? <p className="mt-1 text-lg font-bold text-neutral-900">Records</p> : null}

                  <div className={`mt-3 flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
                    <RoleBadge role={role} compact={collapsed} />
                  </div>

                  {!collapsed ? (
                    <p className="mt-2 truncate text-xs text-neutral-500">{displayName}</p>
                  ) : null}
                </div>

                <div className={`overflow-hidden rounded-2xl ${collapsed ? "h-12 w-12" : "h-14 w-14"}`}>
                  <Image
                    src="/logo/Uhas.png"
                    alt="UHAS Logo"
                    width={56}
                    height={56}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={toggleCollapsed}
                className={`mt-4 inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 ${
                  collapsed ? "w-full justify-center" : ""
                }`}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                {!collapsed ? "Collapse sidebar" : null}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    isActive={isActivePath(pathname, item.href)}
                    compact={collapsed}
                  />
                ))}
              </nav>
            </div>

            <div className="border-t border-neutral-200 p-4">
              <div className={`mb-3 flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-sm font-semibold text-neutral-600">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                {!collapsed ? (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-neutral-900">{displayName}</p>
                    <p className="text-xs text-neutral-500">{role ?? "STAFF"}</p>
                  </div>
                ) : null}

                <Link
                  href="/settings"
                  title="Settings"
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
                    isActivePath(pathname, "/settings")
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                  aria-label="Settings"
                >
                  <span className="text-base leading-none">⚙</span>
                </Link>
              </div>

              <form action="/auth/logout" method="post">
                <button
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  type="submit"
                >
                  {collapsed ? "Exit" : "Sign Out"}
                </button>
              </form>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-neutral-50 lg:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
