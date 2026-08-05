import { sendEmail } from "@/lib/email/send-email";
import {
  buildPostSignThanksEmail,
  buildWelcomeActivationEmail,
} from "@/lib/email/welcome-activation-template";
import { generateAccessCodeMaterial } from "@/lib/signing-invite-crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PostSignWelcomeResult } from "@/lib/post-signature-welcome";

const AGENCY_NAME = "Rebel Marketing";
const AGENCY_EMAIL = "hello@rebel.demo";

type InviteContext = {
  ok?: boolean;
  signature_request_id?: string;
  client_id?: string;
  contract_id?: string;
  client_name?: string;
  contact_name?: string;
  contact_email?: string;
  customer_id?: string;
  contract_name?: string;
};

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`
      : "http://localhost:3001")
  );
}

function deliveryStatus(mode: "sent" | "simulated" | "failed") {
  return mode;
}

/**
 * Uses the just-consumed, request-scoped signing token as proof.
 * The signing token remains dashboard-inert; it only authorizes issuing one
 * separate dashboard activation record after a successful signature.
 */
export async function processPostSignatureWelcomeFromInviteToken(
  signingToken: string,
): Promise<PostSignWelcomeResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_post_sign_invite_context", {
    p_token: signingToken,
  });
  const context = data as InviteContext | null;

  if (error || !context?.ok) {
    return {
      ok: false,
      error: error?.message || "Post-signature proof is invalid or expired.",
    };
  }

  const clientId = context.client_id || "";
  const requestId = context.signature_request_id || "";
  const contractId = context.contract_id || "";
  const recipientEmail = (context.contact_email || "").trim().toLowerCase();
  if (!clientId || !requestId || !recipientEmail.includes("@")) {
    return { ok: false, error: "Signed request is missing client email details." };
  }

  const [{ data: hasLink }, { data: registered }] = await Promise.all([
    supabase.rpc("client_has_active_portal_link", { p_client_id: clientId }),
    supabase.rpc("auth_email_registered", { p_email: recipientEmail }),
  ]);
  const writer = createAdminClient();

  if (hasLink || registered) {
    const content = buildPostSignThanksEmail({
      clientContactFirstName:
        context.contact_name || context.client_name || "there",
      clientBusinessName: context.client_name || "your organization",
      contractName: context.contract_name || "your agreement",
      customerId: context.customer_id || "",
      loginLink: `${baseUrl()}/login?portal=client`,
      agencyName: AGENCY_NAME,
      agencyContactName: "Account Manager",
      agencyContactEmail: AGENCY_EMAIL,
    });
    const delivery = await sendEmail({
      to: recipientEmail,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    const status = deliveryStatus(delivery.mode);

    if (writer) {
      await writer.from("portal_notifications").insert({
        client_id: clientId,
        contract_id: contractId,
        signature_request_id: requestId,
        notification_type: "post_sign_thanks",
        recipient_email: recipientEmail,
        subject: content.subject,
        body: content.text,
        payload: { delivery_status: status },
        delivery_status: status,
        sent_at: new Date().toISOString(),
        error_message: delivery.mode === "failed" ? delivery.error : null,
      });
    }

    return {
      ok: true,
      kind: "thanks",
      deliveryStatus: status,
      recipientEmail,
      simulatedPreview:
        status === "simulated"
          ? { subject: content.subject, text: content.text }
          : null,
      deliveryError: delivery.mode === "failed" ? delivery.error : null,
    };
  }

  const { code, hash, salt } = generateAccessCodeMaterial();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const { data: issued, error: issueError } = await supabase.rpc(
    "issue_dashboard_activation_after_invite",
    {
      p_signing_token: signingToken,
      p_token_hash: hash,
      p_token_salt: salt,
      p_expires_at: expiresAt,
    },
  );
  const issue = issued as
    | { ok?: boolean; error?: string; already_active?: boolean }
    | null;
  if (issueError || !issue?.ok) {
    return {
      ok: false,
      error:
        issueError?.message ||
        issue?.error ||
        "Could not issue dashboard activation.",
    };
  }

  const content = buildWelcomeActivationEmail({
    clientContactFirstName:
      context.contact_name || context.client_name || "there",
    clientBusinessName: context.client_name || "your organization",
    contractName: context.contract_name || "your agreement",
    customerId: context.customer_id || "",
    activationLink: `${baseUrl()}/activate`,
    activationCode: code,
    expirationDate: new Date(expiresAt).toLocaleString(),
    agencyName: AGENCY_NAME,
    agencyContactName: "Account Manager",
    agencyContactEmail: AGENCY_EMAIL,
  });
  const delivery = await sendEmail({
    to: recipientEmail,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
  const status = deliveryStatus(delivery.mode);

  if (writer) {
    await writer.from("portal_notifications").insert({
      client_id: clientId,
      contract_id: contractId,
      signature_request_id: requestId,
      notification_type: "dashboard_activation",
      recipient_email: recipientEmail,
      subject: content.subject,
      body: content.text.replace(code, "[REDACTED]"),
      payload: {
        delivery_status: status,
        invite_expires_at: expiresAt,
        activation_link: `${baseUrl()}/activate`,
      },
      delivery_status: status,
      sent_at: new Date().toISOString(),
      error_message: delivery.mode === "failed" ? delivery.error : null,
    });
  }

  return {
    ok: true,
    kind: "activation",
    deliveryStatus: status,
    recipientEmail,
    simulatedPreview:
      status === "simulated"
        ? {
            subject: content.subject,
            text: content.text,
            activationCode: code,
          }
        : null,
    deliveryError: delivery.mode === "failed" ? delivery.error : null,
  };
}
