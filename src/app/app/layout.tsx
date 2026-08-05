import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getNotificationCount } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const typed = profile as Profile;
  const notificationCount = await getNotificationCount(
    supabase,
    typed,
    user.id,
  );

  return (
    <AppShell profile={typed} notificationCount={notificationCount}>
      {children}
    </AppShell>
  );
}
