"use server"
// lib/pipeline/actions.ts  (full file — replaces previous version)
// Key changes from v2:
//   - getLettersWithPipelines() now fetches full steps + assigned_user for the chain view
//   - passToNext() is a new dedicated action (wraps completeStep logic, cleans up UX)
//   - markDone()  is a new dedicated action for the final step
//   Both trigger revalidatePath so the Server Component re-renders with fresh data.

import { revalidatePath } from "next/cache"
import { supabaseServer } from "@/lib/supabase/server"
import { supabaseAdmin }  from "@/lib/supabase/admin"
import type {
  Result,
  CreatePipelineInput,
  CompleteStepInput,
  ReassignStepInput,
  Pipeline,
  PipelineStep,
  SlimProfile,
  UserRole,
} from "./types"

// ── Auth ───────────────────────────────────────────────────────────────────

async function getActor() {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const admin = supabaseAdmin()
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, role, department")
    .eq("id", user.id)
    .single()

  if (!profile) throw new Error("Profile not found")
  return profile as SlimProfile & { id: string }
}

function isPrivileged(role: UserRole) {
  return role === "ADMIN" || role === "SECRETARY"
}

async function generateManualRef() {
  const admin = supabaseAdmin()
  const year = new Date().getFullYear()
  const prefix = `UHAS/TRK/FILE/${year}/`

  const { data } = await admin
    .from("letters")
    .select("ref_no")
    .like("ref_no", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(1)

  let next = 1
  const last = data?.[0]?.ref_no as string | undefined
  if (last && last.startsWith(prefix)) {
    const num = Number(last.slice(prefix.length))
    if (Number.isFinite(num) && num > 0) next = num + 1
  }

  return `${prefix}${String(next).padStart(4, "0")}`
}

// ── Letter access check ────────────────────────────────────────────────────

async function assertLetterAccess(letterId: string, actorId: string, actorRole: UserRole) {
  if (isPrivileged(actorRole)) return

  const admin = supabaseAdmin()
  const { data: letter } = await admin
    .from("letters")
    .select("id, confidentiality, recipient_department, created_by")
    .eq("id", letterId)
    .single()

  if (!letter) throw new Error("Letter not found")
  if (letter.created_by === actorId) return
  if (letter.confidentiality === "PUBLIC") return

  if (letter.confidentiality === "INTERNAL") {
    const { data: p } = await admin
      .from("profiles")
      .select("department")
      .eq("id", actorId)
      .single()
    if (p?.department === letter.recipient_department) return
  }

  if (letter.confidentiality === "CONFIDENTIAL") {
    const { data: rec } = await admin
      .from("letter_recipients")
      .select("letter_id")
      .eq("letter_id", letterId)
      .eq("user_id", actorId)
      .maybeSingle()
    if (rec) return
  }

  throw new Error("Access denied")
}

// ── Audit ──────────────────────────────────────────────────────────────────

async function audit(letterId: string, actorId: string, action: string, meta: Record<string, unknown>) {
  const admin = supabaseAdmin()
  await admin.from("audit_logs").insert({ user_id: actorId, action, letter_id: letterId, meta })
}

// ── 1. Create pipeline ─────────────────────────────────────────────────────

export async function createPipeline(
  input: CreatePipelineInput
): Promise<Result<{ pipeline_id: string }>> {
  try {
    const actor = await getActor()
    if (!isPrivileged(actor.role))
      return { ok: false, error: "Only Admins and Secretaries can create a pipeline." }
    if (!input.steps.length)
      return { ok: false, error: "At least one step is required." }

    const admin = supabaseAdmin()

    let letterId = input.letter_id ?? null

    if (!letterId && input.manual_item) {
      const fileName = input.manual_item.file_name.trim()
      if (!fileName) return { ok: false, error: "File name is required." }

      const manualRef = input.manual_item.ref_no?.trim() || await generateManualRef()
      const now = new Date().toISOString()
      const safeRef = manualRef.replace(/[^a-zA-Z0-9-_]+/g, "-")
      const { data: createdLetter, error: createLetterError } = await admin
        .from("letters")
        .insert({
          ref_no: manualRef,
          direction: "INCOMING",
          date_received: now.slice(0, 10),
          sender_name: "Physical file",
          recipient_department: actor.department ?? null,
          subject: input.manual_item.subject?.trim() || fileName,
          summary: "Manual physical file tracked through Track Progress.",
          confidentiality: "PUBLIC",
          status: "ASSIGNED",
          tags: ["track-progress", "manual-file"],
          file_bucket: "letters",
          file_path: `manual/${safeRef}.txt`,
          file_name: fileName,
          mime_type: "text/plain",
          created_by: actor.id,
        })
        .select("id")
        .single()

      if (createLetterError || !createdLetter)
        return { ok: false, error: createLetterError?.message || "Failed to create the file record." }

      letterId = createdLetter.id
    }

    if (!letterId)
      return { ok: false, error: "Select a letter or enter a file name first." }

    await assertLetterAccess(letterId, actor.id, actor.role)

    const { data: existing } = await admin
      .from("letter_pipelines")
      .select("id")
      .eq("letter_id", letterId)
      .neq("status", "CANCELLED")
      .maybeSingle()

    if (existing)
      return { ok: false, error: "A pipeline already exists for this letter." }

    const { data: pipeline, error: pErr } = await admin
      .from("letter_pipelines")
      .insert({
        letter_id:          letterId,
        status:             "IN_PROGRESS",
        current_step_order: 1,
        created_by:         actor.id,
        started_at:         new Date().toISOString(),
      })
      .select("id")
      .single()

    if (pErr || !pipeline)
      return { ok: false, error: "Failed to create pipeline." }

    const now = new Date().toISOString()
    const stepsToInsert = input.steps.map((s, i) => ({
      pipeline_id:         pipeline.id,
      step_order:          s.step_order,
      title:               s.title,
      action_note:         s.action_note ?? null,
      assigned_user_id:    s.assigned_user_id,
      assigned_department: s.assigned_department ?? null,
      status:              i === 0 ? "ACTIVE" : "PENDING",
      assigned_at:         i === 0 ? now : null,
    }))

    const { error: sErr } = await admin.from("letter_pipeline_steps").insert(stepsToInsert)
    if (sErr) {
      await admin.from("letter_pipelines").delete().eq("id", pipeline.id)
      return { ok: false, error: "Failed to create steps." }
    }

    await admin
      .from("letters")
      .update({ status: "ASSIGNED", updated_at: now })
      .eq("id", letterId)

    await audit(letterId, actor.id, "PIPELINE_CREATED", {
      pipeline_id: pipeline.id,
      step_count:  input.steps.length,
    })

    revalidatePath("/pipeline")
    return { ok: true, data: { pipeline_id: pipeline.id } }
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Unknown error" }
  }
}

// ── 2. Load pipeline for a letter ─────────────────────────────────────────

export async function getPipeline(letterId: string): Promise<Pipeline | null> {
  const actor = await getActor()
  await assertLetterAccess(letterId, actor.id, actor.role)

  const admin = supabaseAdmin()

  const { data: pipeline } = await admin
    .from("letter_pipelines")
    .select(`*, created_by_user:profiles!created_by(id,full_name,role,department)`)
    .eq("letter_id", letterId)
    .neq("status", "CANCELLED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!pipeline) return null

  const { data: steps } = await admin
    .from("letter_pipeline_steps")
    .select(`
      *,
      assigned_user:profiles!assigned_user_id(id,full_name,role,department),
      completed_by_user:profiles!completed_by(id,full_name,role,department)
    `)
    .eq("pipeline_id", pipeline.id)
    .order("step_order", { ascending: true })

  return { ...pipeline, steps: (steps ?? []) as PipelineStep[] } as Pipeline
}

// ── 3. Pass to next user ("Pass to Next" button) ──────────────────────────
// This is the primary action on the pipeline page for mid-chain steps.

export async function passToNext(
  input: CompleteStepInput
): Promise<Result<{ next_user_name: string | null }>> {
  try {
    const actor = await getActor()
    const admin = supabaseAdmin()

    const { data: step } = await admin
      .from("letter_pipeline_steps")
      .select(`*, pipeline:letter_pipelines!pipeline_id(id, letter_id, status)`)
      .eq("id", input.step_id)
      .eq("pipeline_id", input.pipeline_id)
      .single()

    if (!step)                   return { ok: false, error: "Step not found." }
    if (step.status !== "ACTIVE") return { ok: false, error: "This step is not active." }

    const pipeline = step.pipeline as any
    if (pipeline.status !== "IN_PROGRESS")
      return { ok: false, error: "Pipeline is not in progress." }

    // KEY RULE: only the assigned user (or admin/secretary) can act
    if (step.assigned_user_id !== actor.id && !isPrivileged(actor.role))
      return { ok: false, error: "You are not assigned to this step." }

    await assertLetterAccess(pipeline.letter_id, actor.id, actor.role)

    const { data: allSteps } = await admin
      .from("letter_pipeline_steps")
      .select("id, step_order, status, assigned_user_id")
      .eq("pipeline_id", input.pipeline_id)
      .order("step_order", { ascending: true })

    const nextStep = (allSteps ?? []).find(
      s => s.step_order > step.step_order && s.status === "PENDING"
    ) ?? null

    // Prevent "Pass to Next" on the final step — use markDone instead
    if (!nextStep)
      return { ok: false, error: "This is the final step. Use Mark as Done instead." }

    const now = new Date().toISOString()

    await admin
      .from("letter_pipeline_steps")
      .update({ status: "DONE", completed_at: now, completed_by: actor.id, remarks: input.remarks ?? null, updated_at: now })
      .eq("id", input.step_id)

    await admin
      .from("letter_pipeline_steps")
      .update({ status: "ACTIVE", assigned_at: now, updated_at: now })
      .eq("id", nextStep.id)

    await admin
      .from("letter_pipelines")
      .update({ current_step_order: nextStep.step_order, updated_at: now })
      .eq("id", input.pipeline_id)

    // Fetch next user name to show in the popup
    let nextUserName: string | null = null
    if (nextStep.assigned_user_id) {
      const { data: nextUser } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", nextStep.assigned_user_id)
        .single()
      nextUserName = nextUser?.full_name ?? null
    }

    await audit(pipeline.letter_id, actor.id, "PIPELINE_STEP_COMPLETED", {
      pipeline_id: input.pipeline_id,
      step_id:     input.step_id,
      step_order:  step.step_order,
      step_title:  step.title,
      from_user_id: step.assigned_user_id,
      to_user_id:  nextStep.assigned_user_id,
      remarks:     input.remarks ?? null,
    })

    await audit(pipeline.letter_id, actor.id, "PIPELINE_STEP_ACTIVATED", {
      pipeline_id: input.pipeline_id,
      step_id:     nextStep.id,
      step_order:  nextStep.step_order,
      to_user_id:  nextStep.assigned_user_id,
    })

    revalidatePath("/pipeline")
    return { ok: true, data: { next_user_name: nextUserName } }
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Unknown error" }
  }
}

// ── 4. Mark as Done (final step only) ─────────────────────────────────────

export async function markDone(
  input: CompleteStepInput
): Promise<Result<undefined>> {
  try {
    const actor = await getActor()
    const admin = supabaseAdmin()

    const { data: step } = await admin
      .from("letter_pipeline_steps")
      .select(`*, pipeline:letter_pipelines!pipeline_id(id, letter_id, status)`)
      .eq("id", input.step_id)
      .eq("pipeline_id", input.pipeline_id)
      .single()

    if (!step)                    return { ok: false, error: "Step not found." }
    if (step.status !== "ACTIVE") return { ok: false, error: "This step is not active." }

    const pipeline = step.pipeline as any
    if (pipeline.status !== "IN_PROGRESS")
      return { ok: false, error: "Pipeline is not in progress." }

    if (step.assigned_user_id !== actor.id && !isPrivileged(actor.role))
      return { ok: false, error: "You are not assigned to this step." }

    await assertLetterAccess(pipeline.letter_id, actor.id, actor.role)

    // Confirm it actually is the last step
    const { data: allSteps } = await admin
      .from("letter_pipeline_steps")
      .select("id, step_order, status")
      .eq("pipeline_id", input.pipeline_id)
      .order("step_order", { ascending: true })

    const hasNext = (allSteps ?? []).some(
      s => s.step_order > step.step_order && s.status === "PENDING"
    )
    if (hasNext)
      return { ok: false, error: "There are steps after this one. Use Pass to Next instead." }

    const now = new Date().toISOString()

    await admin
      .from("letter_pipeline_steps")
      .update({ status: "DONE", completed_at: now, completed_by: actor.id, remarks: input.remarks ?? null, updated_at: now })
      .eq("id", input.step_id)

    await admin
      .from("letter_pipelines")
      .update({ status: "COMPLETED", completed_at: now, updated_at: now })
      .eq("id", input.pipeline_id)

    await admin
      .from("letters")
      .update({ status: "COMPLETED", updated_at: now })
      .eq("id", pipeline.letter_id)

    await audit(pipeline.letter_id, actor.id, "PIPELINE_STEP_COMPLETED", {
      pipeline_id: input.pipeline_id, step_id: input.step_id,
      step_order: step.step_order, step_title: step.title,
      from_user_id: step.assigned_user_id, remarks: input.remarks ?? null,
    })
    await audit(pipeline.letter_id, actor.id, "PIPELINE_COMPLETED", { pipeline_id: input.pipeline_id })

    revalidatePath("/pipeline")
    return { ok: true, data: undefined }
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Unknown error" }
  }
}

// ── 5. Reassign a step ─────────────────────────────────────────────────────

export async function reassignStep(
  input: ReassignStepInput
): Promise<Result<undefined>> {
  try {
    const actor = await getActor()
    if (!isPrivileged(actor.role))
      return { ok: false, error: "Only Admins and Secretaries can reassign steps." }

    const admin = supabaseAdmin()

    const { data: step } = await admin
      .from("letter_pipeline_steps")
      .select(`*, pipeline:letter_pipelines!pipeline_id(letter_id)`)
      .eq("id", input.step_id)
      .eq("pipeline_id", input.pipeline_id)
      .single()

    if (!step)                  return { ok: false, error: "Step not found." }
    if (step.status === "DONE") return { ok: false, error: "Cannot reassign a completed step." }

    const letterId = (step.pipeline as any)?.letter_id
    const now = new Date().toISOString()

    const { data: newUser } = await admin.from("profiles").select("id").eq("id", input.new_user_id).single()
    if (!newUser) return { ok: false, error: "User not found." }

    await admin
      .from("letter_pipeline_steps")
      .update({
        assigned_user_id: input.new_user_id,
        assigned_at:      step.status === "ACTIVE" ? now : step.assigned_at,
        updated_at:       now,
      })
      .eq("id", input.step_id)

    await audit(letterId, actor.id, "PIPELINE_STEP_REASSIGNED", {
      pipeline_id: input.pipeline_id, step_id: input.step_id,
      step_order: step.step_order, step_title: step.title,
      from_user_id: step.assigned_user_id, to_user_id: input.new_user_id,
      note: input.note ?? null,
    })

    revalidatePath("/pipeline")
    return { ok: true, data: undefined }
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Unknown error" }
  }
}

// ── 6. Cancel pipeline ─────────────────────────────────────────────────────

export async function cancelPipeline(pipelineId: string): Promise<Result<undefined>> {
  try {
    const actor = await getActor()
    if (!isPrivileged(actor.role))
      return { ok: false, error: "Only Admins and Secretaries can cancel a pipeline." }

    const admin = supabaseAdmin()
    const { data: pipeline } = await admin
      .from("letter_pipelines")
      .select("id, letter_id, status")
      .eq("id", pipelineId)
      .single()

    if (!pipeline)                       return { ok: false, error: "Pipeline not found." }
    if (pipeline.status === "COMPLETED") return { ok: false, error: "Cannot cancel a completed pipeline." }

    const now = new Date().toISOString()
    await admin.from("letter_pipelines").update({ status: "CANCELLED", updated_at: now }).eq("id", pipelineId)
    await admin.from("letters").update({ status: "ASSIGNED", updated_at: now }).eq("id", pipeline.letter_id)
    await audit(pipeline.letter_id, actor.id, "PIPELINE_CANCELLED", { pipeline_id: pipelineId })

    revalidatePath("/pipeline")
    return { ok: true, data: undefined }
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Unknown error" }
  }
}

// ── 7. Audit log ───────────────────────────────────────────────────────────

export async function getPipelineAuditLog(letterId: string) {
  const actor = await getActor()
  await assertLetterAccess(letterId, actor.id, actor.role)

  const admin = supabaseAdmin()
  const { data } = await admin
    .from("audit_logs")
    .select(`id, action, meta, created_st, actor:profiles!user_id(id, full_name, role)`)
    .eq("letter_id", letterId)
    .in("action", [
      "PIPELINE_CREATED", "PIPELINE_STEP_ACTIVATED", "PIPELINE_STEP_COMPLETED",
      "PIPELINE_STEP_REASSIGNED", "PIPELINE_COMPLETED", "PIPELINE_CANCELLED",
    ])
    .order("created_st", { ascending: false })
    .limit(60)

  return data ?? []
}

// ── 8. List for pipeline page — includes full step chain ──────────────────
// KEY RULE ENFORCED:
//   ADMIN/SECRETARY: see all pipelines
//   STAFF: see all non-cancelled pipelines they are allowed to access

export async function getLettersWithPipelines() {
  const actor = await getActor()
  const admin = supabaseAdmin()

  let pipelineRows: any[] = []

  if (isPrivileged(actor.role)) {
    // ADMIN / SECRETARY: all non-cancelled pipelines
    const { data } = await admin
      .from("letter_pipelines")
      .select(`
        id, status, current_step_order, started_at, completed_at,
        letter:letters!letter_id(
          id, ref_no, subject, sender_name, date_received,
          status, confidentiality, recipient_department, file_name
        )
      `)
      .neq("status", "CANCELLED")
      .order("started_at", { ascending: false })
      .limit(200)

    pipelineRows = (data ?? []).map((row: any) => ({
      pipeline_id:         row.id,
      pipeline_status:     row.status,
      current_step_order:  row.current_step_order,
      started_at:          row.started_at,
      completed_at:        row.completed_at,
      letter:              row.letter,
    }))
  } else {
    // STAFF: all non-cancelled pipelines they are allowed to access
    const { data } = await admin
      .from("letter_pipelines")
      .select(`
        id, status, current_step_order, started_at, completed_at,
        letter:letters!letter_id(
          id, ref_no, subject, sender_name, date_received,
          status, confidentiality, recipient_department, file_name, created_by
        )
      `)
      .neq("status", "CANCELLED")
      .order("started_at", { ascending: false })
      .limit(200)

    for (const row of data ?? []) {
      const letter = row.letter as any
      if (!letter) continue

      let allowed = false
      if (letter.created_by === actor.id) allowed = true
      if (letter.confidentiality === "PUBLIC") allowed = true
      if (letter.confidentiality === "INTERNAL" && actor.department === letter.recipient_department) allowed = true
      if (letter.confidentiality === "CONFIDENTIAL") {
        const { data: rec } = await admin
          .from("letter_recipients")
          .select("letter_id")
          .eq("letter_id", letter.id)
          .eq("user_id", actor.id)
          .maybeSingle()
        if (rec) allowed = true
      }

      if (!allowed) continue

      pipelineRows.push({
        pipeline_id:        row.id,
        pipeline_status:    row.status,
        current_step_order: row.current_step_order,
        started_at:         row.started_at,
        completed_at:       row.completed_at,
        letter,
      })
    }
  }

  if (pipelineRows.length === 0) return []

  // Fetch full step chains for all pipeline IDs in one query
  const pipelineIds = pipelineRows.map(r => r.pipeline_id)
  const { data: allSteps } = await admin
    .from("letter_pipeline_steps")
    .select(`
      id, pipeline_id, step_order, title, status,
      assigned_user_id, assigned_at, completed_at,
      assigned_user:profiles!assigned_user_id(id, full_name, department)
    `)
    .in("pipeline_id", pipelineIds)
    .order("step_order", { ascending: true })

  // Group steps by pipeline_id
  const stepsByPipeline = new Map<string, any[]>()
  for (const step of allSteps ?? []) {
    const arr = stepsByPipeline.get(step.pipeline_id) ?? []
    arr.push(step)
    stepsByPipeline.set(step.pipeline_id, arr)
  }

  return pipelineRows.map(row => ({
    ...row,
    steps: stepsByPipeline.get(row.pipeline_id) ?? [],
  }))
}