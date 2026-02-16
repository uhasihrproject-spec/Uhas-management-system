import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import LetterViewer from "./LetterViewer";

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

  // ✅ Audit: viewed (best-effort)
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
            className="rounded-2xl px-4 py-2 text-sm font-semibold text-white
            bg-gradient-to-r from-emerald-600 to-amber-500 hover:brightness-95"
        >
            Edit Letter / Replace Scan
        </Link>
        ) : null}
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
                <dd className="font-medium text-right">{letter.recipient_department}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70">
            <h2 className="text-sm font-semibold">Summary</h2>
            <p className="mt-3 text-sm text-neutral-800 whitespace-pre-wrap">
              {letter.summary || "—"}
            </p>
          </div>
        </div>

        <div className="lg:col-span-3">
          <LetterViewer
            letterId={letter.id}
            filePath={letter.file_path}
            fileName={letter.file_name}
            mimeType={letter.mime_type}
          />
        </div>
      </div>
    </div>
  );
}
