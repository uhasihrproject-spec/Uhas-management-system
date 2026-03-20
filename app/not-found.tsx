import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_35%),linear-gradient(180deg,#fafaf9_0%,#ffffff_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-neutral-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-2xl font-semibold text-emerald-700">404</div>
          <h1 className="mt-6 text-3xl font-semibold text-neutral-900">Page not found</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-500">
            The page you are looking for does not exist, may have moved, or you may not have permission to open it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700">Go to dashboard</Link>
            <Link href="/pipeline" className="rounded-2xl border border-neutral-200 px-5 py-3 text-sm text-neutral-600 transition hover:bg-neutral-50">Open Track Progress</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
