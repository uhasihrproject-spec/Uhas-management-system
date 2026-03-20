export default function Loading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_35%),linear-gradient(180deg,#fafaf9_0%,#ffffff_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-neutral-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50">
              <div className="flex items-end gap-1.5">
                <span className="h-3 w-2 rounded-full bg-emerald-500 animate-[pulse_1s_ease-in-out_infinite]" />
                <span className="h-6 w-2 rounded-full bg-emerald-400 animate-[pulse_1s_ease-in-out_.15s_infinite]" />
                <span className="h-4 w-2 rounded-full bg-amber-400 animate-[pulse_1s_ease-in-out_.3s_infinite]" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">UHAS Procurement Directorate</p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-900">Loading your workspace</h2>
              <p className="mt-1 text-sm text-neutral-500">Please wait while we prepare the latest records and tasks.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-neutral-50 p-5">
              <div className="h-3 w-24 rounded-full bg-neutral-200 animate-pulse" />
              <div className="mt-4 space-y-3">
                <div className="h-10 rounded-2xl bg-neutral-200 animate-pulse" />
                <div className="h-10 rounded-2xl bg-neutral-200 animate-pulse" />
                <div className="h-10 rounded-2xl bg-neutral-200 animate-pulse" />
              </div>
            </div>
            <div className="rounded-3xl bg-neutral-50 p-5">
              <div className="h-3 w-32 rounded-full bg-neutral-200 animate-pulse" />
              <div className="mt-4 h-32 rounded-3xl bg-neutral-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
