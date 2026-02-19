// app/letters/[id]/page.tsx
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import LetterViewer from "./LetterViewer";

type Direction = "INCOMING" | "OUTGOING";
type Conf = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";

type UserPick = {
  id: string;
  full_name: string | null;
  department: string | null;
  role?: string | null;
};

const DEPT_LABELS: Record<string, string> = {
  PROCUREMENT_DIRECTORATE: "Procurement Directorate",
  FINANCE_DIRECTORATE: "Finance Directorate",
  HR_DIRECTORATE: "HR Directorate",
  ACADEMIC_AFFAIRS: "Academic Affairs",
  REGISTRY: "Registry",
  ICT: "ICT",
  LEGAL: "Legal",
  ESTATE: "Estate",
  TRANSPORT: "Transport",
  SECURITY: "Security",
};

function deptLabel(v?: string | null) {
  if (!v) return "—";
  return DEPT_LABELS[v] ?? v;
}

function userLabel(u: UserPick) {
  return u.full_name?.trim() || "Unnamed User";
}

function joinNames(list: UserPick[], max = 3) {
  const names = list.slice(0, max).map(userLabel);
  const extra = list.length - names.length;
  if (extra > 0) return `${names.join(", ")} and ${extra} more`;
  return names.join(", ");
}

export default async function LetterDetailsPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const p = await Promise.resolve(params);
  const id = p.id;

  const supabase = await supabaseServer();

  const { data: letter, error } = await supabase
    .from("letters")
    .select(
      "id,ref_no,direction,date_received,date_on_letter,sender_name,sender_org,recipient_department,subject,summary,category,confidentiality,status,tags,created_at,file_path,file_name,mime_type"
    )
    .eq("id", id)
    .single();

  if (error || !letter) {
    return (
      <div className="p-8">
        <Link href="/letters" className="text-sm text-emerald-700 hover:underline">
          ← Back to Letters
        </Link>
        <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
          <p className="text-sm text-red-700">{error?.message || "Letter not found."}</p>
        </div>
      </div>
    );
  }

  // Audit: viewed (best-effort)
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) {
    await supabase.from("audit_logs").insert([
      {
        user_id: auth.user.id,
        action: "VIEWED",
        letter_id: letter.id,
        meta: { ref_no: letter.ref_no },
      },
    ]);
  }

  let role: string | null = null;

  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();

    role = profile?.role ?? null;
  }

  const canEdit = role === "ADMIN" || role === "SECRETARY";

  // Load recipients only when CONFIDENTIAL
  let recipients: UserPick[] = [];
  if (letter.confidentiality === "CONFIDENTIAL") {
    const { data: links } = await supabase
      .from("letter_recipients")
      .select("user_id")
      .eq("letter_id", letter.id);

    const ids = (links || []).map((r: any) => r.user_id).filter(Boolean);

    if (ids.length) {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, department, role")
        .in("id", ids);

      recipients = (users || []) as any;
    }
  }

  const direction = letter.direction as Direction | null;
  const conf = letter.confidentiality as Conf | null;

  const targetText =
    conf === "CONFIDENTIAL"
      ? recipients.length
        ? joinNames(recipients, 3)
        : "selected users"
      : conf === "INTERNAL"
      ? deptLabel(letter.recipient_department)
      : "everyone";

  const visibilityMsg =
    conf === "CONFIDENTIAL"
      ? `This letter was sent to ${targetText}.`
      : conf === "INTERNAL"
      ? `This letter was sent to ${targetText}.`
      : `This letter is for ${targetText}.`;

  const tone =
    conf === "CONFIDENTIAL"
      ? {
          ring: "ring-red-200/70",
          bg: "bg-gradient-to-br from-red-50 to-white",
          badge: "bg-red-100 text-red-800 ring-red-200/60",
          label: "Confidential",
        }
      : conf === "INTERNAL"
      ? {
          ring: "ring-amber-200/70",
          bg: "bg-gradient-to-br from-amber-50 to-white",
          badge: "bg-amber-100 text-amber-900 ring-amber-200/60",
          label: "Internal",
        }
      : {
          ring: "ring-emerald-200/70",
          bg: "bg-gradient-to-br from-emerald-50 to-white",
          badge: "bg-emerald-100 text-emerald-900 ring-emerald-200/60",
          label: "Public",
        };

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/letters" className="text-sm text-emerald-700 hover:underline">
            ← Back to Letters
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-neutral-500">
            UHAS Procurement Directorate
          </p>
          <h1 className="mt-2 text-2xl font-semibold">{letter.ref_no}</h1>

          <p className="mt-3 text-sm text-neutral-800">
            <span className="font-medium">Subject:</span> {letter.subject}
          </p>
        </div>

        {canEdit ? (
          <Link
            href={`/letters/${letter.id}/edit`}
            className="rounded-2xl px-4 py-2 text-sm font-semibold text-black bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 transition-colors"
          >
            Edit Letter / Replace Scan
          </Link>
        ) : null}
      </div>

      {/* Visibility banner (no emojis) */}
      <div className={`mt-6 rounded-3xl p-4 sm:p-5 ring-1 ${tone.ring} ${tone.bg}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone.badge}">
            {/* (string interpolation inside className doesn't work like this in JSX; keep it simple below) */}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={[
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1",
                  tone.badge,
                ].join(" ")}
              >
                {tone.label}
              </span>

              {/* Optional: show the exact count for confidential */}
              {conf === "CONFIDENTIAL" ? (
                <span className="text-xs text-neutral-600">
                  {recipients.length ? `${recipients.length} recipient(s)` : ""}
                </span>
              ) : null}
            </div>

            <div className="mt-2 text-sm text-neutral-900">{visibilityMsg}</div>

            {/* Confidential: show names without spoiling UI */}
            {conf === "CONFIDENTIAL" ? (
              <details className="mt-3">
                <summary className="text-sm font-semibold text-emerald-800 hover:text-emerald-900 cursor-pointer select-none">
                  View recipients
                </summary>

                <div className="mt-3 rounded-2xl bg-white/70 ring-1 ring-black/5 p-3">
                  {recipients.length ? (
                    <div className="flex flex-wrap gap-2">
                      {recipients.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-neutral-200"
                        >
                          {userLabel(u)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-600">No recipients found.</p>
                  )}
                </div>
              </details>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70">
            <h2 className="text-sm font-semibold">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Date received</dt>
                <dd className="font-medium text-right">{letter.date_received}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Sender</dt>
                <dd className="font-medium text-right">{letter.sender_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Department</dt>
                <dd className="font-medium text-right">{deptLabel(letter.recipient_department)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Confidentiality</dt>
                <dd className="font-medium text-right">{letter.confidentiality}</dd>
              </div>
            </dl>
          </div>

          {/* Summary: fixed max height + scroll */}
          <div className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70">
            <h2 className="text-sm font-semibold">Summary</h2>

            <div className="mt-3 max-h-56 overflow-auto pr-2">
              <p className="text-sm text-neutral-800 whitespace-pre-wrap">{letter.summary || "—"}</p>
            </div>

            {letter.summary && String(letter.summary).length > 260 ? (
              <p className="mt-2 text-xs text-neutral-500">Scroll to view full summary.</p>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-3">
          <LetterViewer
            letterId={letter.id}
            filePath={letter.file_path}
            fileName={letter.file_name}
            mimeType={letter.mime_type}
            confidentiality={letter.confidentiality}
            recipientDepartment={letter.recipient_department}
            summary={letter.summary}
          />
        </div>
      </div>
    </div>
  );
}
