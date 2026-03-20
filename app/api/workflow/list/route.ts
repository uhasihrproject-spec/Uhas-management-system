import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getLetterAccess } from "@/lib/letters/access";
import { listWorkflowSteps } from "@/lib/workflow";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const letterId = String(url.searchParams.get("letterId") || "").trim();
  if (!letterId) return NextResponse.json({ error: "letterId is required" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getLetterAccess(auth.user.id, letterId);
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const workflow = await listWorkflowSteps(letterId);
  return NextResponse.json({ workflow });
}
