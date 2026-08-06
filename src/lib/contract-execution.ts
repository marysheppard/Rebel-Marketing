"use client";

import { activateEngagement } from "@/lib/activate-engagement";
import { normalizeContractStatus } from "@/lib/contract-status";
import { createClient } from "@/lib/supabase/client";
import type { Contract } from "@/lib/types";

export type LinkedSigner = {
  user_id: string;
  full_name: string;
  email: string;
  preferred: boolean;
};

function termsSnapshot(contract: Record<string, unknown>) {
  return {
    contract_name: contract.contract_name,
    contract_number: contract.contract_number,
    billing_method: contract.billing_method,
    monthly_retainer: contract.monthly_retainer,
    project_fee: contract.project_fee,
    campaign_budget: contract.campaign_budget,
    payment_terms: contract.payment_terms,
    service_types: contract.service_types,
    deliverables: contract.deliverables,
    included_agency_hours: contract.included_agency_hours,
    overage_hourly_rate: contract.overage_hourly_rate,
    advertising_spend_treatment: contract.advertising_spend_treatment,
    pass_through_markup_pct: contract.pass_through_markup_pct,
    spending_approval_threshold: contract.spending_approval_threshold,
    renewal_option: contract.renewal_option,
    cancellation_notice_days: contract.cancellation_notice_days,
    start_date: contract.start_date,
    end_date: contract.end_date,
  };
}

function appendSignatureBlock(
  html: string,
  party: "client" | "agency",
  opts: { name: string; title: string; company: string; signedAt: string; signatureData: string },
) {
  const label = party === "client" ? "Client" : "Agency (Rebel Marketing)";
  const block = `
<section data-signature="${party}" style="margin-top:1.5rem;padding:1rem;border:1px solid #cbd5e1;border-radius:8px;">
  <h3 style="margin:0 0 0.5rem;">${label} signature</h3>
  <p style="margin:0.25rem 0;"><strong>Name:</strong> ${escapeHtml(opts.name)}</p>
  <p style="margin:0.25rem 0;"><strong>Title:</strong> ${escapeHtml(opts.title || "—")}</p>
  <p style="margin:0.25rem 0;"><strong>Company:</strong> ${escapeHtml(opts.company || "—")}</p>
  <p style="margin:0.25rem 0;font-family:cursive;font-size:1.35rem;">${escapeHtml(opts.signatureData)}</p>
  <p style="margin:0.25rem 0;"><strong>Signed at:</strong> ${escapeHtml(opts.signedAt)}</p>
</section>`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${block}</body>`);
  }
  return `${html}${block}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function listLinkedSigners(clientId: string): Promise<LinkedSigner[]> {
  const supabase = createClient();
  const [{ data: links, error: linkErr }, { data: client }] = await Promise.all([
    supabase
      .from("client_user_links")
      .select("user_id")
      .eq("client_id", clientId),
    supabase
      .from("clients")
      .select("contact_email, contact_name")
      .eq("id", clientId)
      .single(),
  ]);

  if (linkErr) {
    console.error("listLinkedSigners links error", linkErr);
    return [];
  }

  const userIds = (links ?? []).map((row) => String(row.user_id));
  if (userIds.length === 0) return [];

  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (profileErr) {
    console.error("listLinkedSigners profiles error", profileErr);
  }

  const byId = new Map(
    (profiles ?? []).map((p) => [String(p.id), p as { id: string; full_name?: string; email?: string }]),
  );
  const primaryEmail = (client?.contact_email || "").trim().toLowerCase();

  return userIds.map((userId) => {
    const profile = byId.get(userId);
    const email = profile?.email || "";
    return {
      user_id: userId,
      full_name: profile?.full_name || email || "Linked user",
      email,
      preferred: !!primaryEmail && email.trim().toLowerCase() === primaryEmail,
    };
  });
}

export async function finalizeContract(contractId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "account_manager") {
    return {
      ok: false as const,
      error: "Only an account manager can finalize a contract.",
    };
  }

  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .single();

  if (error || !contract) {
    return { ok: false as const, error: error?.message || "Contract not found." };
  }

  const status = normalizeContractStatus(contract.contract_status);
  if (!["Draft", "Finalized", "Client Declined"].includes(status)) {
    return {
      ok: false as const,
      error: `Cannot finalize from status “${contract.contract_status}”.`,
    };
  }
  if (!String(contract.agreement_html || "").trim()) {
    return { ok: false as const, error: "Generate the agreement document before finalizing." };
  }
  if (contract.agreement_locked && status !== "Client Declined") {
    return { ok: false as const, error: "This agreement is locked." };
  }

  const nextVersion = Number(contract.current_version_number || 0) + 1;
  const now = new Date().toISOString();

  // Supersede prior draft/locked versions when revising after decline
  if (status === "Client Declined") {
    await supabase
      .from("contract_versions")
      .update({ status: "Superseded" })
      .eq("contract_id", contractId)
      .in("status", ["Draft", "Locked"]);
    await supabase
      .from("signature_requests")
      .update({ status: "Superseded", updated_at: now })
      .eq("contract_id", contractId)
      .in("status", ["Sent", "Viewed", "Declined"]);
  }

  const { data: version, error: verErr } = await supabase
    .from("contract_versions")
    .insert({
      contract_id: contractId,
      version_number: nextVersion,
      snapshot_html: contract.agreement_html,
      terms_snapshot: termsSnapshot(contract),
      status: "Draft",
      created_by: user.id,
      finalized_at: now,
    })
    .select("id")
    .single();

  if (verErr || !version) {
    return { ok: false as const, error: verErr?.message || "Could not create version." };
  }

  const { error: updErr } = await supabase
    .from("contracts")
    .update({
      contract_status: "Finalized",
      current_version_number: nextVersion,
      finalized_at: now,
      finalized_by: user.id,
      agreement_locked: false,
      updated_at: now,
    })
    .eq("id", contractId);

  if (updErr) return { ok: false as const, error: updErr.message };
  return { ok: true as const, versionId: version.id as string, versionNumber: nextVersion };
}

export async function sendForSignature(input: {
  contractId: string;
  signerUserId: string;
  agencyMessage?: string;
  dueInDays?: number;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!senderProfile || senderProfile.role !== "account_manager") {
    return {
      ok: false as const,
      error: "Only an account manager can send a contract for signature.",
    };
  }

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

  const { data: link } = await supabase
    .from("client_user_links")
    .select("user_id")
    .eq("client_id", contract.client_id)
    .eq("user_id", input.signerUserId)
    .maybeSingle();

  if (!link) {
    return {
      ok: false as const,
      error:
        "This client does not have an active portal account. Create or activate a client user before sending the agreement.",
    };
  }

  const { data: signerProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", input.signerUserId)
    .maybeSingle();

  if (!signerProfile || signerProfile.role !== "client") {
    return {
      ok: false as const,
      error:
        "This client does not have an active portal account. Create or activate a client user before sending the agreement.",
    };
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

  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + (input.dueInDays ?? 7));
  const nowIso = now.toISOString();

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
      signer_user_id: input.signerUserId,
      sent_by: user.id,
      status: "Sent",
      sent_at: nowIso,
      due_at: due.toISOString(),
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

  const href = `/app/contracts/${input.contractId}/sign`;
  await supabase.from("notifications").insert({
    user_id: input.signerUserId,
    title: "Contract ready for signature",
    body: `${contract.contract_name} (${contract.contract_number}) is ready for your review and signature.`,
    href,
  });

  return {
    ok: true as const,
    requestId: request.id as string,
    href,
  };
}

export async function markSignatureViewed(contractId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  const { data: request } = await supabase
    .from("signature_requests")
    .select("id, status")
    .eq("contract_id", contractId)
    .eq("signer_user_id", user.id)
    .in("status", ["Sent", "Viewed"])
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request || request.status !== "Sent") return { ok: true as const };

  const now = new Date().toISOString();
  await supabase
    .from("signature_requests")
    .update({ status: "Viewed", viewed_at: now, updated_at: now })
    .eq("id", request.id);

  return { ok: true as const };
}

export async function signAsClient(input: {
  contractId: string;
  signerName: string;
  signerTitle: string;
  signatureData: string;
  authorizationConfirmed: boolean;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  if (!input.authorizationConfirmed) {
    return { ok: false as const, error: "Confirm you are authorized to sign." };
  }
  if (!input.signerName.trim() || !input.signatureData.trim()) {
    return { ok: false as const, error: "Name and typed signature are required." };
  }

  const { data, error } = await supabase.rpc("sign_contract_as_client", {
    p_contract_id: input.contractId,
    p_signer_name: input.signerName.trim(),
    p_signer_title: input.signerTitle.trim(),
    p_signature_data: input.signatureData.trim(),
    p_authorized: input.authorizationConfirmed,
  });

  if (error) return { ok: false as const, error: error.message };
  const result = (data ?? {}) as { ok?: boolean; error?: string };
  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error || "Could not sign agreement.",
    };
  }
  return { ok: true as const };
}

/** In-app alert for agency managers after the assigned client signs. */
export async function notifyAgencyAfterClientSignature(contractId: string) {
  const supabase = createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, contract_name, contract_number")
    .eq("id", contractId)
    .single();
  if (!contract) return { ok: false as const };

  const { data: managers } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "agency_manager");

  const rows = (managers ?? []).map((m) => ({
    user_id: m.id,
    title: "Contract ready for countersignature",
    body: `${contract.contract_name} (${contract.contract_number}) was signed by the client and needs your review and countersignature.`,
    href: `/app/contracts/${contractId}`,
  }));

  if (rows.length > 0) {
    await supabase.from("notifications").insert(rows);
  }

  return { ok: true as const };
}

export async function declineAsClient(input: {
  contractId: string;
  reason: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const { data, error } = await supabase.rpc("decline_contract_as_client", {
    p_contract_id: input.contractId,
    p_reason: input.reason.trim(),
  });

  if (error) return { ok: false as const, error: error.message };
  const result = (data ?? {}) as { ok?: boolean; error?: string };
  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error || "Could not decline agreement.",
    };
  }
  return { ok: true as const };
}

export async function countersignAsAgency(input: {
  contractId: string;
  signerName: string;
  signerTitle: string;
  signatureData: string;
  authorizationConfirmed: boolean;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  if (!input.authorizationConfirmed) {
    return { ok: false as const, error: "Confirm you are authorized to countersign." };
  }
  if (!input.signerName.trim() || !input.signatureData.trim()) {
    return { ok: false as const, error: "Name and typed signature are required." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "agency_manager") {
    return {
      ok: false as const,
      error: "Only an agency manager can countersign.",
    };
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", input.contractId)
    .single();

  if (!contract) return { ok: false as const, error: "Contract not found." };

  const status = normalizeContractStatus(contract.contract_status);
  if (status !== "Awaiting Agency Signature") {
    return {
      ok: false as const,
      error: "Contract must be client-signed before countersignature.",
    };
  }

  const { data: request } = await supabase
    .from("signature_requests")
    .select("*")
    .eq("contract_id", input.contractId)
    .in("status", ["Awaiting Agency", "Client Signed"])
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request?.contract_version_id) {
    return { ok: false as const, error: "No signature request awaiting agency." };
  }

  const now = new Date().toISOString();

  const { error: sigErr } = await supabase.from("contract_signatures").insert({
    signature_request_id: request.id,
    contract_id: input.contractId,
    contract_version_id: request.contract_version_id,
    signer_type: "agency",
    signer_user_id: user.id,
    signer_name: input.signerName.trim(),
    signer_title: input.signerTitle.trim(),
    signer_company: "Rebel Marketing",
    method: "typed",
    signature_data: input.signatureData.trim(),
    authorization_confirmed: true,
    signed_at: now,
  });

  if (sigErr) return { ok: false as const, error: sigErr.message };

  const executedHtml = appendSignatureBlock(
    request.agreement_html_snapshot || contract.signed_agreement_html || contract.agreement_html || "",
    "agency",
    {
      name: input.signerName.trim(),
      title: input.signerTitle.trim(),
      company: "Rebel Marketing",
      signedAt: now,
      signatureData: input.signatureData.trim(),
    },
  );

  await supabase
    .from("signature_requests")
    .update({
      status: "Fully Executed",
      agency_signer_id: user.id,
      agency_signer_name: input.signerName.trim(),
      agency_signed_at: now,
      agreement_html_snapshot: executedHtml,
      updated_at: now,
    })
    .eq("id", request.id);

  await supabase
    .from("contract_versions")
    .update({ status: "Fully Executed" })
    .eq("id", request.contract_version_id);

  await supabase
    .from("contracts")
    .update({
      contract_status: "Fully Executed",
      fully_executed_at: now,
      agency_signed_at: now,
      agency_signer_id: user.id,
      agency_signer_name: input.signerName.trim(),
      agreement_locked: true,
      signed_agreement_html: executedHtml,
      agreement_html: executedHtml,
      updated_at: now,
    })
    .eq("id", input.contractId);

  if (request.signer_user_id) {
    await supabase.from("notifications").insert({
      user_id: request.signer_user_id,
      title: "Agreement fully executed",
      body: `${contract.contract_name} is fully executed. Engagement can now proceed.`,
      href: `/app/contracts/documents`,
    });
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("account_manager_id")
    .eq("id", contract.client_id)
    .maybeSingle();
  const accountManagerId = clientRow?.account_manager_id as string | null;
  if (accountManagerId) {
    await supabase.from("notifications").insert({
      user_id: accountManagerId,
      title: "Agreement fully executed",
      body: `${contract.contract_name} (${contract.contract_number}) was countersigned. You can continue with this client and contract.`,
      href: `/app/contracts/${input.contractId}`,
    });
  }

  const engagement = await activateEngagement(supabase, {
    ...(contract as Contract),
    contract_status: "Fully Executed",
  });

  // Move to Active after successful engagement sync when possible
  await supabase
    .from("contracts")
    .update({
      contract_status: "Active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contractId);

  return {
    ok: true as const,
    campaignId: engagement.campaignId,
    invoiceId: engagement.invoiceId,
    engagementError: engagement.error,
  };
}

export async function reviseAfterDecline(contractId: string) {
  // Unlock for builder edits; finalize creates the next version
  const supabase = createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("contract_status")
    .eq("id", contractId)
    .single();

  if (!contract || normalizeContractStatus(contract.contract_status) !== "Client Declined") {
    return { ok: false as const, error: "Only declined contracts can start a revision this way." };
  }

  const now = new Date().toISOString();
  await supabase
    .from("signature_requests")
    .update({ status: "Superseded", updated_at: now })
    .eq("contract_id", contractId)
    .in("status", ["Sent", "Viewed", "Declined"]);
  await supabase
    .from("contracts")
    .update({
      contract_status: "Draft",
      agreement_locked: false,
      updated_at: now,
    })
    .eq("id", contractId);

  return { ok: true as const };
}
