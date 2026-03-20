// app/pipeline/[letterId]/page.tsx  (server component — data fetching only)

import { notFound, redirect }                  from "next/navigation"
import { supabaseServer }                      from "@/lib/supabase/server"
import { supabaseAdmin }                       from "@/lib/supabase/admin"
import { getPipeline, getPipelineAuditLog }    from "@/lib/pipeline/actions"
import { PipelineDetailView }                  from "@/components/pipeline/PipelineDetailView"
import type { SlimProfile }                    from "@/lib/pipeline/types"

export default async function PipelineDetailPage({
  params,
}: {
  params: Promise<{ letterId: string }> | { letterId: string }
}) {
  const { letterId } = await Promise.resolve(params)

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

  const canWrite = profile.role === "ADMIN" || profile.role === "SECRETARY"

  const { data: letter } = await admin
    .from("letters")
    .select("id, ref_no, subject, sender_name, date_received, status, confidentiality, recipient_department, created_by")
    .eq("id", letterId)
    .single()

  if (!letter) notFound()

  // Access check for STAFF
  if (!canWrite) {
    let allowed = false
    if (letter.created_by === user.id)        allowed = true
    if (letter.confidentiality === "PUBLIC")  allowed = true
    if (letter.confidentiality === "INTERNAL" && profile.department === letter.recipient_department) allowed = true
    if (letter.confidentiality === "CONFIDENTIAL") {
      const { data: rec } = await admin
        .from("letter_recipients")
        .select("letter_id")
        .eq("letter_id", letterId)
        .eq("user_id", user.id)
        .maybeSingle()
      if (rec) allowed = true
    }
    if (!allowed) notFound()
  }

  let pipeline = null
  let auditLog: any[] = []
  try {
    pipeline = await getPipeline(letterId)
    auditLog  = await getPipelineAuditLog(letterId)
  } catch { /* render without pipeline */ }

  let allUsers: SlimProfile[] = []
  if (canWrite) {
    const { data: users } = await admin
      .from("profiles")
      .select("id, full_name, role, department")
      .order("full_name")
    allUsers = (users ?? []) as SlimProfile[]
  }

  return (
    <PipelineDetailView
      pipeline={pipeline}
      letter={{
        id:                   letter.id,
        ref_no:               letter.ref_no,
        subject:              letter.subject,
        sender_name:          letter.sender_name,
        date_received:        letter.date_received,
        status:               letter.status,
        confidentiality:      letter.confidentiality,
        recipient_department: letter.recipient_department,
      }}
      currentUser={{
        id:         profile.id,
        full_name:  profile.full_name,
        role:       profile.role as any,
        department: profile.department,
      }}
      auditLog={auditLog}
      allUsers={allUsers}
    />
  )
}