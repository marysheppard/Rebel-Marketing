import type { CampaignBoardItem } from "@/components/CampaignsBoard";
import {
  downloadTableExport,
  type TableExportFormat,
} from "@/lib/exports/table-export";

export type CampaignExportFilters = {
  clientId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

const HEADERS = [
  "Campaign",
  "Client",
  "Type",
  "Status",
  "Start Date",
  "End Date",
  "Budget",
  "Spent",
  "Remaining",
  "Health",
] as const;

function inDateRange(start: string, end: string, from?: string, to?: string) {
  if (from && end && end < from) return false;
  if (to && start && start > to) return false;
  if (from && !end && start && start < from) return false;
  if (to && !start && end && end > to) return false;
  return true;
}

export function filterCampaignsForExport(
  items: CampaignBoardItem[],
  filters: CampaignExportFilters,
): CampaignBoardItem[] {
  return items.filter((c) => {
    if (filters.clientId && c.client_id !== filters.clientId) return false;
    if (filters.status && c.campaign_status !== filters.status) return false;
    if (
      !inDateRange(c.start_date, c.end_date, filters.dateFrom, filters.dateTo)
    ) {
      return false;
    }
    return true;
  });
}

export function downloadCampaignOverviewExport(
  items: CampaignBoardItem[],
  filters: CampaignExportFilters,
  format: TableExportFormat,
) {
  const filtered = filterCampaignsForExport(items, filters);
  const rows = filtered.map((c) => ({
    Campaign: c.campaign_name,
    Client: c.client_name,
    Type: c.campaign_type || "—",
    Status: c.campaign_status,
    "Start Date": c.start_date || "—",
    "End Date": c.end_date || "—",
    Budget: c.budget.toFixed(2),
    Spent: c.spent.toFixed(2),
    Remaining: c.remaining.toFixed(2),
    Health:
      c.health === "over"
        ? "Over budget"
        : c.health === "near"
          ? "Near budget"
          : c.health === "under"
            ? "Under budget"
            : "No budget",
  }));
  return downloadTableExport(
    "Campaign Overview",
    [...HEADERS],
    rows,
    "campaign-overview",
    format,
  );
}
