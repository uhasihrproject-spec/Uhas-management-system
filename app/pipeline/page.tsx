// app/pipeline/page.tsx
// The main pipeline page. Shows each letter as a horizontal handler chain.
// Current holder is highlighted. Actions (Pass / Mark Done) appear inline.
// Server Component — data is fetched server-side, no loading state needed.

import Link              from "next/link"
import { redirect }      from "next/navigation"
import { supabaseServer } from "@/lib/supabase/server"
import { supabaseAdmin }  from "@/lib/supabase/admin"
import { getLettersWithPipelines } from "@/lib/pipeline/actions"
import { PipelineChainList }       from "@/components/pipeline/PipelineChainList"

export default async function PipelinePage() {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = supabaseAdmin()
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, role, department")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  const canCreate = profile.role === "ADMIN" || profile.role === "SECRETARY"

  let rows: Awaited<ReturnType<typeof getLettersWithPipelines>> = []
  try {
    rows = await getLettersWithPipelines()
  } catch {
    // render empty
  }

  // Split: my active steps vs everything else
  const myRows    = rows.filter(r => r.steps.some((s: any) => s.status === "ACTIVE" && s.assigned_user_id === profile.id))
  const otherRows = rows.filter(r => !r.steps.some((s: any) => s.status === "ACTIVE" && s.assigned_user_id === profile.id))

  return (
    <div className="w-full min-w-0">
      {/* Header */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
              UHAS Procurement Directorate
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold">Track Progress</h1>
            <p className="mt-2 text-sm text-neutral-800">
              Search and follow where each file or letter is right now, who handled it, and what comes next.
            </p>
          </div>
          {canCreate && (
            <Link
              href="/pipeline/new"
              className="inline-flex items-center rounded-2xl px-4 py-2.5 text-sm text-white
                btn-brand bg-neutral-900 hover:bg-neutral-700 transition-colors"
            >
              + New track progress
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pb-10 space-y-8">
        {rows.length === 0 ? (
          <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 p-12 text-center">
            <p className="text-sm font-medium text-neutral-900">No tracked items yet</p>
            <p className="mt-1 text-sm text-neutral-400">
              {canCreate
                ? "Create a track progress workflow to start following a file or letter through each handoff."
                : "You have no files or letters currently assigned to you in track progress."}
            </p>
            {canCreate && (
              <Link
                href="/pipeline/new"
                className="mt-5 inline-flex items-center rounded-2xl bg-neutral-900 px-5 py-2.5
                  text-sm text-white hover:bg-neutral-700 transition-colors"
              >
                Create track progress
              </Link>
            )}
          </div>
        ) : (
          <PipelineChainList
            myRows={myRows as any}
            otherRows={otherRows as any}
            currentUserId={profile.id}
          />
        )}
      </div>
    </div>
  )
}