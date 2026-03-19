"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mail, PlusSquare, Shield, Settings, PanelLeftClose, PanelLeftOpen, GitBranch } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import MobileNav from "./MobileNav";

function RoleBadge({ role }: { role: string | null }) {
  const config = {
    ADMIN: "bg-emerald-50 text-emerald-700 border-emerald-100",
    SECRETARY: "bg-blue-50 text-blue-700 border-blue-100",
    STAFF: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };
  const style = config[role as keyof typeof config] || config.STAFF;
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style}`}>{role ?? "STAFF"}</span>;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/settings") return pathname === "/settings";
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/");
  if (href === "/letters/new") return pathname === "/letters/new";
  if (href === "/letters") return pathname === "/letters" || (pathname.startsWith("/letters/") && !pathname.includes("/edit") && pathname !== "/letters/new");
  if (href === "/pipeline") return pathname === "/pipeline";
  return pathname === href;
}

export default function AppShell({ children, userEmail, userName, role }: { children: ReactNode; userEmail: string; userName?: string | null; role: "ADMIN" | "SECRETARY" | "STAFF" | null; }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const canManageLetters = role === "ADMIN" || role === "SECRETARY";
  const isAdmin = role === "ADMIN";
  const displayName = userName ?? userEmail;

  useEffect(() => {
    const stored = window.localStorage.getItem("sidebar:collapsed");
    setCollapsed(stored === "1");
  }, []);

  function toggle() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("sidebar:collapsed", next ? "1" : "0");
      return next;
    });
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: "/letters", label: "Letters", icon: Mail, show: true },
    { href: "/pipeline", label: "Pipeline", icon: GitBranch, show: true },
    { href: "/letters/new", label: "New Letter", icon: PlusSquare, show: canManageLetters },
    { href: "/admin", label: "Manage Records", icon: Shield, show: isAdmin },
    { href: "/settings", label: "Settings", icon: Settings, show: true },
  ].filter((item) => item.show);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#f3f4f6_100%)]">
      <MobileNav userEmail={userEmail} role={role} userName={userName} />
      <div className="lg:flex lg:min-h-screen lg:gap-4 lg:p-4">
        <aside className={`hidden lg:flex lg:flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/70 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.55)] backdrop-blur-2xl transition-all duration-300 ${collapsed ? "w-[96px]" : "w-[292px]"}`}>
          <div className="flex items-center justify-between border-b border-neutral-200/70 p-4">
            <div className={`flex items-center gap-3 transition-all ${collapsed ? "justify-center w-full" : ""}`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-neutral-200">
                <Image src="/logo/Uhas.png" alt="UHAS Logo" width={38} height={38} className="object-contain" />
              </div>
              {!collapsed ? <div><p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">UHAS</p><p className="text-lg font-semibold text-neutral-900">Letter Hub</p></div> : null}
            </div>
            {!collapsed ? <button type="button" onClick={toggle} className="rounded-2xl border border-neutral-200 bg-white p-2.5 text-neutral-700 hover:bg-neutral-50"><PanelLeftClose className="h-4 w-4" /></button> : null}
          </div>
          {collapsed ? <button type="button" onClick={toggle} className="mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"><PanelLeftOpen className="h-4 w-4" /></button> : null}
          <div className="px-4 pt-4">{!collapsed ? <><RoleBadge role={role} /><p className="mt-3 truncate text-sm font-medium text-neutral-900">{displayName}</p><p className="truncate text-xs text-neutral-500">{userEmail}</p></> : <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-semibold text-emerald-800">{displayName.charAt(0).toUpperCase()}</div>}</div>
          <nav className="flex-1 space-y-2 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all ${active ? "bg-neutral-900 text-white shadow-lg shadow-neutral-900/15" : "text-neutral-600 hover:bg-white hover:text-neutral-900"}`} title={collapsed ? item.label : undefined}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-neutral-200/70 p-4">
            {!collapsed ? <div className="mb-3 rounded-2xl bg-neutral-50 p-3 text-xs text-neutral-600 ring-1 ring-neutral-200/70">Role-based access and workflow controls are enforced server-side.</div> : null}
            <form action="/auth/logout" method="post"><button className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-red-50 hover:text-red-700">{collapsed ? "↪" : "Sign Out"}</button></form>
          </div>
        </aside>
        <main className="flex-1 min-w-0 rounded-[32px] bg-transparent lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
