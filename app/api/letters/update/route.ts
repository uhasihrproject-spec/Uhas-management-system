import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...patch } = body;
  if (!id) return NextResponse.json({ error: "Missing letter id" }, { status: 400 });

  const admin = supabaseAdmin();

  const { data: me, error: meErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
  if (!["ADMIN", "SECRETARY"].includes(me?.role || "")) {
    return NextResponse.json({ error: "Only admin or secretary can edit letters." }, { status: 403 });
  }

  const direction = String(patch?.direction || "").toUpperCase();
  const status = String(patch?.status || "").toUpperCase();
  const dateReceived = String(patch?.date_received || "").trim();
  const dateOnLetter = String(patch?.date_on_letter || "").trim();

  if (direction && !["INCOMING", "OUTGOING"].includes(direction)) {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }

  if (status && !["RECEIVED", "SCANNED", "ASSIGNED", "ARCHIVED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (direction === "OUTGOING" && status === "RECEIVED") {
    return NextResponse.json({ error: "Outgoing letters cannot use RECEIVED status." }, { status: 400 });
  }

  if (direction === "OUTGOING" && !dateOnLetter) {
    return NextResponse.json({ error: "date_on_letter is required for OUTGOING letters." }, { status: 400 });
  }

  if (dateOnLetter && dateReceived && new Date(dateOnLetter) > new Date(dateReceived)) {
    return NextResponse.json(
      { error: "date_on_letter cannot be later than date_received/date_sent." },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("letters")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("audit_logs").insert([
    {
      user_id: auth.user.id,
      action: "UPDATED",
      letter_id: id,
      meta: { fields: Object.keys(patch) },
    },
  ]);

  return NextResponse.json({ ok: true });
}
