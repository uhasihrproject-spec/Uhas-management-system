import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Conf = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";

function asArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(String).map((s) => s.trim()).filter(Boolean);
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const admin = supabaseAdmin();

  // Fetch profile via service role to avoid RLS surprises
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id,role,department")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found. Create a row in public.profiles for this user." },
      { status: 400 }
    );
  }

  if (!["ADMIN", "SECRETARY"].includes(profile.role || "")) {
    return NextResponse.json({ error: "Only admin or secretary can create letters." }, { status: 403 });
  }

  const confidentiality = (body?.confidentiality || "INTERNAL") as Conf;
  if (!["PUBLIC", "INTERNAL", "CONFIDENTIAL"].includes(confidentiality)) {
    return NextResponse.json({ error: "Invalid confidentiality." }, { status: 400 });
  }

  if (!String(body?.ref_no || "").trim()) return NextResponse.json({ error: "ref_no is required." }, { status: 400 });
  if (!String(body?.sender_name || "").trim()) return NextResponse.json({ error: "sender_name is required." }, { status: 400 });
  if (!String(body?.subject || "").trim()) return NextResponse.json({ error: "subject is required." }, { status: 400 });
  if (!String(body?.date_received || "").trim()) return NextResponse.json({ error: "date_received is required." }, { status: 400 });

  const direction = String(body?.direction || "").toUpperCase();
  if (!["INCOMING", "OUTGOING"].includes(direction)) {
    return NextResponse.json({ error: "Invalid direction." }, { status: 400 });
  }

  const status = String(body?.status || "").toUpperCase();
  if (!status || !["RECEIVED", "SCANNED", "ASSIGNED", "ARCHIVED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (direction === "OUTGOING" && status === "RECEIVED") {
    return NextResponse.json(
      { error: "Outgoing letters cannot use RECEIVED status. Use ASSIGNED/SCANNED/ARCHIVED." },
      { status: 400 }
    );
  }

  const dateReceived = String(body?.date_received || "").trim();
  const dateOnLetter = String(body?.date_on_letter || "").trim();
  if (direction === "OUTGOING" && !dateOnLetter) {
    return NextResponse.json({ error: "date_on_letter is required for OUTGOING letters." }, { status: 400 });
  }

  if (dateOnLetter && dateReceived && new Date(dateOnLetter) > new Date(dateReceived)) {
    return NextResponse.json(
      { error: "date_on_letter cannot be later than date_received/date_sent." },
      { status: 400 }
    );
  }

  const recipient_department_raw = String(body?.recipient_department || "").trim();
  if (confidentiality === "INTERNAL" && !recipient_department_raw) {
    return NextResponse.json(
      { error: "recipient_department is required for INTERNAL letters." },
      { status: 400 }
    );
  }

  const recipient_user_ids = asArray(body?.recipient_user_ids);
  if (confidentiality === "CONFIDENTIAL" && recipient_user_ids.length === 0) {
    return NextResponse.json(
      { error: "recipient_user_ids is required for CONFIDENTIAL letters." },
      { status: 400 }
    );
  }

  const insertLetter = {
    ref_no: String(body.ref_no).trim(),
    direction,
    date_received: dateReceived,
    date_on_letter: body.date_on_letter || null,
    sender_name: String(body.sender_name).trim(),
    sender_org: body.sender_org || null,
    recipient_department: recipient_department_raw || null,
    subject: String(body.subject).trim(),
    summary: body.summary || null,
    category: body.category || null,
    confidentiality,
    status,
    tags: Array.isArray(body.tags) ? body.tags : [],
    file_bucket: body.file_bucket,
    file_path: body.file_path,
    file_name: body.file_name,
    mime_type: body.mime_type,
    created_by: auth.user.id,
  };

  const { data: inserted, error } = await admin
    .from("letters")
    .insert([insertLetter])
    .select("id,ref_no")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (confidentiality === "CONFIDENTIAL") {
<<<<<<< codex/fix-confidentiality-issues-and-bugs-vqndpy
    const rows = recipient_user_ids.map((uid) => ({ letter_id: inserted.id, user_id: uid }));
=======
    const rows = recipient_user_ids.map((uid) => ({
      letter_id: inserted.id,
      user_id: uid,
    }));

    const admin = supabaseAdmin();
>>>>>>> main
    const { error: rErr } = await admin.from("letter_recipients").insert(rows);

    if (rErr) {
      await admin.from("letters").delete().eq("id", inserted.id);
      return NextResponse.json({ error: rErr.message }, { status: 400 });
    }
  }

  await admin.from("audit_logs").insert([
    {
      user_id: profile.id,
      action: "CREATED",
      letter_id: inserted.id,
      meta: {
        ref_no: inserted.ref_no,
        confidentiality,
        recipient_department: insertLetter.recipient_department,
        recipient_user_ids: confidentiality === "CONFIDENTIAL" ? recipient_user_ids : [],
      },
    },
  ]);

  return NextResponse.json({ ok: true, id: inserted.id });
}
