export const EXECUTION_STATUSES = [
  "Draft",
  "Finalized",
  "Awaiting Client Signature",
  "Awaiting Agency Signature",
  "Fully Executed",
  "Client Declined",
  "Active",
  "Pending Renewal",
  "Expired",
  "Canceled",
] as const;

export function normalizeContractStatus(status: string): string {
  if (status === "Ready for Signature") return "Finalized";
  if (status === "Client Signed — Awaiting Agency Signature") {
    return "Awaiting Agency Signature";
  }
  return status;
}
