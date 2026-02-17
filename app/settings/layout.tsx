import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          UHAS Procurement Directorate
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-neutral-900">
          Settings
        </h1>

        {/* ✅ Quick tip FIRST */}
        <div className="mt-4 rounded-3xl bg-white ring-1 ring-neutral-200/70 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Quick tip</p>
              <p className="mt-1 text-sm text-neutral-700">
                Use search + filters on the Letters page to find any record fast.
              </p>
            </div>
            <span className="inline-flex rounded-2xl bg-emerald-100 text-black px-4 py-2 text-sm font-semibold">
              Fast retrieval
            </span>
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
