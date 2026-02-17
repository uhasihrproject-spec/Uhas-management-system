"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import MobileNav from "./MobileNav";
import type { ReactNode } from "react";

function NavItem({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={`
        group relative block rounded-lg px-4 py-2.5 text-sm font-medium
        transition-all duration-200 ease-out
        ${
          isActive
            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
            : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
        }
      `}
      prefetch={true}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-yellow-200 rounded-r" />
      )}
      
      <span className="relative">{label}</span>
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

  const navItems = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/letters", label: "Letters", show: true },
    { href: "/letters/new", label: "New Letter", show: canManageLetters },
    { href: "/admin", label: "Manage Records", show: isAdmin },
  ].filter((item) => item.show);

  return (
    <div className="min-h-screen">
      {/* Mobile header + drawer */}
      <MobileNav userEmail={userEmail} role={role} userName={userName} />

      <div className="lg:flex h-screen">
        {/* Desktop Sidebar - Full Screen Height */}
        <aside className="hidden lg:flex lg:flex-col w-[280px] bg-white border-r border-neutral-200">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header Section */}
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                    UHAS Procurement
                  </p>
                  <p className="mt-1 text-lg font-bold text-neutral-900">
                    Records
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <RoleBadge role={role} />
                  </div>
                  
                  <p className="mt-2 text-xs text-neutral-500 truncate">
                    {userName ?? userEmail}
                  </p>
                </div>

                {/* Logo */}
                <div className="h-14 w-14 rounded-lg flex items-center justify-center overflow-hidden">
                  <Image 
                    src="/logo/Uhas.png" 
                    alt="UHAS Logo" 
                    width={48} 
                    height={48} 
                    className="object-contain w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    isActive={pathname === item.href}
                  />
                ))}
              </nav>
            </div>

            {/* Footer Section */}
            <div className="p-4 border-t border-neutral-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600 font-semibold text-sm">
                  {(userName ?? userEmail).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-900 truncate">
                    {userName ?? userEmail}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {role ?? "STAFF"}
                  </p>
                </div>
              </div>

              <form action="/auth/logout" method="post">
                <button
                  className="w-full rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                  type="submit"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-neutral-50">
          {children}
        </main>
      </div>
    </div>
  );
}