import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import EditLetterForm, { type LetterEditInitial } from "./EditLetterForm";

export default async function EditLetterPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // 🔥 Next 16 params fix
  const p = await Promise.resolve(params);
  const id = p.id;

  const supabase = await supabaseServer();

  // 🔐 Get current user
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <div className="p-8">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
          <p className="text-sm text-red-700">
            You must be logged in to edit letters.
          </p>
        </div>
      </div>
    );
  }

  // 🔐 Get role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  const role = profile?.role ?? null;
  const canEdit = role === "ADMIN" || role === "SECRETARY";

  if (!canEdit) {
    return (
      <div className="p-8">
        <Link
          href={`/letters/${id}`}
          className="text-sm text-emerald-700 hover:underline"
        >
          ← Back to Details
        </Link>

        <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
          <p className="text-sm text-red-700">
            You do not have permission to edit this letter.
          </p>
        </div>
      </div>
    );
  }

  // 📄 Fetch letter
  const { data: letter, error } = await supabase
    .from("letters")
    .select(
      "id,ref_no,direction,date_received,date_on_letter,sender_name,sender_org,recipient_department,subject,summary,category,confidentiality,status,tags,file_path,file_name,mime_type"
    )
    .eq("id", id)
    .single();

  if (error || !letter) {
    return (
      <div className="p-8">
        <Link
          href="/letters"
          className="text-sm text-emerald-700 hover:underline"
        >
          ← Back to Letters
        </Link>

        <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
          <p className="text-sm text-red-700">
            {error?.message || "Letter not found."}
          </p>
        </div>
      </div>
    );
  }

  // Ensure tags always array
  const initial = {
    ...letter,
    tags: Array.isArray(letter.tags) ? letter.tags : [],
  } as LetterEditInitial;

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <Link
            href={`/letters/${letter.id}`}
            className="text-sm text-emerald-700 hover:underline"
          >
            ← Back to Letter Details
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-neutral-500">
            UHAS Procurement Directorate
          </p>

          <h1 className="mt-2 text-2xl font-semibold">
            Edit Letter Record
          </h1>

          <p className="mt-2 text-sm text-neutral-700">
            Update the information below and click{" "}
            <span className="font-medium">Save Changes</span>.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 ring-1 ring-neutral-200">
              Ref: <span className="font-medium">{letter.ref_no}</span>
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 ring-1 ring-emerald-100">
              Current file:{" "}
              <span className="font-medium">{letter.file_name}</span>
            </span>
          </div>
        </div>

        <Link
          href={`/letters/${letter.id}`}
          className="rounded-2xl px-4 py-2 text-sm font-medium border border-neutral-200 hover:bg-neutral-50"
        >
          Cancel
        </Link>
      </div>

      <div className="mt-6">
        <EditLetterForm initial={initial} />
      </div>
    </div>
  );
}
