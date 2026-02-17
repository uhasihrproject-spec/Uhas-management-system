export default function LettersLoading() {
  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="animate-pulse">
          <div className="h-3 w-48 bg-neutral-200 rounded-full" />
          <div className="mt-3 h-8 w-56 bg-neutral-200 rounded-2xl" />
          <div className="mt-3 h-4 w-80 bg-neutral-200 rounded-full" />

          <div className="mt-7 rounded-3xl bg-white ring-1 ring-neutral-200/70 overflow-hidden">
            <div className="p-5 border-b border-neutral-200/70">
              <div className="h-10 w-full max-w-130 bg-neutral-200 rounded-2xl" />
              <div className="mt-3 flex gap-2">
                <div className="h-9 w-44 bg-neutral-200 rounded-2xl" />
                <div className="h-9 w-44 bg-neutral-200 rounded-2xl" />
                <div className="h-9 w-44 bg-neutral-200 rounded-2xl" />
              </div>
            </div>

            <div className="p-5 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 bg-neutral-200 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
