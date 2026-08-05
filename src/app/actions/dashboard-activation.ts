"use server";

import { generateAccessCodeMaterial } from "@/lib/signing-invite-crypto";
import { sendEmail } from "@/lib/email/send-email";
import { buildWelcomeActivationEmail } from "@/lib/email/welcome-activation-template";
import { processPostSignatureWelcome } from "@/lib/post-signature-welcome";
import { createAuthClientUser } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const AGENCY_NAME = "Rebel Marketing";
const AGENCY_FALLBACK_EMAIL = "hello@rebel.demo";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`
      : "http://localhost:3001")
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export async function notifyAfterClientSignature(input: {
  signatureRequestId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let agencyContactName = "Account Manager";
  let agencyContactEmail = AGENCY_FALLBACK_EMAIL;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.full_name) agencyContactName = profile.full_name;
    if (profile?.email) agencyContactEmail = profile.email;
  }

  return processPostSignatureWelcome({
    signatureRequestId: input.signatureRequestId,
    agencyContactName,
    agencyContactEmail,
    createdBy: user?.id || null,
  });
}

/** Look up the just-signed request for a contract (auth signing path). */
export async function notifyAfterClientSignatureForContract(contractId: string) {
  const supabase = await createClient();
  const { data: request } = await supabase
    .from("signature_requests")
    .select("id")
    .eq("contract_id", contractId)
    .not("signed_at", "is", null)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request?.id) {
    return { ok: false as const, error: "Signed signature request not found." };
  }

  return notifyAfterClientSignature({ signatureRequestId: String(request.id) });
}

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

export async function activateDashboardAccount(input: {
  customerId: string;
  activationCode: string;
  password: string;
  confirmPassword: string;
}) {
  if (input.password.length < 8) {
    return { ok: false as const, error: "Password must be at least 8 characters." };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false as const, error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { data: verified, error: verifyErr } = await supabase.rpc(
    "verify_dashboard_activation",
    {
      p_customer_id: input.customerId.trim(),
      p_code: input.activationCode.trim(),
    },
  );

  if (verifyErr) {
    return { ok: false as const, error: verifyErr.message };
  }

  const check = verified as {
    ok?: boolean;
    message?: string;
    error?: string;
    intended_email?: string;
    contact_name?: string;
    client_name?: string;
  } | null;

  if (!check?.ok || !check.intended_email) {
    return {
      ok: false as const,
      error: check?.message || check?.error || "Invalid activation code.",
    };
  }

  const email = check.intended_email.toLowerCase();
  const fullName = check.contact_name || check.client_name || "Client User";

  // Password goes only to Supabase Auth — never written to application tables.
  const created = await createAuthClientUser({
    email,
    password: input.password,
    fullName,
  });

  let userId: string | null = null;

  if (created.ok) {
    userId = created.userId;
  } else if (created.alreadyExists) {
    return {
      ok: false as const,
      error:
        "An account already exists for this email. Sign in with your existing password on the client login page.",
      alreadyExists: true as const,
    };
  } else {
    // Fallback: public signUp if admin key missing
    const { data: signData, error: signErr } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: { full_name: fullName, role: "client" },
      },
    });
    if (signErr) {
      const msg = signErr.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        return {
          ok: false as const,
          error:
            "An account already exists for this email. Sign in with your existing password on the client login page.",
          alreadyExists: true as const,
        };
      }
      return { ok: false as const, error: signErr.message || created.error };
    }
    userId = signData.user?.id || null;
  }

  if (!userId) {
    return { ok: false as const, error: "Could not establish Auth user." };
  }

  const { data: completed, error: completeErr } = await supabase.rpc(
    "complete_dashboard_activation",
    {
      p_customer_id: input.customerId.trim(),
      p_code: input.activationCode.trim(),
      p_user_id: userId,
    },
  );

  if (completeErr) {
    return { ok: false as const, error: completeErr.message };
  }

  const done = completed as { ok?: boolean; error?: string; message?: string } | null;
  if (!done?.ok) {
    return {
      ok: false as const,
      error: done?.message || done?.error || "Could not complete activation.",
    };
  }

  // Establish session for the new user when possible
  await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });

  return {
    ok: true as const,
    message: `Your client dashboard has been activated successfully. Welcome to ${AGENCY_NAME}.`,
  };
}

export async function resendDashboardActivation(input: { clientId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["agency_manager", "account_manager"].includes(profile.role)) {
    return { ok: false as const, error: "Only agency managers can resend activation." };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, client_name, contact_name, contact_email, customer_id")
    .eq("id", input.clientId)
    .single();

  if (!client) return { ok: false as const, error: "Client not found." };

  const { data: hasLink } = await supabase.rpc("client_has_active_portal_link", {
    p_client_id: client.id,
  });
  if (hasLink) {
    return {
      ok: false as const,
      error: "This client already has an active portal account. Send them the normal login link instead.",
    };
  }

  const { data: emailRegistered } = await supabase.rpc("auth_email_registered", {
    p_email: client.contact_email,
  });
  if (emailRegistered) {
    return {
      ok: false as const,
      error:
        "An Auth account already exists for this email. Do not send another activation code — use the client login page.",
    };
  }

  const recipientEmail = (client.contact_email || "").trim().toLowerCase();
  if (!recipientEmail.includes("@")) {
    return { ok: false as const, error: "Client profile is missing a contact email." };
  }

  const { salt, code, hash } = generateAccessCodeMaterial();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { data: issued, error: issueErr } = await supabase.rpc("issue_dashboard_activation", {
    p_client_id: client.id,
    p_intended_email: recipientEmail,
    p_token_hash: hash,
    p_token_salt: salt,
    p_expires_at: expiresAt,
    p_signature_request_id: null,
    p_created_by: user.id,
    p_replace_existing: true,
  });

  if (issueErr) return { ok: false as const, error: issueErr.message };
  const issuePayload = issued as { ok?: boolean; error?: string } | null;
  if (!issuePayload?.ok) {
    return { ok: false as const, error: issuePayload?.error || "Could not issue activation." };
  }

  const activationLink = `${appBaseUrl()}/activate`;
  const content = buildWelcomeActivationEmail({
    clientContactFirstName: client.contact_name || client.client_name,
    clientBusinessName: client.client_name,
    contractName: "your agreement",
    customerId: client.customer_id,
    activationLink,
    activationCode: code,
    expirationDate: formatDate(expiresAt),
    agencyName: AGENCY_NAME,
    agencyContactName: profile.full_name || "Account Manager",
    agencyContactEmail: profile.email || AGENCY_FALLBACK_EMAIL,
  });

  const delivery = await sendEmail({
    to: recipientEmail,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  const deliveryStatus =
    delivery.mode === "sent" ? "sent" : delivery.mode === "failed" ? "failed" : "simulated";

  await supabase.from("portal_notifications").insert({
    client_id: client.id,
    contract_id: null,
    notification_type: "dashboard_activation_resend",
    recipient_email: recipientEmail,
    subject: content.subject,
    body: content.text.replace(code, "[REDACTED]"),
    payload: {
      delivery_status: deliveryStatus,
      invite_expires_at: expiresAt,
      resent_by: user.id,
    },
    created_by: user.id,
    delivery_status: deliveryStatus,
    sent_at: new Date().toISOString(),
    error_message: delivery.mode === "failed" ? delivery.error : null,
  });

  return {
    ok: true as const,
    recipientEmail,
    deliveryStatus: deliveryStatus as "sent" | "simulated" | "failed",
    simulatedPreview:
      deliveryStatus === "simulated"
        ? {
            subject: content.subject,
            text: content.text,
            activationCode: code,
          }
        : null,
    deliveryError: delivery.mode === "failed" ? delivery.error : null,
  };
}

export async function getClientActivationStatus(clientId: string) {
  const supabase = await createClient();
  const { data: hasLink } = await supabase.rpc("client_has_active_portal_link", {
    p_client_id: clientId,
  });
  const { data: pending } = await supabase
    .from("dashboard_activations")
    .select("id, status, expires_at, intended_email, created_at")
    .eq("client_id", clientId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ok: true as const,
    hasActivePortal: Boolean(hasLink),
    pendingActivation: pending
      ? {
          expiresAt: pending.expires_at as string,
          intendedEmail: pending.intended_email as string,
        }
      : null,
  };
}
