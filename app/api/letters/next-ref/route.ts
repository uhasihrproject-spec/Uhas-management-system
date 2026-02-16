import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

export async function POST(req: Request) {
  // must be logged in
  const supabaseAuth = await supabaseServer();
  const { data: auth } = await supabaseAuth.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { direction, year } = await req.json();

  const dir = direction === "OUTGOING" ? "OUT" : "IN";
  const y = Number(year) || new Date().getFullYear();

  // Use service role to read latest ref without RLS blocking
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Pattern: UHAS/PROC/IN/2026/0001
  const prefix = `UHAS/PROC/${dir}/${y}/`;

  const { data, error } = await admin
    .from("letters")
    .select("ref_no")
    .like("ref_no", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let next = 1;
  const last = data?.[0]?.ref_no as string | undefined;

  if (last && last.startsWith(prefix)) {
    const tail = last.slice(prefix.length);
    const num = Number(tail);
    if (Number.isFinite(num) && num > 0) next = num + 1;
  }

  return NextResponse.json({ refNo: `${prefix}${pad4(next)}` });
}
