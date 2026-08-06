import type {
  CampaignStatusFilter,
  ContractStatusFilter,
  ExportFilters,
  InvoiceStatusFilter,
} from "@/lib/exports/types";

const CONTRACT_STATUS_MAP: Record<
  Exclude<ContractStatusFilter, "all">,
  string[]
> = {
  Active: ["Active"],
  Completed: ["Completed", "Expired", "Canceled"],
  Pending: [
    "Draft",
    "Ready for Signature",
    "Awaiting Client Signature",
    "Awaiting Agency Signature",
    "Finalized",
    "Pending Renewal",
  ],
  Expired: ["Expired"],
};

const INVOICE_STATUS_MAP: Record<
  Exclude<InvoiceStatusFilter, "all">,
  string[]
> = {
  Paid: ["Paid"],
  Pending: ["Draft", "Sent", "Partially Paid"],
  Overdue: ["Overdue"],
  Disputed: ["Disputed"],
};

const CAMPAIGN_STATUS_MAP: Record<
  Exclude<CampaignStatusFilter, "all">,
  string[]
> = {
  Planning: ["Planned"],
  Active: ["Active", "Late", "On Hold"],
  Completed: ["Completed", "Canceled"],
};

export function matchesContractStatus(
  dbStatus: string,
  filter: ContractStatusFilter | undefined,
) {
  if (!filter || filter === "all") return true;
  return CONTRACT_STATUS_MAP[filter]?.includes(dbStatus) ?? false;
}

export function matchesInvoiceStatus(
  dbStatus: string,
  filter: InvoiceStatusFilter | undefined,
) {
  if (!filter || filter === "all") return true;
  return INVOICE_STATUS_MAP[filter]?.includes(dbStatus) ?? false;
}

export function matchesCampaignStatus(
  dbStatus: string,
  filter: CampaignStatusFilter | undefined,
) {
  if (!filter || filter === "all") return true;
  return CAMPAIGN_STATUS_MAP[filter]?.includes(dbStatus) ?? false;
}

/** Inclusive date range on YYYY-MM-DD (or ISO) strings. */
export function inDateRange(
  dateStr: string | null | undefined,
  filters: ExportFilters | undefined,
) {
  if (!dateStr) return !(filters?.dateFrom || filters?.dateTo);
  const d = dateStr.slice(0, 10);
  if (filters?.dateFrom && d < filters.dateFrom) return false;
  if (filters?.dateTo && d > filters.dateTo) return false;
  return true;
}

export function matchesClientId(
  clientId: string | null | undefined,
  filters: ExportFilters | undefined,
) {
  if (!filters?.clientId) return true;
  return clientId === filters.clientId;
}
