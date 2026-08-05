import { num } from "@/lib/format";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  type CostCategory,
  normalizeCostCategory,
} from "./categories";
import {
  budgetUtilization,
  campaignBudgetStatus,
  type CampaignBudgetStatus,
} from "./budget-status";
import {
  inDateRange,
  previousPeriodRange,
  resolveDateRange,
  trendGranularity,
  enumerateTrendPeriods,
  periodKeyAndLabel,
  TREND_GROUP_TO_GRANULARITY,
  type BillingFilter,
  type CostFilterState,
  type DateRangeOptions,
  type TrendGroupBy,
} from "./filters";

export type CostRow = {
  id: string;
  campaign_id: string | null;
  cost_type: string;
  description: string;
  amount: number | string;
  cost_date: string;
  vendor_name: string;
  approved: boolean;
  pass_through: boolean;
  campaigns?: {
    campaign_name: string;
    campaign_budget: number | string;
    client_id?: string | null;
    clients?: { client_name: string } | { client_name: string }[] | null;
  } | null;
};

export type InvoicePassThroughRow = {
  id: string;
  campaign_id: string | null;
  status: string;
  pass_through_amount: number | string;
};

export type CategoryTotals = Record<
  CostCategory,
  { amount: number; count: number }
>;

export type CampaignBudgetRow = {
  campaignId: string;
  campaignName: string;
  clientName: string;
  budget: number;
  actual: number;
  remaining: number | null;
  variance: number | null;
  utilization: number | null;
  status: CampaignBudgetStatus;
};

export type TrendPoint = {
  period: string;
  label: string;
  advertising: number;
  vendor_freelancer: number;
  employee_labor: number;
  pass_through: number;
  total: number;
};

function emptyCategoryTotals(): CategoryTotals {
  return {
    advertising: { amount: 0, count: 0 },
    vendor_freelancer: { amount: 0, count: 0 },
    employee_labor: { amount: 0, count: 0 },
    pass_through: { amount: 0, count: 0 },
  };
}

export function clientNameFromCost(c: CostRow): string {
  const clients = c.campaigns?.clients;
  if (!clients) return "—";
  const obj = Array.isArray(clients) ? clients[0] : clients;
  return obj?.client_name || "—";
}

export function approxBillingStatus(
  c: CostRow,
  invoices: InvoicePassThroughRow[],
): BillingFilter {
  if (!c.pass_through) return "not_billable";
  if (!c.approved) return "awaiting_approval";

  const campInvoices = invoices.filter(
    (i) => i.campaign_id && i.campaign_id === c.campaign_id && i.status !== "Canceled",
  );
  if (campInvoices.some((i) => i.status === "Paid" && num(i.pass_through_amount) > 0)) {
    return "paid";
  }
  if (
    campInvoices.some((i) =>
      ["Sent", "Partially Paid", "Overdue", "Disputed"].includes(i.status) &&
      num(i.pass_through_amount) > 0,
    )
  ) {
    return "invoiced";
  }
  if (
    campInvoices.some(
      (i) => i.status === "Draft" && num(i.pass_through_amount) > 0,
    )
  ) {
    return "draft_invoice";
  }
  return "ready_to_bill";
}

export function filterCosts(
  costs: CostRow[],
  filters: CostFilterState,
  invoices: InvoicePassThroughRow[] = [],
  asOf: Date = new Date(),
  rangeOptions: DateRangeOptions = {},
): CostRow[] {
  const { start, end } = resolveDateRange(filters, asOf, rangeOptions);
  return costs.filter((c) => {
    if (!inDateRange(c.cost_date, start, end)) return false;

    const clientId = c.campaigns?.client_id ?? null;
    if (filters.clientId && clientId !== filters.clientId) return false;
    if (filters.campaignId && c.campaign_id !== filters.campaignId) return false;

    const category = normalizeCostCategory(c.cost_type);
    if (filters.category && category !== filters.category) return false;

    if (filters.approval === "approved" && !c.approved) return false;
    if (filters.approval === "pending" && c.approved) return false;

    if (filters.passThrough === "yes" && !c.pass_through) return false;
    if (filters.passThrough === "no" && c.pass_through) return false;

    if (filters.billing !== "all") {
      if (approxBillingStatus(c, invoices) !== filters.billing) return false;
    }

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const hay = [
        c.description,
        c.vendor_name,
        c.campaigns?.campaign_name ?? "",
        clientNameFromCost(c),
        c.cost_type,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

/** Sum category amounts for categorized rows. Optionally approved-only. */
export function sumByCategory(
  costs: CostRow[],
  opts: { approvedOnly?: boolean } = {},
): CategoryTotals {
  const totals = emptyCategoryTotals();
  for (const c of costs) {
    if (opts.approvedOnly && !c.approved) continue;
    const cat = normalizeCostCategory(c.cost_type);
    if (!cat) continue;
    totals[cat].amount += num(c.amount);
    totals[cat].count += 1;
  }
  return totals;
}

export function totalFromCategories(totals: CategoryTotals): number {
  return COST_CATEGORIES.reduce((s, k) => s + totals[k].amount, 0);
}

export function percentOfTotal(part: number, total: number): number | null {
  if (total <= 0) return null;
  return (part / total) * 100;
}

export function periodDelta(
  current: number,
  previous: number,
): { amount: number; pct: number | null } {
  const amount = current - previous;
  if (previous === 0) {
    return { amount, pct: current === 0 ? 0 : null };
  }
  return { amount, pct: (amount / previous) * 100 };
}

export function buildSummary(
  filtered: CostRow[],
  filters: CostFilterState,
  allCosts: CostRow[],
  asOf: Date = new Date(),
  rangeOptions: DateRangeOptions = {},
) {
  const currentTotals = sumByCategory(filtered);
  const total = totalFromCategories(currentTotals);

  const { start, end } = resolveDateRange(filters, asOf, rangeOptions);
  const prev = previousPeriodRange(start, end);
  const prevRows = allCosts.filter((c) => {
    if (!inDateRange(c.cost_date, prev.start, prev.end)) return false;
    const clientId = c.campaigns?.client_id ?? null;
    if (filters.clientId && clientId !== filters.clientId) return false;
    if (filters.campaignId && c.campaign_id !== filters.campaignId) return false;
    const category = normalizeCostCategory(c.cost_type);
    if (filters.category && category !== filters.category) return false;
    if (filters.approval === "approved" && !c.approved) return false;
    if (filters.approval === "pending" && c.approved) return false;
    if (filters.passThrough === "yes" && !c.pass_through) return false;
    if (filters.passThrough === "no" && c.pass_through) return false;
    return true;
  });
  const prevTotals = sumByCategory(prevRows);

  const passThroughRows = filtered.filter((c) => c.pass_through);
  const passThroughApproved = passThroughRows
    .filter((c) => c.approved)
    .reduce((s, c) => s + num(c.amount), 0);

  return {
    range: { start, end },
    previousRange: prev,
    totals: currentTotals,
    previousTotals: prevTotals,
    total,
    previousTotal: totalFromCategories(prevTotals),
    passThroughApproved,
    advertisingDelta: periodDelta(
      currentTotals.advertising.amount,
      prevTotals.advertising.amount,
    ),
    vendorDelta: periodDelta(
      currentTotals.vendor_freelancer.amount,
      prevTotals.vendor_freelancer.amount,
    ),
    laborDelta: periodDelta(
      currentTotals.employee_labor.amount,
      prevTotals.employee_labor.amount,
    ),
    passThroughDelta: periodDelta(
      currentTotals.pass_through.amount,
      prevTotals.pass_through.amount,
    ),
  };
}

export type CategoryChartSlice = {
  key: CostCategory;
  name: string;
  value: number;
  count: number;
  share: number | null;
  average: number | null;
  largestCampaign: string | null;
  budgetStatus: CampaignBudgetStatus | null;
  budgetStatusLabel: string | null;
};

/** Insights for the Costs by Category donut (reuse existing cost rows only). */
export function buildCategoryChartSlices(
  costs: CostRow[],
  totals: CategoryTotals,
  total: number,
): CategoryChartSlice[] {
  return COST_CATEGORIES.map((cat) => {
    const amount = totals[cat].amount;
    const count = totals[cat].count;
    const rows = costs.filter((c) => normalizeCostCategory(c.cost_type) === cat);

    const byCampaign = new Map<
      string,
      { name: string; amount: number; budget: number }
    >();
    for (const c of rows) {
      if (!c.campaign_id) continue;
      const existing = byCampaign.get(c.campaign_id) ?? {
        name: c.campaigns?.campaign_name ?? "Unknown campaign",
        amount: 0,
        budget: num(c.campaigns?.campaign_budget),
      };
      existing.amount += num(c.amount);
      if (c.campaigns?.campaign_name) existing.name = c.campaigns.campaign_name;
      if (c.campaigns?.campaign_budget != null) {
        existing.budget = num(c.campaigns.campaign_budget);
      }
      byCampaign.set(c.campaign_id, existing);
    }

    let largest: { name: string; amount: number; budget: number } | null = null;
    for (const v of byCampaign.values()) {
      if (!largest || v.amount > largest.amount) largest = v;
    }

    const status = largest
      ? campaignBudgetStatus(largest.budget, largest.amount)
      : null;

    return {
      key: cat,
      name: COST_CATEGORY_LABELS[cat],
      value: amount,
      count,
      share: percentOfTotal(amount, total),
      average: count > 0 ? amount / count : null,
      largestCampaign: largest?.name ?? null,
      budgetStatus: status,
      budgetStatusLabel: status
        ? status === "over_budget"
          ? "Over Budget"
          : status === "missing_budget"
            ? "Budget unavailable"
            : "Within Budget"
        : null,
    };
  }).filter((d) => d.value > 0 || d.count > 0);
}

export function buildTrendSeries(
  costs: CostRow[],
  start: string,
  end: string,
  groupBy?: TrendGroupBy | null,
): TrendPoint[] {
  const granularity = groupBy
    ? TREND_GROUP_TO_GRANULARITY[groupBy]
    : trendGranularity(start, end);
  const periods = enumerateTrendPeriods(start, end, granularity);
  const buckets = new Map<string, TrendPoint>();

  for (const p of periods) {
    buckets.set(p.key, {
      period: p.key,
      label: p.label,
      advertising: 0,
      vendor_freelancer: 0,
      employee_labor: 0,
      pass_through: 0,
      total: 0,
    });
  }

  for (const c of costs) {
    if (!inDateRange(c.cost_date, start, end)) continue;
    const cat = normalizeCostCategory(c.cost_type);
    if (!cat) continue;
    const { key, label } = periodKeyAndLabel(c.cost_date, granularity);
    let point = buckets.get(key);
    if (!point) {
      point = {
        period: key,
        label,
        advertising: 0,
        vendor_freelancer: 0,
        employee_labor: 0,
        pass_through: 0,
        total: 0,
      };
      buckets.set(key, point);
    }
    const amt = num(c.amount);
    point[cat] += amt;
    point.total += amt;
  }

  return [...buckets.values()].sort((a, b) =>
    a.period.localeCompare(b.period),
  );
}

export function earliestCostDate(costs: CostRow[]): string | null {
  let min: string | null = null;
  for (const c of costs) {
    if (!c.cost_date) continue;
    if (!min || c.cost_date < min) min = c.cost_date;
  }
  return min;
}

export type CampaignSort =
  | "highest_cost"
  | "highest_utilization"
  | "largest_over"
  | "largest_remaining";

export function buildCampaignBudgetRows(
  costs: CostRow[],
  sort: CampaignSort = "highest_cost",
  limit?: number | null,
): CampaignBudgetRow[] {
  const byCampaign = new Map<
    string,
    { name: string; clientName: string; budget: number; actual: number }
  >();

  for (const c of costs) {
    if (!c.campaign_id) continue;
    const cat = normalizeCostCategory(c.cost_type);
    if (!cat) continue;
    // Approved actual only for budget comparisons
    if (!c.approved) continue;
    const existing = byCampaign.get(c.campaign_id) ?? {
      name: c.campaigns?.campaign_name ?? "Unknown campaign",
      clientName: clientNameFromCost(c),
      budget: num(c.campaigns?.campaign_budget),
      actual: 0,
    };
    existing.actual += num(c.amount);
    if (c.campaigns?.campaign_name) existing.name = c.campaigns.campaign_name;
    if (c.campaigns?.campaign_budget != null) {
      existing.budget = num(c.campaigns.campaign_budget);
    }
    const client = clientNameFromCost(c);
    if (client && client !== "—") existing.clientName = client;
    byCampaign.set(c.campaign_id, existing);
  }

  let rows: CampaignBudgetRow[] = [...byCampaign.entries()].map(
    ([campaignId, v]) => {
      const status = campaignBudgetStatus(v.budget, v.actual);
      const utilization = budgetUtilization(v.budget, v.actual);
      const hasBudget = v.budget > 0;
      return {
        campaignId,
        campaignName: v.name,
        clientName: v.clientName,
        budget: v.budget,
        actual: v.actual,
        remaining: hasBudget ? v.budget - v.actual : null,
        variance: hasBudget ? v.budget - v.actual : null,
        utilization,
        status,
      };
    },
  );

  rows = rows.sort((a, b) => {
    switch (sort) {
      case "highest_utilization":
        return (b.utilization ?? -1) - (a.utilization ?? -1);
      case "largest_over": {
        const overA = a.variance != null && a.variance < 0 ? -a.variance : 0;
        const overB = b.variance != null && b.variance < 0 ? -b.variance : 0;
        return overB - overA;
      }
      case "largest_remaining":
        return (b.remaining ?? -Infinity) - (a.remaining ?? -Infinity);
      case "highest_cost":
      default:
        return b.actual - a.actual;
    }
  });

  if (limit == null || limit <= 0) return rows;
  return rows.slice(0, limit);
}

export function approvalBreakdown(costs: CostRow[]) {
  let approvedAmount = 0;
  let approvedCount = 0;
  let pendingAmount = 0;
  let pendingCount = 0;
  for (const c of costs) {
    const cat = normalizeCostCategory(c.cost_type);
    if (!cat) continue;
    const amt = num(c.amount);
    if (c.approved) {
      approvedAmount += amt;
      approvedCount += 1;
    } else {
      pendingAmount += amt;
      pendingCount += 1;
    }
  }
  return {
    approved: { amount: approvedAmount, count: approvedCount },
    pending: { amount: pendingAmount, count: pendingCount },
    rejected: { amount: 0, count: 0 },
    draft: { amount: 0, count: 0 },
  };
}

export type PassThroughBucketKey =
  | "awaiting_approval"
  | "ready_to_bill"
  | "draft_invoice"
  | "invoiced"
  | "paid"
  | "billing_hold"
  | "not_billable";

export function passThroughStatusBreakdown(
  costs: CostRow[],
  invoices: InvoicePassThroughRow[],
) {
  const passThrough = costs.filter((c) => c.pass_through);
  const reimbursableTotal = passThrough.reduce((s, c) => s + num(c.amount), 0);

  const buckets: Record<
    PassThroughBucketKey,
    { amount: number; count: number }
  > = {
    awaiting_approval: { amount: 0, count: 0 },
    ready_to_bill: { amount: 0, count: 0 },
    draft_invoice: { amount: 0, count: 0 },
    invoiced: { amount: 0, count: 0 },
    paid: { amount: 0, count: 0 },
    billing_hold: { amount: 0, count: 0 },
    not_billable: { amount: 0, count: 0 },
  };

  for (const c of passThrough) {
    const status = approxBillingStatus(c, invoices);
    const key = status as PassThroughBucketKey;
    if (key in buckets) {
      buckets[key].amount += num(c.amount);
      buckets[key].count += 1;
    }
  }

  const approvedPassThrough = passThrough
    .filter((c) => c.approved)
    .reduce((s, c) => s + num(c.amount), 0);

  const campaignIds = new Set(
    passThrough.map((c) => c.campaign_id).filter(Boolean) as string[],
  );

  const invoicedPassThrough = invoices
    .filter(
      (i) =>
        i.campaign_id &&
        campaignIds.has(i.campaign_id) &&
        i.status !== "Canceled",
    )
    .reduce((s, i) => s + num(i.pass_through_amount), 0);

  const notYetBilled = Math.max(0, approvedPassThrough - invoicedPassThrough);

  return {
    buckets,
    reimbursableTotal,
    approvedPassThrough,
    invoicedPassThrough,
    notYetBilled,
  };
}

export function unmappedCostTypes(costs: CostRow[]): string[] {
  const set = new Set<string>();
  for (const c of costs) {
    if (!normalizeCostCategory(c.cost_type)) {
      set.add(c.cost_type || "(empty)");
    }
  }
  return [...set].sort();
}
