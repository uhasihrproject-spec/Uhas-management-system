import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = await supabaseServer()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ count: 0, items: [] }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: steps } = await admin
    .from("letter_pipeline_steps")
    .select(`
      id,
      title,
      assigned_at,
      pipeline:letter_pipelines!pipeline_id(
        id,
        letter:letters!letter_id(id, ref_no, subject, file_name)
      )
    `)
    .eq("assigned_user_id", auth.user.id)
    .eq("status", "ACTIVE")
    .order("assigned_at", { ascending: true })
    .limit(5)

  const items = (steps ?? []).map((step: any) => ({
    step_id: step.id,
    title: step.title,
    assigned_at: step.assigned_at,
    letter_id: step.pipeline?.letter?.id ?? null,
    ref_no: step.pipeline?.letter?.ref_no ?? "Tracked item",
    subject: step.pipeline?.letter?.subject ?? null,
    file_name: step.pipeline?.letter?.file_name ?? null,
  }))

  return NextResponse.json({ count: items.length, items })
}
