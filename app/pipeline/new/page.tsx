// app/pipeline/new/page.tsx  (server component — data fetching only, no changes needed)

import { redirect }       from "next/navigation"
import { supabaseServer } from "@/lib/supabase/server"
import { supabaseAdmin }  from "@/lib/supabase/admin"
import { NewPipelineForm } from "./NewPipelineForm"

export default async function NewPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ letter?: string }> | { letter?: string }
}) {
  const sp = await Promise.resolve(searchParams)

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
  if (profile.role !== "ADMIN" && profile.role !== "SECRETARY") redirect("/pipeline")

  // Letters without an active pipeline
  const { data: pipelinedIds } = await admin
    .from("letter_pipelines")
    .select("letter_id")
    .neq("status", "CANCELLED")

  const excludeIds = (pipelinedIds ?? []).map((r: any) => r.letter_id).filter(Boolean)

  let lettersQuery = admin
    .from("letters")
    .select("id, ref_no, subject, sender_name, date_received, status, recipient_department")
    .not("status", "eq", "ARCHIVED")
    .order("created_at", { ascending: false })
    .limit(300)

  if (excludeIds.length > 0) {
    lettersQuery = lettersQuery.not("id", "in", `(${excludeIds.join(",")})`)
  }

  const { data: letters } = await lettersQuery

  const { data: users } = await admin
    .from("profiles")
    .select("id, full_name, role, department")
    .order("full_name")

  return (
    <NewPipelineForm
      preselectedLetterId={sp.letter ?? null}
      letters={(letters ?? []) as any[]}
      users={(users ?? []) as any[]}
    />
  )
}