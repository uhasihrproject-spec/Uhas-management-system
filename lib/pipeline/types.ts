// lib/pipeline/types.ts

export type PipelineStatus   = "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
export type StepStatus       = "PENDING" | "ACTIVE" | "DONE" | "SKIPPED"
export type UserRole         = "ADMIN" | "SECRETARY" | "STAFF"
export type Confidentiality  = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL"

// ── DB row shapes (exact column names) ────────────────────────────────────

export interface DbPipeline {
  id:                 string
  letter_id:          string
  status:             PipelineStatus
  current_step_order: number
  created_by:         string
  started_at:         string
  completed_at:       string | null
  created_at:         string
  updated_at:         string
}

export interface DbStep {
  id:                  string
  pipeline_id:         string
  step_order:          number
  title:               string
  action_note:         string | null
  assigned_user_id:    string | null
  assigned_department: string | null
  status:              StepStatus
  assigned_at:         string | null
  completed_at:        string | null
  completed_by:        string | null
  remarks:             string | null
  created_at:          string
  updated_at:          string
}

// ── Enriched shapes (with joined profiles) ────────────────────────────────

export interface SlimProfile {
  id:         string
  full_name:  string
  role:       UserRole
  department: string | null
}

export interface PipelineStep extends DbStep {
  assigned_user:    SlimProfile | null
  completed_by_user: SlimProfile | null
}

export interface Pipeline extends DbPipeline {
  steps:           PipelineStep[]
  created_by_user: SlimProfile | null
}

// ── Letter shape used in pipeline page ────────────────────────────────────

export interface LetterSummary {
  id:                   string
  ref_no:               string
  subject:              string
  sender_name:          string
  date_received:        string
  status:               string
  confidentiality:      Confidentiality
  recipient_department: string | null
  file_name?:           string | null
}

// ── Server action inputs ───────────────────────────────────────────────────

export interface CreatePipelineInput {
  letter_id: string
  steps: {
    step_order:          number
    title:               string
    action_note?:        string
    assigned_user_id:    string
    assigned_department?: string
  }[]
}

export interface CompleteStepInput {
  pipeline_id: string
  step_id:     string
  remarks?:    string
}

export interface ReassignStepInput {
  pipeline_id:  string
  step_id:      string
  new_user_id:  string
  note?:        string
}

// ── Server action result wrapper ───────────────────────────────────────────

export type Result<T = undefined> =
  | { ok: true;  data: T }
  | { ok: false; error: string }