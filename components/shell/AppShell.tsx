import Link from "next/link";
import MobileNav from "./MobileNav";

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl px-3 py-2 text-sm text-neutral-700 hover:bg-emerald-50 hover:text-emerald-800 transition"
      prefetch
    >
      {label}
    </Link>
  );
}

export default function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  return (
    <div className="min-h-screen">
      {/* Mobile header + drawer */}
      <MobileNav userEmail={userEmail} />

      {/* SHOW sidebar from md and above */}
      <div className="md:flex min-h-screen">
        {/* Sidebar: width scales up on huge screens */}
        <aside className="hidden md:block w-[280px] 2xl:w-[320px] p-4 sm:p-5 2xl:p-6">
          <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 ring-brand p-5 2xl:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                  UHAS Procurement
                </p>
                <h2 className="mt-2 text-lg 2xl:text-xl font-semibold">
                  Records Console
                </h2>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 ring-1 ring-emerald-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Secure Registry
                </div>
              </div>

              <div className="h-10 w-10 2xl:h-12 2xl:w-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-amber-500" />
            </div>

            <nav className="mt-6 space-y-1">
              <NavItem href="/dashboard" label="Dashboard" />
              <NavItem href="/letters" label="Letters" />
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

          <p className="mt-4 px-1 text-xs text-neutral-500">
            Green/yellow theme • clean • searchable records.
          </p>
        </aside>

        {/* Main: padding scales; content width is capped on huge screens */}
        <div className="flex-1 p-0 md:p-4 lg:p-5 2xl:p-8">
          <div className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-32px)] lg:min-h-[calc(100vh-40px)] bg-white ring-1 ring-neutral-200/70 ring-brand md:rounded-3xl">
            {/* Prevent ultra-wide stretching on TVs */}
            <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
