"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mail, PlusSquare, Shield, Settings, GitBranch, Menu, X } from "lucide-react";

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/settings") return pathname === "/settings";
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/");
  if (href === "/letters/new") return pathname === "/letters/new";
  if (href === "/letters") return pathname === "/letters" || (pathname.startsWith("/letters/") && pathname !== "/letters/new");
  if (href === "/pipeline") return pathname === "/pipeline";
  return pathname === href;
}

export default function MobileNav({ userEmail, role, userName }: { userEmail: string; role: "ADMIN" | "SECRETARY" | "STAFF" | null; userName?: string | null; }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const displayName = userName ?? userEmail;
  const canManageLetters = role === "ADMIN" || role === "SECRETARY";
  const isAdmin = role === "ADMIN";
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: "/letters", label: "Letters", icon: Mail, show: true },
    { href: "/pipeline", label: "Pipeline", icon: GitBranch, show: true },
    { href: "/letters/new", label: "New Letter", icon: PlusSquare, show: canManageLetters },
    { href: "/admin", label: "Manage Records", icon: Shield, show: isAdmin },
    { href: "/settings", label: "Settings", icon: Settings, show: true },
  ].filter((item) => item.show);

  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  return <>
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/75 backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <button onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white/90 text-neutral-700"><Menu className="h-5 w-5" /></button>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white ring-1 ring-neutral-200"><Image src="/logo/Uhas.png" alt="UHAS Logo" width={34} height={34} /></div>
          <div><p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">UHAS</p><p className="text-sm font-semibold text-neutral-900">Letter Hub</p></div>
        </div>
        <form action="/auth/logout" method="post"><button className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700">Exit</button></form>
      </div>
    </header>
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-slate-950/35 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
      <div className={`absolute inset-y-0 left-0 w-[88vw] max-w-sm bg-white/88 p-4 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="rounded-[28px] border border-white/60 bg-white/85 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><p className="text-lg font-semibold text-neutral-900">{displayName}</p><p className="text-xs text-neutral-500">{role ?? "STAFF"}</p></div><button onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200"><X className="h-4 w-4" /></button></div>
          <nav className="mt-4 space-y-2">{navItems.map((item) => { const Icon=item.icon; const active=isActivePath(pathname, item.href); return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${active ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-700"}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}</nav>
        </div>
      </div>
    </div>
  </>;
}
