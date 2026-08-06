import { normalizeContractStatus } from "@/lib/contract-status";

export type OpenSignatureRequest = {
  id: string;
  contract_id: string;
  client_id: string;
  status: string;
  signer_user_id: string | null;
  sent_at: string | null;
  due_at: string | null;
  viewed_at: string | null;
  agency_message: string | null;
  agreement_html_snapshot: string | null;
  contract_version_id: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any };

/**
 * Open Sent/Viewed signature request a linked client portal user may act on.
 * Any portal user linked to the contract's client may sign (not only the assigned signer).
 */
export async function getOpenSignatureRequestForClientUser(
  supabase: AnySupabase,
  contractId: string,
  userId: string,
): Promise<OpenSignatureRequest | null> {
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_id, contract_status")
    .eq("id", contractId)
    .maybeSingle();

  if (!contract) return null;

  const { data: link } = await supabase
    .from("client_user_links")
    .select("user_id")
    .eq("client_id", contract.client_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!link) return null;

  const { data: request } = await supabase
    .from("signature_requests")
    .select(
      "id, contract_id, client_id, status, signer_user_id, sent_at, due_at, viewed_at, agency_message, agreement_html_snapshot, contract_version_id",
    )
    .eq("contract_id", contractId)
    .in("status", ["Sent", "Viewed"])
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request) return null;

  return {
    id: String(request.id),
    contract_id: String(request.contract_id),
    client_id: String(request.client_id),
    status: String(request.status),
    signer_user_id: (request.signer_user_id as string | null) ?? null,
    sent_at: (request.sent_at as string | null) ?? null,
    due_at: (request.due_at as string | null) ?? null,
    viewed_at: (request.viewed_at as string | null) ?? null,
    agency_message: (request.agency_message as string | null) ?? null,
    agreement_html_snapshot:
      (request.agreement_html_snapshot as string | null) ?? null,
    contract_version_id: (request.contract_version_id as string | null) ?? null,
  };
}

/** Whether this client user may open Review & Sign for the contract. */
export async function clientUserCanSignContract(
  supabase: AnySupabase,
  contractId: string,
  userId: string,
  contractStatus?: string | null,
): Promise<boolean> {
  let status = contractStatus
    ? normalizeContractStatus(contractStatus)
    : null;
  if (!status) {
    const { data: contract } = await supabase
      .from("contracts")
      .select("contract_status")
      .eq("id", contractId)
      .maybeSingle();
    if (!contract) return false;
    status = normalizeContractStatus(String(contract.contract_status));
  }
  if (status !== "Awaiting Client Signature") return false;
  const request = await getOpenSignatureRequestForClientUser(
    supabase,
    contractId,
    userId,
  );
  return Boolean(request);
}

/**
 * Map of contract_id → open request eligible for this linked client user.
 * Loads open requests for the user's linked clients (any assigned signer).
 */
export async function getOpenSignatureRequestsByContractForClientUser(
  supabase: AnySupabase,
  userId: string,
  contracts: { id: string; client_id: string; contract_status: string }[],
): Promise<Map<string, OpenSignatureRequest>> {
  const result = new Map<string, OpenSignatureRequest>();
  if (!contracts.length) return result;

  const { data: links } = await supabase
    .from("client_user_links")
    .select("client_id")
    .eq("user_id", userId);
  const linkedClientIds = new Set(
    (links ?? []).map((l) => String(l.client_id)),
  );
  if (linkedClientIds.size === 0) return result;

  const eligibleContractIds = contracts
    .filter(
      (c) =>
        linkedClientIds.has(String(c.client_id)) &&
        normalizeContractStatus(c.contract_status) ===
          "Awaiting Client Signature",
    )
    .map((c) => String(c.id));

  if (!eligibleContractIds.length) return result;

  const { data: requests } = await supabase
    .from("signature_requests")
    .select(
      "id, contract_id, client_id, status, signer_user_id, sent_at, due_at, viewed_at, agency_message, agreement_html_snapshot, contract_version_id",
    )
    .in("contract_id", eligibleContractIds)
    .in("status", ["Sent", "Viewed"])
    .order("sent_at", { ascending: false });

  for (const request of requests ?? []) {
    const contractId = String(request.contract_id);
    if (result.has(contractId)) continue;
    result.set(contractId, {
      id: String(request.id),
      contract_id: contractId,
      client_id: String(request.client_id),
      status: String(request.status),
      signer_user_id: (request.signer_user_id as string | null) ?? null,
      sent_at: (request.sent_at as string | null) ?? null,
      due_at: (request.due_at as string | null) ?? null,
      viewed_at: (request.viewed_at as string | null) ?? null,
      agency_message: (request.agency_message as string | null) ?? null,
      agreement_html_snapshot:
        (request.agreement_html_snapshot as string | null) ?? null,
      contract_version_id:
        (request.contract_version_id as string | null) ?? null,
    });
  }

  return result;
}
