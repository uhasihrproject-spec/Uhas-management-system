import "./globals.css";
import { supabaseServer } from "@/lib/supabase/server";
import AppShell from "@/components/shell/AppShell";
import TopLoader from "@/components/TopLoader";

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

  return (
    <html lang="en">
      <body className="min-h-screen bg-brand text-neutral-900">
        <TopLoader />

        {user ? (
          <AppShell userEmail={user.email ?? ""}>{children}</AppShell>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}
