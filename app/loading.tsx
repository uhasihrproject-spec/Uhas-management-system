export default function Loading() {
  return (
    <div className="min-h-screen bg-linear-to-b from-white to-emerald-50/30 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-4xl bg-white ring-1 ring-neutral-200/70 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-linear-to-br from-emerald-600 to-amber-500 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
            </div>

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                UHAS Procurement Directorate
              </p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">
                Loading Registry…
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 animate-pulse">
            <div className="h-3 w-2/3 rounded-full bg-neutral-200" />
            <div className="h-3 w-5/6 rounded-full bg-neutral-200" />
            <div className="h-3 w-1/2 rounded-full bg-neutral-200" />
            <div className="mt-4 h-10 rounded-2xl bg-neutral-200" />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-500">
          Please wait… fetching the latest records.
        </p>
      </div>
    </div>
  );
}
