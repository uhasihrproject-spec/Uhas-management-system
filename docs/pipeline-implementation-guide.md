# Pipeline Page Implementation Guide

This guide explains **how the Pipeline page should work**, **which files are involved**, **what data it needs**, and **how a new developer can build or rebuild it correctly**.

---

## 1. Goal of the Pipeline page

The Pipeline page is the workflow control center for letters.

Instead of only showing a flat table of letters, this page should help users answer:

- Which letters are currently moving through workflow?
- Who is handling each letter right now?
- What step is complete?
- What step is next?
- Which letters are blocked, overdue, or done?
- What actions can the current user take quickly?

The page should feel similar to a lightweight Linear / Notion / Stripe operations board:

- clean
- fast
- minimal
- role-aware
- action-oriented

---

## 2. Core workflow model

The Pipeline page depends on a dedicated workflow record per step.

### Recommended table

Create a Supabase/Postgres table called `letter_workflow_steps`.

Suggested columns:

- `id uuid primary key`
- `letter_id uuid not null`
- `user_id uuid not null`
- `assigned_by uuid null`
- `step_order integer not null`
- `status text not null` — values like `PENDING`, `IN_PROGRESS`, `COMPLETED`, `DONE`
- `notes text null`
- `created_at timestamptz default now()`
- `updated_at timestamptz null`
- `completed_at timestamptz null`

### Recommended constraints

- foreign key `letter_id -> letters.id`
- foreign key `user_id -> profiles.id`
- foreign key `assigned_by -> profiles.id`
- unique constraint on `(letter_id, step_order)`

### Why this table matters

Without this table, the Pipeline page becomes guesswork.

This table gives you:

- ordered handoff history
- current assignee
- next assignee
- completion history
- audit-friendly workflow tracking

The app already reads from this model in the workflow helper layer. See `lib/workflow.ts`.【F:lib/workflow.ts†L3-L107】

---

## 3. High-level user flow

### When a secretary/admin creates a letter

1. Open `New Letter`
2. Fill letter data
3. Choose a letter type/category
4. Pick the **first handler**
5. Submit form
6. API creates the letter record
7. API creates workflow step 1 in `letter_workflow_steps`

This first-handler flow is already wired in the form and create API. See `app/letters/new/NewLetterForm.tsx` and `app/api/letters/create/route.ts`.【F:app/letters/new/NewLetterForm.tsx†L246-L310】【F:app/api/letters/create/route.ts†L96-L167】

### When a staff member opens Pipeline

They should only see letters where they are part of the workflow.

### When the current handler works on a letter

They can:

- mark it `IN_PROGRESS`
- mark it `DONE`
- optionally leave notes

### When admin/secretary needs to pass it forward

They can:

- finish the current step
- create the next step
- assign the next handler
- record timestamp and notes

That behavior is currently handled by `app/api/workflow/status/route.ts` and `app/api/workflow/pass/route.ts`.【F:app/api/workflow/status/route.ts†L1-L42】【F:app/api/workflow/pass/route.ts†L1-L50】

---

## 4. Files involved in the Pipeline feature

If someone new wants to work on the feature, these are the main files to understand.

### Data / server helpers

- `lib/workflow.ts`
  - fetch workflow steps
  - compute current step
  - compute next step
  - detect active user IDs
  - detect whether the workflow table exists【F:lib/workflow.ts†L45-L107】

- `lib/letters/access.ts`
  - ensures `STAFF` can only access letters assigned in workflow【F:lib/letters/access.ts†L17-L38】

### Workflow APIs

- `app/api/workflow/list/route.ts`
  - returns workflow for a letter【F:app/api/workflow/list/route.ts†L1-L20】
- `app/api/workflow/status/route.ts`
  - updates current step to `IN_PROGRESS` or `DONE`【F:app/api/workflow/status/route.ts†L1-L42】
- `app/api/workflow/pass/route.ts`
  - completes current step and inserts next step【F:app/api/workflow/pass/route.ts†L1-L50】

### UI components

- `components/workflow/WorkflowTimeline.tsx`
  - renders the timeline/progress tracker for one letter【F:components/workflow/WorkflowTimeline.tsx†L15-L80】
- `components/workflow/WorkflowActions.tsx`
  - shows action buttons for eligible users【F:components/workflow/WorkflowActions.tsx†L7-L57】

### Pages

- `app/pipeline/page.tsx`
  - current Pipeline page entry point【F:app/pipeline/page.tsx†L9-L61】
- `app/letters/[id]/page.tsx`
  - embeds timeline and actions inside letter details【F:app/letters/[id]/page.tsx†L269-L319】
- `app/dashboard/page.tsx`
  - surfaces workflow-driven personal tasks【F:app/dashboard/page.tsx†L21-L64】

### Navigation

- `components/shell/AppShell.tsx`
- `components/shell/MobileNav.tsx`

These add the Pipeline link to both desktop and mobile navigation. 【F:components/shell/AppShell.tsx†L50-L57】【F:components/shell/MobileNav.tsx†L25-L32】

---

## 5. How the current Pipeline page works

The current page:

1. checks authentication
2. loads the current user profile
3. decides whether the user is `ADMIN`/`SECRETARY` or `STAFF`
4. loads recent letters
5. loads workflow summary for each letter
6. filters what the user is allowed to see
7. renders workflow cards in a grid

See the existing implementation in `app/pipeline/page.tsx`.【F:app/pipeline/page.tsx†L9-L61】

### Current visibility logic

- `ADMIN` and `SECRETARY` can see all pipeline cards
- `STAFF` can only see letters where they appear in workflow steps

That filtering happens in the page and access layer. 【F:app/pipeline/page.tsx†L25-L32】【F:lib/letters/access.ts†L28-L37】

---

## 6. How to build the Pipeline page properly from scratch

If rebuilding the page fully, follow this order.

### Step 1: Create the workflow table

Do this in Supabase SQL editor or migrations.

Example shape:

```sql
create table public.letter_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid null references public.profiles(id) on delete set null,
  step_order integer not null,
  status text not null check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DONE')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  completed_at timestamptz null,
  unique (letter_id, step_order)
);
```

### Step 2: Add RLS policies

At minimum:

- admins/secretaries can read/write all workflow rows
- staff can read rows for letters assigned to them
- staff can only update the row where `user_id = auth.uid()` if they are the current handler

If backend routes already use service role for writes, still keep RLS sane for browser reads.

### Step 3: Build the helper layer

Create a helper like `lib/workflow.ts` that:

- lists ordered steps for one letter
- flattens joined profile data
- computes current step
- computes next step
- exposes `activeUserIds`
- handles missing table gracefully for partial deployments

That helper is already implemented here. 【F:lib/workflow.ts†L45-L107】

### Step 4: Add create-letter workflow bootstrap

Update create flow so it accepts a first handler and inserts the first workflow row.

Relevant files:

- `app/letters/new/NewLetterForm.tsx`【F:app/letters/new/NewLetterForm.tsx†L275-L310】
- `app/api/letters/create/route.ts`【F:app/api/letters/create/route.ts†L117-L167】

### Step 5: Add workflow mutation APIs

You need 3 routes:

1. list workflow
2. change current step status
3. pass to next handler

Those files now exist under `app/api/workflow/`. 【F:app/api/workflow/list/route.ts†L1-L20】【F:app/api/workflow/status/route.ts†L1-L42】【F:app/api/workflow/pass/route.ts†L1-L50】

### Step 6: Build timeline component

Create a reusable component that accepts a workflow summary and renders:

- all handlers
- current step
- next step
- assigned time
- completed time
- status color

That is what `components/workflow/WorkflowTimeline.tsx` does. 【F:components/workflow/WorkflowTimeline.tsx†L32-L80】

### Step 7: Build action component

Create a client component for per-letter actions.

It should:

- show only if user is allowed
- let assigned handler mark progress
- let admin/secretary pass the letter
- refresh the page after mutations

Current implementation: `components/workflow/WorkflowActions.tsx`. 【F:components/workflow/WorkflowActions.tsx†L14-L57】

### Step 8: Build the Pipeline page

The page should load cards with:

- reference number
- subject
- current status
- current handler
- mini timeline preview
- quick link to open full letter

Current file: `app/pipeline/page.tsx`. 【F:app/pipeline/page.tsx†L34-L60】

### Step 9: Add navigation

Add a nav item called `Pipeline` to:

- desktop sidebar
- mobile drawer

Files:

- `components/shell/AppShell.tsx`【F:components/shell/AppShell.tsx†L50-L57】
- `components/shell/MobileNav.tsx`【F:components/shell/MobileNav.tsx†L25-L32】

### Step 10: Reuse timeline on letter details

The Pipeline page should not be the only workflow view.

Every letter details page should also show:

- timeline
- current step
- next step
- action controls

This is already embedded in `app/letters/[id]/page.tsx`. 【F:app/letters/[id]/page.tsx†L307-L319】

---

## 7. Recommended UI structure for the Pipeline page

For a new developer, here is the recommended page layout.

### Header section

Show:

- title: `Pipeline`
- short explanation
- buttons: `Open letters`, maybe `My tasks`

### Filter bar

Add filters for:

- workflow status
- assigned user
- overdue only
- completed only
- search by ref number / subject

Note: the current page supports query params in concept (`status`, `assigned`, `letter`) but does not yet render a full filter bar UI. The file already accepts these params, so this is the next improvement area. 【F:app/pipeline/page.tsx†L7-L10】【F:app/pipeline/page.tsx†L26-L32】

### Main board layout

You can build either:

#### Option A: Card grid

Good for simpler implementation.

Each card shows one letter and a compact timeline.

#### Option B: True kanban board

Columns:

- Pending
- In Progress
- Waiting / Handoff
- Done

To do this:

- group cards by `workflow.currentStep.status`
- render 4 columns
- place each card under the matching column

This would be a stronger version of the current grid implementation.

---

## 8. Quick actions the Pipeline page should support

For a full implementation, each card should eventually support:

- `Open` → go to letter details
- `Mark in progress`
- `Mark done`
- `Pass forward`
- `View timeline`

Right now, the most complete interaction already exists on the letter details page through `WorkflowActions`. A future enhancement is to reuse that client component inside Pipeline cards or a slide-over modal. 【F:components/workflow/WorkflowActions.tsx†L32-L57】【F:app/letters/[id]/page.tsx†L307-L319】

---

## 9. Role behavior on the Pipeline page

### Admin

Should be able to:

- see all letters
- see all workflow steps
- pass any letter
- mark steps done/in progress
- troubleshoot bottlenecks

### Secretary

Should be able to:

- see all letters
- create workflow
- pass letters between handlers
- monitor progress

### Staff

Should only be able to:

- see letters assigned to them in workflow
- update their own current step
- mark their step done
- view history read-only

This principle is enforced in access and action logic. 【F:lib/letters/access.ts†L28-L37】【F:components/workflow/WorkflowActions.tsx†L14-L17】

---

## 10. Validation and backend protection checklist

A new developer should not stop at UI.

Make sure the backend also enforces rules.

### Required checks

- block `STAFF` from creating letters【F:app/api/letters/create/route.ts†L35-L37】
- block `STAFF` from generating new refs【F:app/api/letters/next-ref/route.ts†L14-L17】
- block `STAFF` from upload route【F:app/api/letters/upload/route.ts†L12-L15】
- block non-assigned users from workflow updates【F:app/api/workflow/status/route.ts†L19-L30】
- block non-admin/secretary users from passing letters【F:app/api/workflow/pass/route.ts†L19-L24】

---

## 11. Suggested future improvements for the Pipeline page

If you want the page to feel complete and premium, these are the best next steps.

### A. Replace user ID input with searchable assignee picker

Current `WorkflowActions` asks for a raw user ID for passing forward. That works technically, but the UX is weak.

Better approach:

- open modal
- search users by name/department
- select one user
- submit user ID in background

### B. Add overdue highlighting

Use `created_at` of the current step to mark cards:

- amber: 24+ hours
- red: 48+ hours

### C. Add notifications

When a step is assigned or passed:

- insert a notification row
- show unread count in navbar
- optionally send email later

### D. Add activity log on each card

Include latest entries like:

- assigned by X
- marked done by Y
- passed to Z

### E. Make it a true kanban view

This is the best fit for the original request.

Implementation idea:

- create `const grouped = { PENDING: [], IN_PROGRESS: [], DONE: [] }`
- push each pipeline card into a bucket
- render one column per bucket

### F. Add optimistic UI

For faster feel:

- update card status instantly on click
- revalidate in background

---

## 12. Minimum file checklist for a new contributor

If someone asks, “what exactly do I need to touch?”, here is the short answer.

### Must-have files

- `lib/workflow.ts`
- `lib/letters/access.ts`
- `app/api/workflow/list/route.ts`
- `app/api/workflow/status/route.ts`
- `app/api/workflow/pass/route.ts`
- `app/pipeline/page.tsx`
- `components/workflow/WorkflowTimeline.tsx`
- `components/workflow/WorkflowActions.tsx`
- `app/letters/new/NewLetterForm.tsx`
- `app/api/letters/create/route.ts`
- `components/shell/AppShell.tsx`
- `components/shell/MobileNav.tsx`

### Database work

- add `letter_workflow_steps`
- add indexes
- add RLS policies

### Nice-to-have files later

- `components/workflow/UserPicker.tsx`
- `components/workflow/PipelineFilters.tsx`
- `components/workflow/PipelineBoard.tsx`
- `app/api/notifications/*`

---

## 13. Simple mental model for a new developer

If you are new, remember this:

- `letters` = the document record
- `letter_workflow_steps` = the movement history and current assignment
- `Pipeline page` = the visual board of workflow state
- `Timeline component` = one letter’s journey
- `Workflow actions` = the buttons that mutate step state
- `Access layer` = the rule that decides who can see or act

That is the whole feature in one sentence:

> The Pipeline page reads workflow steps for letters, groups and displays them, then lets authorized users move each letter from one handler to the next.

---

## 14. Recommended development sequence

If someone is implementing this from zero, do it in this exact order:

1. create database table
2. add RLS policies
3. write workflow helper
4. connect create-letter first handler
5. add workflow APIs
6. add timeline component
7. add actions component
8. add Pipeline page
9. add dashboard widgets
10. tighten access control
11. test role behavior
12. polish UI

That order avoids most integration bugs.

---

## 15. How to test the Pipeline page manually

Use 3 accounts:

- Admin
- Secretary
- Staff

### Test cases

1. Admin creates a letter and assigns Staff A as first handler
2. Staff A sees it in Pipeline and on Dashboard
3. Staff A marks it `IN_PROGRESS`
4. Secretary passes it to Staff B
5. Staff B now sees it
6. Staff A should no longer have action control
7. Staff B marks it `DONE`
8. Timeline should show both handlers and timestamps
9. Staff users should not see `New Letter`
10. Staff should not be able to hit create/upload/next-ref successfully via API

---

## 16. Final recommendation

The Pipeline page should become the operational workflow board, not just another list page.

If you want to improve it next, the best changes are:

1. real kanban columns
2. searchable assignee picker instead of raw user ID
3. overdue visual states
4. notifications/activity log
5. reusable filter toolbar

