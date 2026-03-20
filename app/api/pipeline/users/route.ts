// app/api/pipeline/users/route.ts
// Returns the full list of profiles for the create-pipeline form (user select).
// Only ADMIN/SECRETARY can call this successfully.

import { NextResponse }  from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { supabaseAdmin }  from "@/lib/supabase/admin"

export async function GET() {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ users: [] }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "SECRETARY")) {
    return NextResponse.json({ users: [] }, { status: 403 })
  }

  const { data: users } = await admin
    .from("profiles")
    .select("id, full_name, role, department")
    .order("full_name")

  return NextResponse.json({ users: users ?? [] })
}