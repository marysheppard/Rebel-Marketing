"use server";

import { generateAccessCodeMaterial } from "@/lib/signing-invite-crypto";
import { sendEmail } from "@/lib/email/send-email";
import { buildSigningInviteEmail } from "@/lib/email/signing-invite-template";
import {
  clearSigningInviteCookie,
  getSigningInviteToken,
  setSigningInviteCookie,
} from "@/lib/signing-invite-session";
import { createClient } from "@/lib/supabase/server";
import { normalizeContractStatus } from "@/lib/contract-status";
import { SUPPORT_CONTACT } from "@/data/supportContact";

const AGENCY_NAME = "Rebel Marketing";
const AGENCY_FALLBACK_EMAIL = SUPPORT_CONTACT.email;

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_URL?.replace(/\/$/, "")?.replace(/^(?!https?:)/, "https://") ||
    "http://localhost:3001"
  );
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
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

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated.", supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["agency_manager", "account_manager"].includes(profile.role)) {
    return {
      ok: false as const,
      error: "Only agency managers can send signing invitations.",
      supabase,
      user,
      profile,
    };
  }

  return { ok: true as const, supabase, user, profile };
}

async function issueInviteAndEmail(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  profile: { full_name?: string | null; email?: string | null };
  requestId: string;
  contract: {
    id: string;
    client_id: string;
    contract_name: string;
    contract_number: string;
  };
  client: {
    client_name: string;
    contact_name: string;
    contact_email: string;
    customer_id: string;
  };
  recipientEmail: string;
  dueAt: string;
  expiresAt: string;
  replaceExisting: boolean;
}) {
  const { salt, code, hash } = generateAccessCodeMaterial();

  const { data: codeResult, error: codeErr } = await input.supabase.rpc(
    "create_signing_invite_code",
    {
      p_signature_request_id: input.requestId,
      p_code_hash: hash,
      p_code_salt: salt,
      p_expires_at: input.expiresAt,
      p_replace_existing: input.replaceExisting,
    },
  );

  if (codeErr) {
    return { ok: false as const, error: codeErr.message };
  }

  const codePayload = codeResult as { ok?: boolean; error?: string } | null;
  if (!codePayload?.ok) {
    return { ok: false as const, error: codePayload?.error || "Could not store access code." };
  }

  const signingLink = `${appBaseUrl()}/sign/access`;
  const agencyContactName = input.profile.full_name?.trim() || "Account Manager";
  const agencyContactEmail = input.profile.email?.trim() || AGENCY_FALLBACK_EMAIL;

  const emailContent = buildSigningInviteEmail({
    clientContactFirstName: input.client.contact_name || input.client.client_name,
    clientLegalName: input.client.client_name,
    contractName: input.contract.contract_name,
    contractNumber: input.contract.contract_number,
    customerId: input.client.customer_id,
    temporaryAccessCode: code,
    signatureDueDate: formatDate(input.dueAt),
    expirationDate: formatDate(input.expiresAt),
    signingLink,
    agencyName: AGENCY_NAME,
    agencyContactName,
    agencyContactEmail,
  });

  const delivery = await sendEmail({
    to: input.recipientEmail,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  const deliveryStatus =
    delivery.mode === "sent" ? "sent" : delivery.mode === "failed" ? "failed" : "simulated";

  // Audit log — never store plaintext code in body/payload
  const safeBody = emailContent.text.replace(code, "[REDACTED]");
  await input.supabase.from("portal_notifications").insert({
    client_id: input.contract.client_id,
    contract_id: input.contract.id,
    signature_request_id: input.requestId,
    notification_type: "signing_invite",
    recipient_email: input.recipientEmail,
    subject: emailContent.subject,
    body: safeBody,
    payload: {
      delivery_status: deliveryStatus,
      invite_expires_at: input.expiresAt,
      due_at: input.dueAt,
      signing_link: signingLink,
      provider_id: delivery.mode === "sent" ? delivery.providerId : null,
      error: delivery.mode === "failed" ? delivery.error : null,
    },
    created_by: input.userId,
    delivery_status: deliveryStatus,
    sent_at: new Date().toISOString(),
    error_message: delivery.mode === "failed" ? delivery.error : null,
  });

  await input.supabase
    .from("signature_requests")
    .update({
      recipient_email: input.recipientEmail,
      invite_expires_at: input.expiresAt,
      email_delivery_status: deliveryStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.requestId);

  return {
    ok: true as const,
    requestId: input.requestId,
    recipientEmail: input.recipientEmail,
    deliveryStatus: deliveryStatus as "sent" | "simulated" | "failed",
    inviteExpiresAt: input.expiresAt,
    // One-time preview for simulated mode only — never persisted for re-read as secret
    simulatedPreview:
      deliveryStatus === "simulated"
        ? {
            subject: emailContent.subject,
            text: emailContent.text,
            temporaryAccessCode: code,
            signingLink,
          }
        : null,
    deliveryError: delivery.mode === "failed" ? delivery.error : null,
  };
}

export async function sendSigningInvitation(input: {
  contractId: string;
  signerUserId?: string;
  agencyMessage?: string;
  dueInDays?: number;
  /** Only used when client.contact_email is missing */
  overrideEmail?: string;
}) {
  const auth = await requireStaff();
  if (!auth.ok || !auth.user || !auth.profile) {
    return { ok: false as const, error: auth.error };
  }
  const { supabase, user, profile } = auth;

  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", input.contractId)
    .single();

  if (error || !contract) {
    return { ok: false as const, error: error?.message || "Contract not found." };
  }

  const status = normalizeContractStatus(contract.contract_status);
  if (status !== "Finalized" && status !== "Awaiting Client Signature") {
    return {
      ok: false as const,
      error: "Finalize the contract before sending for signature.",
    };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, client_name, contact_name, contact_email, customer_id")
    .eq("id", contract.client_id)
    .single();

  if (!client) {
    return { ok: false as const, error: "Client profile not found." };
  }

  if (!client.contact_name?.trim()) {
    return {
      ok: false as const,
      error: "Client profile needs a contact name (authorized signer) before sending.",
    };
  }

  const recipientEmail = (
    client.contact_email?.trim() ||
    input.overrideEmail?.trim() ||
    ""
  ).toLowerCase();

  if (!recipientEmail || !recipientEmail.includes("@")) {
    return {
      ok: false as const,
      error: "Client profile is missing a contact email. Enter an email to send this invitation.",
    };
  }

  if (!client.customer_id?.trim()) {
    return { ok: false as const, error: "Client is missing a Customer ID." };
  }

  let signerUserId: string | null = input.signerUserId || null;
  if (signerUserId) {
    const { data: link } = await supabase
      .from("client_user_links")
      .select("user_id")
      .eq("client_id", contract.client_id)
      .eq("user_id", signerUserId)
      .maybeSingle();
    if (!link) {
      return {
        ok: false as const,
        error: "Selected signer must be a linked client user for this organization.",
      };
    }
  }

  const { data: version } = await supabase
    .from("contract_versions")
    .select("*")
    .eq("contract_id", input.contractId)
    .eq("version_number", contract.current_version_number || 0)
    .maybeSingle();

  if (!version) {
    return { ok: false as const, error: "No finalized version found. Finalize first." };
  }

  if (version.status !== "Locked" && version.status !== "Draft") {
    // Finalize locks on send; Draft versions get locked below
  }

  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + (input.dueInDays ?? 7));
  const expires = new Date(Math.min(now.getTime() + 72 * 60 * 60 * 1000, due.getTime()));
  const nowIso = now.toISOString();
  const dueIso = due.toISOString();
  const expiresIso = expires.toISOString();

  // Supersede open requests and invalidate their invite codes
  const { data: openRequests } = await supabase
    .from("signature_requests")
    .select("id")
    .eq("contract_id", input.contractId)
    .in("status", ["Sent", "Viewed"]);

  for (const row of openRequests ?? []) {
    await supabase.rpc("invalidate_signing_invite_codes", {
      p_signature_request_id: row.id,
      p_status: "invalidated",
    });
  }

  await supabase
    .from("signature_requests")
    .update({ status: "Superseded", updated_at: nowIso })
    .eq("contract_id", input.contractId)
    .in("status", ["Sent", "Viewed"]);

  const { data: request, error: reqErr } = await supabase
    .from("signature_requests")
    .insert({
      client_id: contract.client_id,
      contract_id: input.contractId,
      contract_version_id: version.id,
      signer_user_id: signerUserId,
      sent_by: user.id,
      status: "Sent",
      sent_at: nowIso,
      due_at: dueIso,
      invite_expires_at: expiresIso,
      recipient_email: recipientEmail,
      agency_message: input.agencyMessage?.trim() || "",
      agreement_html_snapshot: version.snapshot_html || contract.agreement_html || "",
    })
    .select("id")
    .single();

  if (reqErr || !request) {
    return { ok: false as const, error: reqErr?.message || "Could not create signature request." };
  }

  await supabase
    .from("contract_versions")
    .update({ status: "Locked", locked_at: nowIso })
    .eq("id", version.id);

  await supabase
    .from("contracts")
    .update({
      contract_status: "Awaiting Client Signature",
      agreement_locked: true,
      updated_at: nowIso,
    })
    .eq("id", input.contractId);

  // Primary in-app path: notify linked signer when present
  if (signerUserId) {
    await supabase.from("notifications").insert({
      user_id: signerUserId,
      title: "Contract ready for signature",
      body: `${contract.contract_name} (${contract.contract_number}) is ready for your review and signature.`,
      href: `/app/contracts/${input.contractId}/sign`,
    });
  }

  const invite = await issueInviteAndEmail({
    supabase,
    userId: user.id,
    profile,
    requestId: request.id as string,
    contract: {
      id: contract.id,
      client_id: contract.client_id,
      contract_name: contract.contract_name,
      contract_number: contract.contract_number,
    },
    client: {
      client_name: client.client_name,
      contact_name: client.contact_name,
      contact_email: client.contact_email,
      customer_id: client.customer_id,
    },
    recipientEmail,
    dueAt: dueIso,
    expiresAt: expiresIso,
    replaceExisting: false,
  });

  if (!invite.ok) {
    return invite;
  }

  return {
    ...invite,
    href: signerUserId ? `/app/contracts/${input.contractId}/sign` : `/sign/access`,
  };
}

export async function resendSigningInvitation(input: { contractId: string }) {
  const auth = await requireStaff();
  if (!auth.ok || !auth.user || !auth.profile) {
    return { ok: false as const, error: auth.error };
  }
  const { supabase, user, profile } = auth;

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", input.contractId)
    .single();

  if (!contract) {
    return { ok: false as const, error: "Contract not found." };
  }

  const { data: request } = await supabase
    .from("signature_requests")
    .select("*")
    .eq("contract_id", input.contractId)
    .in("status", ["Sent", "Viewed"])
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request) {
    return { ok: false as const, error: "No open signature request to resend." };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, client_name, contact_name, contact_email, customer_id")
    .eq("id", contract.client_id)
    .single();

  if (!client) {
    return { ok: false as const, error: "Client profile not found." };
  }

  const recipientEmail = (
    request.recipient_email?.trim() ||
    client.contact_email?.trim() ||
    ""
  ).toLowerCase();

  if (!recipientEmail) {
    return { ok: false as const, error: "No recipient email on file for this invitation." };
  }

  const now = new Date();
  const dueAt = request.due_at ? new Date(request.due_at) : new Date(now.getTime() + 7 * 86400000);
  const expires = new Date(Math.min(now.getTime() + 72 * 60 * 60 * 1000, dueAt.getTime()));
  const expiresIso = expires.toISOString();

  return issueInviteAndEmail({
    supabase,
    userId: user.id,
    profile,
    requestId: request.id,
    contract: {
      id: contract.id,
      client_id: contract.client_id,
      contract_name: contract.contract_name,
      contract_number: contract.contract_number,
    },
    client: {
      client_name: client.client_name,
      contact_name: client.contact_name,
      contact_email: client.contact_email,
      customer_id: client.customer_id,
    },
    recipientEmail,
    dueAt: dueAt.toISOString(),
    expiresAt: expiresIso,
    replaceExisting: true,
  });
}

export async function verifySigningInviteAction(input: {
  customerId: string;
  accessCode: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_signing_invite", {
    p_customer_id: input.customerId.trim(),
    p_code: input.accessCode.trim(),
  });

  if (error) {
    return { ok: false as const, error: "invalid" as const, message: error.message };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    message?: string;
    session_token?: string;
    expires_at?: string;
    signature_request_id?: string;
  } | null;

  if (!payload?.ok || !payload.session_token || !payload.signature_request_id) {
    return {
      ok: false as const,
      error: (payload?.error || "invalid") as string,
      message: payload?.message || "The Customer ID or access code is incorrect.",
    };
  }

  await setSigningInviteCookie(payload.session_token, payload.expires_at || new Date(Date.now() + 30 * 60000));

  return {
    ok: true as const,
    requestId: payload.signature_request_id,
  };
}

export async function signContractViaInviteAction(input: {
  signerName: string;
  signerTitle: string;
  signatureData: string;
  authorizationConfirmed: boolean;
}) {
  const token = await getSigningInviteToken();
  if (!token) {
    return { ok: false as const, error: "Session expired. Enter your access code again." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("sign_contract_via_invite", {
    p_token: token,
    p_signer_name: input.signerName,
    p_signer_title: input.signerTitle,
    p_signature_data: input.signatureData,
    p_authorized: input.authorizationConfirmed,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false as const, error: payload?.error || "Could not sign." };
  }

  let postSignWelcome = null;
  try {
    const { processPostSignatureWelcomeFromInviteToken } = await import(
      "@/lib/post-signature-invite-welcome"
    );
    postSignWelcome =
      await processPostSignatureWelcomeFromInviteToken(token);
  } catch {
    // Signature remains valid even if welcome/activation email fails.
  }

  await clearSigningInviteCookie();
  return { ok: true as const, postSignWelcome };
}

export async function declineContractViaInviteAction(input: { reason?: string }) {
  const token = await getSigningInviteToken();
  if (!token) {
    return { ok: false as const, error: "Session expired. Enter your access code again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decline_contract_via_invite", {
    p_token: token,
    p_reason: input.reason || "",
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false as const, error: payload?.error || "Could not decline." };
  }

  await clearSigningInviteCookie();
  return { ok: true as const };
}

export async function getClientInviteContext(clientId: string) {
  const auth = await requireStaff();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const { data: client } = await auth.supabase
    .from("clients")
    .select("id, client_name, contact_name, contact_email, customer_id")
    .eq("id", clientId)
    .single();

  if (!client) {
    return { ok: false as const, error: "Client not found." };
  }

  return {
    ok: true as const,
    client: {
      id: client.id as string,
      clientName: client.client_name as string,
      contactName: (client.contact_name as string) || "",
      contactEmail: (client.contact_email as string) || "",
      customerId: (client.customer_id as string) || "",
    },
  };
}
