"use server";

import { createClient } from "@/lib/supabase/server";
import { isClientRole } from "@/lib/access";

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

function validateNewPassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

/**
 * Client sets a permanent password after using a one-time portal password.
 * Clears must_change_password so normal portal access resumes.
 */
export async function changeClientPortalPassword(input: {
  newPassword: string;
  confirmPassword: string;
}): Promise<ChangePasswordResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile || !isClientRole(profile.role)) {
    return { ok: false, error: "Only client portal users can use this form." };
  }

  const newPassword = input.newPassword.trim();
  const confirmPassword = input.confirmPassword.trim();
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }

  const validationError = validateNewPassword(newPassword);
  if (validationError) return { ok: false, error: validationError };

  const { error: authErr } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (authErr) {
    return { ok: false, error: authErr.message };
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      must_change_password: false,
      password_change_deferred: false,
    })
    .eq("id", user.id);

  if (profileErr) {
    return {
      ok: false,
      error:
        "Password updated in Auth, but profile flag could not be cleared. Contact support.",
    };
  }

  return { ok: true };
}

/**
 * After a deferred OTP session, mark that the next login must change the password.
 * Called on client logout while must_change_password is still true.
 */
export async function consumeDeferredPasswordChange(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password, password_change_deferred")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !isClientRole(profile.role) ||
    !profile.must_change_password ||
    !profile.password_change_deferred
  ) {
    return;
  }

  await supabase
    .from("profiles")
    .update({ password_change_deferred: false })
    .eq("id", user.id);
}
