import { generateAccessCodeMaterial } from "@/lib/signing-invite-crypto";
import { sendEmail } from "@/lib/email/send-email";
import {
  buildPostSignThanksEmail,
  buildWelcomeActivationEmail,
} from "@/lib/email/welcome-activation-template";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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

export type PostSignWelcomeResult =
  | {
      ok: true;
      kind: "thanks" | "activation" | "skipped";
      deliveryStatus?: "sent" | "simulated" | "failed";
      recipientEmail?: string;
      simulatedPreview?: { subject: string; text: string; activationCode?: string } | null;
      deliveryError?: string | null;
    }
  | { ok: false; error: string };

/**
 * After client signature: thank-you if portal already active / Auth email exists;
 * otherwise issue one-time dashboard activation (hash only) + welcome email.
 * Never changes contract to Fully Executed / Active.
 */
export async function processPostSignatureWelcome(input: {
  signatureRequestId: string;
  agencyContactName?: string;
  agencyContactEmail?: string;
  createdBy?: string | null;
}): Promise<PostSignWelcomeResult> {
  const supabase = await createClient();
  return processPostSignatureWelcomeWithClient(supabase, input);
}

export async function processPostSignatureWelcomeWithClient(
  supabase: SupabaseClient,
  input: {
    signatureRequestId: string;
    agencyContactName?: string;
    agencyContactEmail?: string;
    createdBy?: string | null;
  },
): Promise<PostSignWelcomeResult> {
  const { data: request, error: reqErr } = await supabase
    .from("signature_requests")
    .select(
      "id, client_id, contract_id, contract_version_id, status, signed_at, client_signer_name",
    )
    .eq("id", input.signatureRequestId)
    .single();

  if (reqErr || !request) {
    return { ok: false, error: reqErr?.message || "Signature request not found." };
  }

  if (!request.signed_at) {
    return { ok: false, error: "Signature request is not signed yet." };
  }

  // Do not require a specific status string beyond signed — signature remains valid regardless of activation.
  const { data: client } = await supabase
    .from("clients")
    .select("id, client_name, contact_name, contact_email, customer_id, portal_status")
    .eq("id", request.client_id)
    .single();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, contract_name, contract_number, contract_status")
    .eq("id", request.contract_id)
    .single();

  if (!client || !contract) {
    return { ok: false, error: "Client or contract not found." };
  }

  const recipientEmail = (client.contact_email || "").trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes("@")) {
    return {
      ok: false,
      error: "Client profile is missing a contact email for the welcome message.",
    };
  }

  // Prefer admin writer for audit rows when post-sign runs without a staff session (invite path).
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const writer = admin ?? supabase;

  const agencyContactName = input.agencyContactName?.trim() || "Account Manager";
  const agencyContactEmail =
    input.agencyContactEmail?.trim() || AGENCY_FALLBACK_EMAIL;
  const loginLink = `${appBaseUrl()}/login?portal=client`;

  const { data: hasLink } = await supabase.rpc("client_has_active_portal_link", {
    p_client_id: client.id,
  });

  const { data: emailRegistered } = await supabase.rpc("auth_email_registered", {
    p_email: recipientEmail,
  });

  const alreadyActive = Boolean(hasLink) || Boolean(emailRegistered);

  if (alreadyActive) {
    const content = buildPostSignThanksEmail({
      clientContactFirstName: client.contact_name || client.client_name,
      clientBusinessName: client.client_name,
      contractName: contract.contract_name,
      customerId: client.customer_id,
      loginLink,
      agencyName: AGENCY_NAME,
      agencyContactName,
      agencyContactEmail,
    });

    const delivery = await sendEmail({
      to: recipientEmail,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    const deliveryStatus =
      delivery.mode === "sent" ? "sent" : delivery.mode === "failed" ? "failed" : "simulated";

    await writer.from("portal_notifications").insert({
      client_id: client.id,
      contract_id: contract.id,
      signature_request_id: request.id,
      notification_type: "post_sign_thanks",
      recipient_email: recipientEmail,
      subject: content.subject,
      body: content.text,
      payload: {
        delivery_status: deliveryStatus,
        login_link: loginLink,
        reason: hasLink ? "client_user_link" : "auth_email_exists",
      },
      created_by: input.createdBy || null,
      delivery_status: deliveryStatus,
      sent_at: new Date().toISOString(),
      error_message: delivery.mode === "failed" ? delivery.error : null,
    });

    return {
      ok: true,
      kind: "thanks",
      deliveryStatus,
      recipientEmail,
      simulatedPreview:
        deliveryStatus === "simulated"
          ? { subject: content.subject, text: content.text }
          : null,
      deliveryError: delivery.mode === "failed" ? delivery.error : null,
    };
  }

  // Issue one-time activation token (hash only)
  const { salt, code, hash } = generateAccessCodeMaterial();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { data: issued, error: issueErr } = await supabase.rpc("issue_dashboard_activation", {
    p_client_id: client.id,
    p_intended_email: recipientEmail,
    p_token_hash: hash,
    p_token_salt: salt,
    p_expires_at: expiresAt,
    p_signature_request_id: request.id,
    p_created_by: input.createdBy || null,
    p_replace_existing: true,
  });

  if (issueErr) {
    return { ok: false, error: issueErr.message };
  }

  const issuePayload = issued as {
    ok?: boolean;
    error?: string;
    already_active?: boolean;
  } | null;

  if (!issuePayload?.ok) {
    if (issuePayload?.already_active) {
      return {
        ok: true,
        kind: "thanks",
        recipientEmail,
      };
    }
    return { ok: false, error: issuePayload?.error || "Could not issue activation." };
  }

  const activationLink = `${appBaseUrl()}/activate`;
  const content = buildWelcomeActivationEmail({
    clientContactFirstName: client.contact_name || client.client_name,
    clientBusinessName: client.client_name,
    contractName: contract.contract_name,
    customerId: client.customer_id,
    activationLink,
    activationCode: code,
    expirationDate: formatDate(expiresAt),
    agencyName: AGENCY_NAME,
    agencyContactName,
    agencyContactEmail,
  });

  const delivery = await sendEmail({
    to: recipientEmail,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  const deliveryStatus =
    delivery.mode === "sent" ? "sent" : delivery.mode === "failed" ? "failed" : "simulated";

  const safeBody = content.text.replace(code, "[REDACTED]");

  await writer.from("portal_notifications").insert({
    client_id: client.id,
    contract_id: contract.id,
    signature_request_id: request.id,
    notification_type: "dashboard_activation",
    recipient_email: recipientEmail,
    subject: content.subject,
    body: safeBody,
    payload: {
      delivery_status: deliveryStatus,
      invite_expires_at: expiresAt,
      activation_link: activationLink,
      // never store plaintext code
    },
    created_by: input.createdBy || null,
    delivery_status: deliveryStatus,
    sent_at: new Date().toISOString(),
    error_message: delivery.mode === "failed" ? delivery.error : null,
  });

  return {
    ok: true,
    kind: "activation",
    deliveryStatus,
    recipientEmail,
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
