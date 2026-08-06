import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { PageHeader } from "@/components/ui";
import { clientNeedsForcedPasswordChange, isClientRole } from "@/lib/access";
import { getProfile } from "@/lib/page-auth";

export default async function ChangePasswordPage() {
  const { profile } = await getProfile();
  if (!profile) redirect("/login");
  if (!isClientRole(profile.role)) redirect("/app");

  // Optional visit: clients who already set a password can leave.
  if (!profile.must_change_password) {
    redirect("/app");
  }

  return (
    <div>
      <PageHeader
        title="Choose a new password"
        subtitle={
          clientNeedsForcedPasswordChange(profile)
            ? "Your one-time password can no longer be used. Set a permanent password to continue."
            : "Replace your one-time password before your next visit."
        }
      />
      <ChangePasswordForm />
    </div>
  );
}
