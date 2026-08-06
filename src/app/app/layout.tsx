import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  clientNeedsForcedPasswordChange,
  isClientPortalHome,
  isClientRole,
} from "@/lib/access";
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
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/app";
  const onChangePassword =
    pathname === "/app/account/change-password" ||
    pathname.startsWith("/app/account/change-password/");

  if (clientNeedsForcedPasswordChange(typed) && !onChangePassword) {
    redirect("/app/account/change-password");
  }

  if (isClientRole(typed.role) && !isClientPortalHome(pathname)) {
    redirect("/app?denied=1");
  }

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
