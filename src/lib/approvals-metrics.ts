/** Approvals analytics helpers for Approval Center charts. */

export type ApprovalMetricItem = {
  id: string;
  client_id: string;
  campaign_id: string;
  approval_type: string;
  description: string;
  requested_date: string;
  approval_status: string;
  client_name: string;
  campaign_name: string;
  waitingDays: number | null;
};

export type ApprovalChartFilters = {
  clientId: string; // "all" | id
  type: string; // "all" | type
  status: string; // "all" | status
};

export function filterApprovalItems(
  items: ApprovalMetricItem[],
  f: ApprovalChartFilters,
): ApprovalMetricItem[] {
  return items.filter((a) => {
    if (f.clientId !== "all" && a.client_id !== f.clientId) return false;
    if (f.type !== "all" && a.approval_type !== f.type) return false;
    if (f.status !== "all" && a.approval_status !== f.status) return false;
    return true;
  });
}

const STATUS_NAMES = [
  "Pending",
  "Changes Requested",
  "Approved",
  "Rejected",
] as const;

const AGING_BUCKETS = [
  {
    bucket: "0-2d",
    fill: "#22c55e",
    match: (d: number | null) => d != null && d <= 2,
  },
  {
    bucket: "3-6d",
    fill: "#f59e0b",
    match: (d: number | null) => d != null && d >= 3 && d <= 6,
  },
  {
    bucket: "7d+",
    fill: "#ef4444",
    match: (d: number | null) => d != null && d >= 7,
  },
] as const;

export function buildStatusPie(items: ApprovalMetricItem[]) {
  return STATUS_NAMES.map((name) => ({
    name,
    value: items.filter((a) => a.approval_status === name).length,
  }));
}

export type StatusCompositionSlice = {
  name: string;
  value: number;
  pct: number;
  share: number;
  byType: { name: string; value: number }[];
};

export function buildStatusComposition(items: ApprovalMetricItem[]) {
  const total = items.length;
  const pendingCount = items.filter(
    (a) => a.approval_status === "Pending",
  ).length;
  const slices: StatusCompositionSlice[] = STATUS_NAMES.map((name) => {
    const rows = items.filter((a) => a.approval_status === name);
    const typeMap = new Map<string, number>();
    for (const a of rows) {
      const t = a.approval_type || "Other";
      typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
    }
    const value = rows.length;
    const share = total === 0 ? 0 : (value / total) * 100;
    return {
      name,
      value,
      pct: Math.round(share),
      share,
      byType: [...typeMap.entries()]
        .sort((x, y) => y[1] - x[1])
        .map(([n, v]) => ({ name: n, value: v })),
    };
  });
  return {
    slices,
    total,
    pendingCount,
    pendingPct: total === 0 ? 0 : Math.round((pendingCount / total) * 100),
  };
}

export function buildAgingBars(items: ApprovalMetricItem[]) {
  const pending = items.filter((a) => a.approval_status === "Pending");
  return AGING_BUCKETS.map((b) => ({
    bucket: b.bucket,
    count: pending.filter((a) => b.match(a.waitingDays)).length,
    fill: b.fill,
  }));
}

export type PendingWaitRow = {
  id: string;
  clientId: string;
  label: string;
  waitingDays: number;
  approvalType: string;
  campaignName: string;
  clientName: string;
  fill: string;
  bucket: "fresh" | "aging" | "overdue";
};

function waitBucket(days: number): {
  fill: string;
  bucket: "fresh" | "aging" | "overdue";
} {
  if (days >= 7) return { fill: "#ef4444", bucket: "overdue" };
  if (days >= 3) return { fill: "#f59e0b", bucket: "aging" };
  return { fill: "#22c55e", bucket: "fresh" };
}

/** One row per pending approval; bar length = days waiting. */
export function buildPendingWaitRows(
  items: ApprovalMetricItem[],
  limit = 15,
): {
  rows: PendingWaitRow[];
  pendingTotal: number;
  overdueCount: number;
} {
  const pending = items.filter((a) => a.approval_status === "Pending");
  const rows = pending
    .map((a) => {
      const waitingDays = a.waitingDays ?? 0;
      const { fill, bucket } = waitBucket(waitingDays);
      const type = a.approval_type || "Approval";
      const label = `${a.client_name} · ${type}`;
      return {
        id: a.id,
        clientId: a.client_id,
        label: label.length > 36 ? `${label.slice(0, 35)}…` : label,
        waitingDays,
        approvalType: type,
        campaignName: a.campaign_name,
        clientName: a.client_name,
        fill,
        bucket,
      };
    })
    .sort(
      (a, b) =>
        b.waitingDays - a.waitingDays ||
        a.clientName.localeCompare(b.clientName),
    )
    .slice(0, limit);

  return {
    rows,
    pendingTotal: pending.length,
    overdueCount: pending.filter(
      (a) => (a.waitingDays ?? 0) >= 7,
    ).length,
  };
}

export function buildApprovalKpis(items: ApprovalMetricItem[], now = new Date()) {
  const y = now.getFullYear();
  const ytdStart = `${y}-01-01`;
  const pending = items.filter((a) => a.approval_status === "Pending");
  const pendingCount = pending.length;
  const overdueCount = pending.filter(
    (a) => a.waitingDays != null && a.waitingDays >= 7,
  ).length;
  const avgWaitDays =
    pendingCount === 0
      ? null
      : Math.round(
          pending.reduce((sum, a) => sum + (a.waitingDays ?? 0), 0) /
            pendingCount,
        );

  const approvedYtd = items.filter(
    (a) =>
      a.approval_status === "Approved" &&
      a.requested_date >= ytdStart,
  ).length;

  const changesRequested = items.filter(
    (a) => a.approval_status === "Changes Requested",
  ).length;

  const decided = items.filter((a) =>
    ["Approved", "Rejected", "Changes Requested"].includes(a.approval_status),
  );
  const approvedAmongDecided = decided.filter(
    (a) => a.approval_status === "Approved",
  ).length;
  const approvalRate =
    decided.length === 0
      ? null
      : Math.round((approvedAmongDecided / decided.length) * 100);

  return {
    pendingCount,
    overdueCount,
    avgWaitDays,
    approvedYtd,
    changesRequested,
    approvalRate,
  };
}

export function uniqueClients(items: ApprovalMetricItem[]) {
  const map = new Map<string, string>();
  for (const a of items) map.set(a.client_id, a.client_name);
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function uniqueTypes(items: ApprovalMetricItem[]) {
  return [...new Set(items.map((a) => a.approval_type).filter(Boolean))].sort();
}
