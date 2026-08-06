"use server";

import { createClient } from "@/lib/supabase/server";

/** Resolve Customer ID → Auth email for the normal client login form. */
export async function resolveClientLoginEmailAction(customerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_client_login_email", {
    p_customer_id: customerId.trim(),
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  const payload = data as { ok?: boolean; email?: string; error?: string } | null;
  if (!payload?.ok || !payload.email) {
    return {
      ok: false as const,
      error: payload?.error || "Could not resolve Customer ID.",
    };
  }
  return { ok: true as const, email: payload.email };
}
