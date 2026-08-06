"use server";

import { randomInt } from "crypto";
import {
  createAdminClient,
  createAuthClientUser,
  findAuthUserIdByEmail,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SKIP_WORDS = new Set([
  "llc",
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "co",
  "company",
  "ltd",
  "limited",
  "the",
  "and",
  "of",
  "a",
  "an",
]);

export type EnsureClientPortalResult =
  | {
      ok: true;
      alreadyActive: true;
      customerId: string;
      email: string;
      createdNewUser: false;
    }
  | {
      ok: true;
      alreadyActive: false;
      customerId: string;
      email: string;
      temporaryPassword: string;
      createdNewUser: true;
    }
  | {
      ok: true;
      alreadyActive: false;
      customerId: string;
      email: string;
      createdNewUser: false;
      linkedExistingAuthUser: true;
    }
  | { ok: false; error: string };

function businessInitials(clientName: string): string {
  const parts = clientName
    .trim()
    .split(/[\s,/&.\-]+/)
    .map((p) => p.replace(/[^a-zA-Z0-9]/g, ""))
    .filter((p) => p.length > 0 && !SKIP_WORDS.has(p.toLowerCase()));

  const letters = parts.map((p) => p[0]!.toUpperCase()).join("");
  if (letters.length >= 2) return letters.slice(0, 4);
  if (letters.length === 1) return `${letters}X`;
  return "CL";
}

function generateTempPassword(clientName: string): string {
  const initials = businessInitials(clientName);
  const digits = String(randomInt(0, 100_000)).padStart(5, "0");
  return `${initials}-${digits}`;
}

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Not authenticated.", supabase };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["agency_manager", "account_manager"].includes(profile.role)) {
    return {
      ok: false as const,
      error: "Only agency managers can create client portal accounts.",
      supabase,
    };
  }

  return { ok: true as const, supabase };
}

async function ensureProfileIsClient(
  userId: string,
  fullName: string,
  email: string,
  opts?: { temporaryPasswordIssued?: boolean },
) {
  const admin = createAdminClient();
  if (!admin) return;
  const row: Record<string, unknown> = {
    id: userId,
    full_name: fullName,
    email,
    role: "client",
  };
  if (opts?.temporaryPasswordIssued) {
    row.must_change_password = true;
    row.password_change_deferred = true;
  }
  await admin.from("profiles").upsert(row, { onConflict: "id" });
}

async function markTemporaryPasswordIssued(userId: string) {
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("profiles")
    .update({
      must_change_password: true,
      password_change_deferred: true,
    })
    .eq("id", userId);
}

async function linkUserToClient(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  clientId: string;
  userId: string;
}) {
  // Staff access is already verified by requireStaff(); the link row is written
  // with the service role because client_user_links has no staff INSERT policy.
  const writer = createAdminClient() ?? input.supabase;

  const { data: existing } = await writer
    .from("client_user_links")
    .select("user_id")
    .eq("client_id", input.clientId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (existing) return { ok: true as const };

  const { error } = await writer.from("client_user_links").insert({
    client_id: input.clientId,
    user_id: input.userId,
  });

  if (error) {
    if (error.code === "23505") return { ok: true as const };
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

/**
 * Ensure the client organization has a linked portal Auth user.
 * Creates a new Auth user with password INITIALS-##### when needed.
 * Never stores the plaintext password in application tables.
 */
export async function ensureClientPortalAccount(
  clientId: string,
): Promise<EnsureClientPortalResult> {
  const auth = await requireStaff();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, client_name, contact_name, contact_email, customer_id, portal_status")
    .eq("id", clientId)
    .single();

  if (clientErr || !client) {
    return { ok: false, error: clientErr?.message || "Client not found." };
  }

  const customerId = String(client.customer_id || "").trim();
  if (!customerId) {
    return {
      ok: false,
      error: "Client is missing a Customer ID. Complete client intake first.",
    };
  }

  const email = String(client.contact_email || "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    return {
      ok: false,
      error:
        "Client profile is missing a valid contact email. Update the client profile, then create the portal account.",
    };
  }

  const fullName =
    String(client.contact_name || "").trim() ||
    String(client.client_name || "").trim() ||
    "Client User";

  const { data: links } = await supabase
    .from("client_user_links")
    .select("user_id")
    .eq("client_id", clientId)
    .limit(1);

  if ((links ?? []).length > 0) {
    return {
      ok: true,
      alreadyActive: true,
      customerId,
      email,
      createdNewUser: false,
    };
  }

  const temporaryPassword = generateTempPassword(String(client.client_name || "Client"));
  const created = await createAuthClientUser({
    email,
    password: temporaryPassword,
    fullName,
  });

  let userId: string;
  let createdNewUser = false;

  if (created.ok) {
    userId = created.userId;
    createdNewUser = true;
  } else if (created.alreadyExists) {
    const existing = await findAuthUserIdByEmail(email);
    if (!existing) {
      return {
        ok: false,
        error:
          "An Auth account exists for this email, but it could not be resolved. Ask an admin to link the client user.",
      };
    }
    userId = existing.id;
  } else {
    return { ok: false, error: created.error };
  }

  await ensureProfileIsClient(userId, fullName, email, {
    temporaryPasswordIssued: createdNewUser,
  });

  const linked = await linkUserToClient({
    supabase,
    clientId,
    userId,
  });
  if (!linked.ok) {
    return { ok: false, error: linked.error };
  }

  if (createdNewUser) {
    await markTemporaryPasswordIssued(userId);
  }

  {
    const statusWriter = createAdminClient() ?? supabase;
    const { error: statusErr } = await statusWriter
      .from("clients")
      .update({ portal_status: "Portal Active", updated_at: new Date().toISOString() })
      .eq("id", clientId);
    if (statusErr) {
      console.error("ensureClientPortalAccount portal_status update", statusErr);
    }
  }

  if (createdNewUser) {
    return {
      ok: true,
      alreadyActive: false,
      customerId,
      email,
      temporaryPassword,
      createdNewUser: true,
    };
  }

  return {
    ok: true,
    alreadyActive: false,
    customerId,
    email,
    createdNewUser: false,
    linkedExistingAuthUser: true,
  };
}

export type ResetClientPortalPasswordResult =
  | {
      ok: true;
      customerId: string;
      email: string;
      temporaryPassword: string;
    }
  | { ok: false; error: string };

/**
 * Issue a new INITIALS-##### portal password for the linked client Auth user.
 * Shown once to staff; never stored in application tables.
 */
export async function resetClientPortalPassword(
  clientId: string,
): Promise<ResetClientPortalPasswordResult> {
  const auth = await requireStaff();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Server Auth admin is not configured (SUPABASE_SERVICE_ROLE_KEY). Cannot reset portal passwords.",
    };
  }

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, client_name, contact_email, customer_id")
    .eq("id", clientId)
    .single();

  if (clientErr || !client) {
    return { ok: false, error: clientErr?.message || "Client not found." };
  }

  const customerId = String(client.customer_id || "").trim();
  if (!customerId) {
    return { ok: false, error: "Client is missing a Customer ID." };
  }

  const { data: links } = await supabase
    .from("client_user_links")
    .select("user_id")
    .eq("client_id", clientId)
    .limit(1);

  const userId = links?.[0]?.user_id as string | undefined;
  if (!userId) {
    return {
      ok: false,
      error:
        "This client does not have a linked portal account yet. Finalize a contract or use Create portal account first.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  const email = (
    profile?.email ||
    String(client.contact_email || "")
  )
    .trim()
    .toLowerCase();

  const temporaryPassword = generateTempPassword(String(client.client_name || "Client"));
  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
  });

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  await markTemporaryPasswordIssued(userId);

  return {
    ok: true,
    customerId,
    email: email.includes("@") ? email : String(client.contact_email || "").trim(),
    temporaryPassword,
  };
}

/** Whether this client org already has at least one linked portal user. */
export async function clientHasPortalLink(clientId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_user_links")
    .select("user_id")
    .eq("client_id", clientId)
    .limit(1);
  return (data ?? []).length > 0;
}
