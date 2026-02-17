import "./globals.css";
import { supabaseServer } from "@/lib/supabase/server";
import AppShell from "@/components/shell/AppShell";
import TopLoader from "@/components/TopLoader";
import IntroOverlay from "@/components/IntroOverlay";

export const metadata = {
  title: "UHAS Procurement Records",
  description: "Letters registry system",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // fetch role server-side (secure + no UI flicker)
  let role: "ADMIN" | "SECRETARY" | "STAFF" | null = null;
  let fullName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    role = (profile?.role as any) ?? null;
    fullName = profile?.full_name ?? null;
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-brand text-neutral-900">
        <TopLoader />
        <IntroOverlay />

        {user ? (
          <AppShell
            userEmail={user.email ?? ""}
            userName={fullName}
            role={role}
          >
            {children}
          </AppShell>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}