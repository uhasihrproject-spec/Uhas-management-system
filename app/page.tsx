import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // If logged in → go straight to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white ring-1 ring-neutral-200/70 p-8 text-center">
        
        <div className="flex justify-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center p-2 overflow-hidden">
            <Image
              src="/logo/Uhas.png"
              alt="UHAS Logo"
              width={48}
              height={48}
              className="object-contain w-full h-full"
              priority
            />
          </div>
        </div>

        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          UHAS Procurement Directorate
        </p>

        <h1 className="mt-3 text-xl font-semibold text-neutral-900">
          Records Registry System
        </h1>

        <p className="mt-3 text-sm text-neutral-600">
          Secure internal platform for managing letters and audit records.
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-100 text-black px-4 py-3 text-sm font-semibold hover:brightness-95 transition"
          >
            Sign in
          </Link>

          <Link
            href="/auth/forgot"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition"
          >
            Forgot password
          </Link>
        </div>
      </div>
    </div>
  );
}
