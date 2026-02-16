import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabaseAuth = await supabaseServer();
  const { data: auth } = await supabaseAuth.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filePath } = await req.json();
  if (!filePath) return NextResponse.json({ error: "Missing filePath" }, { status: 400 });

  // service role so it can sign even if RLS/Storage rules are tight
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await admin.storage.from("letters").createSignedUrl(filePath, 60 * 10); // 10 mins

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
