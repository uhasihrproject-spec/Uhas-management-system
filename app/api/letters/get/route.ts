import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getLetterAccess } from "@/lib/letters/access";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const letterId = searchParams.get("letter_id");

  if (!letterId) return NextResponse.json({ error: "letter_id is required" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getLetterAccess(auth.user.id, letterId);
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = supabaseAdmin();

  const { data: letter, error } = await admin
    .from("letters")
    .select("id,file_name,file_path,mime_type,updated_at")
    .eq("id", letterId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!letter) return NextResponse.json({ error: "Letter not found" }, { status: 404 });

  return NextResponse.json({ letter });
}
