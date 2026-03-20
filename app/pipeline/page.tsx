import Link from "next/link"
import { redirect } from "next/navigation"
import { supabaseServer } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getLettersWithPipelines } from "@/lib/pipeline/actions"
import { PipelineChainList } from "@/components/pipeline/PipelineChainList"

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

  const { data: users } = await admin
    .from("profiles")
    .select("id, full_name, role, department")
    .order("full_name")

  let rows: Awaited<ReturnType<typeof getLettersWithPipelines>> = []
  try {
    rows = await getLettersWithPipelines()
  } catch {
    rows = []
  }

  const myRows = rows.filter(r => r.steps.some((s: any) => s.status === "ACTIVE" && s.assigned_user_id === profile.id))
  const otherRows = rows.filter(r => !r.steps.some((s: any) => s.status === "ACTIVE" && s.assigned_user_id === profile.id))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="rounded-[28px] bg-white px-5 py-6 ring-1 ring-neutral-200/70 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Track Progress</p>
            <h1 className="mt-2 text-2xl font-semibold text-neutral-900 sm:text-3xl">Simple view of where each file is.</h1>
            <p className="mt-2 text-sm text-neutral-500">See who has a file right now, what comes next, and tap to open full details only when you need them.</p>
          </div>
          {canCreate && (
            <Link href="/pipeline/new" className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700">
              New track progress
            </Link>
          )}
        </div>
      </section>

      <div className="mt-5">
        {rows.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center ring-1 ring-neutral-200/70">
            <p className="text-sm font-medium text-neutral-900">No tracked items yet</p>
            <p className="mt-2 text-sm text-neutral-500">
              {canCreate
                ? "Create a track progress flow to start following a file or letter through each handoff."
                : "There are no files or letters for you in Track Progress right now."}
            </p>
            {canCreate && (
              <Link href="/pipeline/new" className="mt-5 inline-flex items-center rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700">
                Create track progress
              </Link>
            )}
          </div>
        ) : (
          <PipelineChainList
            myRows={myRows as any}
            otherRows={otherRows as any}
            currentUserId={profile.id}
            allUsers={(users ?? []) as any}
            canManage={canCreate}
          />
        )}
      </div>
    </div>
  )
}
