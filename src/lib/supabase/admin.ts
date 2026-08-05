/**
 * Server-only Supabase admin client (service role).
 * Never import this from client components or expose SUPABASE_SERVICE_ROLE_KEY publicly.
 *
 * Reuses Supabase Auth as the sole password store:
 * - auth.users / auth.identities
 * - handle_new_user → profiles
 * - client_user_links for org binding after Auth user exists
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}

/**
 * Cookie-free Auth client for public sign-up fallback.
 * It cannot read or overwrite an employee/client browser session.
 */
export function createStatelessPublicAuthClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function findAuthUserIdByEmail(
  email: string,
): Promise<{ id: string; email: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const normalized = email.trim().toLowerCase();
  // getUserByEmail is available on auth.admin in supabase-js v2
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error || !data?.users) return null;
  const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
  return match?.id && match.email
    ? { id: match.id, email: match.email }
    : null;
}

/**
 * Create Auth user with password via Supabase Auth only.
 * Does not write passwords to application tables.
 */
export async function createAuthClientUser(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string; alreadyExists?: boolean }> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Server Auth admin is not configured (SUPABASE_SERVICE_ROLE_KEY). Cannot create portal accounts.",
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      role: "client",
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { ok: false, error: error.message, alreadyExists: true };
    }
    return { ok: false, error: error.message };
  }

  if (!data.user?.id) {
    return { ok: false, error: "Auth user was not created." };
  }

  return { ok: true, userId: data.user.id };
}
