import type { PtoItem, TimeEntryItem } from "@/components/TimePtoBoard";
import {
  downloadTableExport,
  type TableExportFormat,
} from "@/lib/exports/table-export";

export type TimePtoExportKind = "time" | "pto" | "both";

export type TimePtoExportFilters = {
  kind: TimePtoExportKind;
  dateFrom?: string;
  dateTo?: string;
  campaignId?: string;
  approvalStatus?: string;
  ptoStatus?: string;
};

const TIME_HEADERS = [
  "Date",
  "Campaign",
  "Task",
  "Type",
  "Hours",
  "Billable",
  "Retainer Bucket",
  "Out of Scope",
  "Approval",
  "Logged By",
  "Description",
] as const;

const PTO_HEADERS = [
  "Start Date",
  "End Date",
  "Hours",
  "Status",
  "Reason",
] as const;

function inDate(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function filterTimeEntries(
  entries: TimeEntryItem[],
  filters: TimePtoExportFilters,
): TimeEntryItem[] {
  return entries.filter((e) => {
    if (!inDate(e.work_date, filters.dateFrom, filters.dateTo)) return false;
    if (filters.campaignId && e.campaign_id !== filters.campaignId)
      return false;
    if (
      filters.approvalStatus &&
      e.approval_status !== filters.approvalStatus
    ) {
      return false;
    }
    return true;
  });
}

export function filterPtoItems(
  items: PtoItem[],
  filters: TimePtoExportFilters,
): PtoItem[] {
  return items.filter((p) => {
    // Overlap with range: include if start/end intersects filter window
    if (filters.dateFrom && p.end_date < filters.dateFrom) return false;
    if (filters.dateTo && p.start_date > filters.dateTo) return false;
    if (filters.ptoStatus && p.status !== filters.ptoStatus) return false;
    return true;
  });
}

export function countTimePtoMatches(
  entries: TimeEntryItem[],
  pto: PtoItem[],
  filters: TimePtoExportFilters,
): number {
  const timeN =
    filters.kind === "pto" ? 0 : filterTimeEntries(entries, filters).length;
  const ptoN =
    filters.kind === "time" ? 0 : filterPtoItems(pto, filters).length;
  return timeN + ptoN;
}

export function downloadTimePtoExport(
  entries: TimeEntryItem[],
  pto: PtoItem[],
  filters: TimePtoExportFilters,
  format: TableExportFormat,
): { count: number; filename: string } {
  const results: { count: number; filename: string }[] = [];

  if (filters.kind === "time" || filters.kind === "both") {
    const filtered = filterTimeEntries(entries, filters);
    const rows = filtered.map((e) => ({
      Date: e.work_date,
      Campaign: e.campaign_name,
      Task: e.task_title ?? "—",
      Type: e.work_type || "—",
      Hours: e.hours.toFixed(1),
      Billable: e.billable ? "Yes" : "No",
      "Retainer Bucket": e.retainer_bucket ?? "—",
      "Out of Scope": e.out_of_scope ? "Yes" : "No",
      Approval: e.approval_status,
      "Logged By": e.logged_by,
      Description: e.description || "—",
    }));
    results.push(
      downloadTableExport(
        "Time Entries",
        [...TIME_HEADERS],
        rows,
        "time-entries",
        format,
      ),
    );
  }

  if (filters.kind === "pto" || filters.kind === "both") {
    const filtered = filterPtoItems(pto, filters);
    const rows = filtered.map((p) => ({
      "Start Date": p.start_date,
      "End Date": p.end_date,
      Hours: p.hours.toFixed(1),
      Status: p.status,
      Reason: p.reason || "—",
    }));
    results.push(
      downloadTableExport(
        "PTO Requests",
        [...PTO_HEADERS],
        rows,
        "pto-requests",
        format,
      ),
    );
  }

  const count = results.reduce((s, r) => s + r.count, 0);
  const filename =
    results.length === 1
      ? results[0]!.filename
      : results.map((r) => r.filename).join(" + ");
  return { count, filename };
}
