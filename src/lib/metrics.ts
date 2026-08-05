import { campaignRoi, grossProfit, profitMargin, sumCosts } from "@/lib/finance";
import { num } from "@/lib/format";

export type MetricInvoice = {
  client_id: string;
  campaign_id?: string | null;
  total_amount: number | string;
  status: string;
  invoice_date?: string;
};

export type MetricCost = {
  client_id?: string | null;
  campaign_id?: string | null;
  amount: number | string;
  cost_type?: string;
  cost_date?: string;
};

export type MetricClient = {
  id: string;
  client_name: string;
  status: string;
  created_at: string;
  account_manager_id?: string | null;
};

export type CampaignMetricRow = {
  campaign_id: string;
  impressions: number | string;
  clicks: number | string;
  conversions: number | string;
  spend: number | string;
  metric_date?: string;
};

const AD_SPEND_TYPES = new Set([
  "Ad spend",
  "Advertising Spend",
  "Advertising",
]);

const ACQUISITION_TYPES = new Set([
  ...AD_SPEND_TYPES,
  "Production costs",
  "Production",
  "Vendor/freelancer costs",
  "Vendor",
  "Contractor",
]);

export function isRecognizedRevenue(status: string) {
  return !["Draft", "Canceled"].includes(status);
}

export function revenueFromInvoices(invoices: MetricInvoice[]) {
  return invoices
    .filter((i) => isRecognizedRevenue(i.status))
    .reduce((s, i) => s + num(i.total_amount), 0);
}

export function revenueByClient(invoices: MetricInvoice[]) {
  const map = new Map<string, number>();
  for (const i of invoices) {
    if (!isRecognizedRevenue(i.status)) continue;
    map.set(i.client_id, (map.get(i.client_id) ?? 0) + num(i.total_amount));
  }
  return map;
}

export function revenueByCampaign(invoices: MetricInvoice[]) {
  const map = new Map<string, number>();
  for (const i of invoices) {
    if (!isRecognizedRevenue(i.status) || !i.campaign_id) continue;
    map.set(
      i.campaign_id,
      (map.get(i.campaign_id) ?? 0) + num(i.total_amount),
    );
  }
  return map;
}

export function costsByClient(costs: MetricCost[]) {
  const map = new Map<string, number>();
  for (const c of costs) {
    if (!c.client_id) continue;
    map.set(c.client_id, (map.get(c.client_id) ?? 0) + num(c.amount));
  }
  return map;
}

export function costsByCampaign(costs: MetricCost[]) {
  const map = new Map<string, number>();
  for (const c of costs) {
    if (!c.campaign_id) continue;
    map.set(c.campaign_id, (map.get(c.campaign_id) ?? 0) + num(c.amount));
  }
  return map;
}

export function adSpendFromCosts(costs: MetricCost[]) {
  return costs
    .filter((c) => c.cost_type && AD_SPEND_TYPES.has(c.cost_type))
    .reduce((s, c) => s + num(c.amount), 0);
}

export function adSpendFromMetrics(metrics: CampaignMetricRow[]) {
  return metrics.reduce((s, m) => s + num(m.spend), 0);
}

/** Prefer campaign_metrics.spend; fall back to Ad spend cost rows. */
export function totalAdSpend(
  metrics: CampaignMetricRow[],
  costs: MetricCost[],
) {
  const fromMetrics = adSpendFromMetrics(metrics);
  if (fromMetrics > 0) return fromMetrics;
  return adSpendFromCosts(costs);
}

export function computeCtr(clicks: number, impressions: number) {
  if (impressions <= 0) return null;
  return (clicks / impressions) * 100;
}

export function computeRoas(revenue: number, adSpend: number) {
  if (adSpend <= 0) return null;
  return revenue / adSpend;
}

export function computeRoi(revenue: number, investment: number) {
  return campaignRoi(grossProfit(revenue, investment), investment);
}

export function computeCac(
  acquisitionCosts: number,
  newCustomers: number,
) {
  if (newCustomers <= 0) return null;
  return acquisitionCosts / newCustomers;
}

export function acquisitionCostsInPeriod(
  costs: MetricCost[],
  start: Date,
  end: Date,
) {
  return costs
    .filter((c) => {
      if (!c.cost_type || !ACQUISITION_TYPES.has(c.cost_type)) return false;
      if (!c.cost_date) return true;
      const d = new Date(c.cost_date);
      return d >= start && d <= end;
    })
    .reduce((s, c) => s + num(c.amount), 0);
}

export function newClientsInPeriod(
  clients: MetricClient[],
  start: Date,
  end: Date,
) {
  return clients.filter((c) => {
    const d = new Date(c.created_at);
    return d >= start && d <= end;
  }).length;
}

/** Retention: active clients at end that were also active (or existed) at start of period. */
export function computeRetentionRate(
  clients: MetricClient[],
  asOf = new Date(),
  lookbackDays = 365,
) {
  const start = new Date(asOf);
  start.setDate(start.getDate() - lookbackDays);
  const activeStatuses = new Set([
    "Active Client",
    "Active",
    "Onboarding",
  ]);
  const existedAtStart = clients.filter((c) => new Date(c.created_at) <= start);
  if (!existedAtStart.length) return null;
  const retained = existedAtStart.filter((c) =>
    activeStatuses.has(c.status),
  ).length;
  return (retained / existedAtStart.length) * 100;
}

export function computeClv(lifetimeRevenue: number) {
  return lifetimeRevenue;
}

export function avgClv(clients: MetricClient[], invoices: MetricInvoice[]) {
  const rev = revenueByClient(invoices);
  const values = clients
    .map((c) => rev.get(c.id) ?? 0)
    .filter((v) => v > 0);
  if (!values.length) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function laborCostFromHours(
  hours: number,
  hourlyRate: number,
) {
  return hours * hourlyRate;
}

export function unbilledDollars(
  hours: number,
  hourlyRate: number,
) {
  return hours * hourlyRate;
}

export function clientProfitabilityRow(
  clientId: string,
  name: string,
  revenue: number,
  directCosts: number,
  laborCost = 0,
  otherCosts = 0,
) {
  const costs = directCosts + laborCost + otherCosts;
  const profit = grossProfit(revenue, costs);
  return {
    clientId,
    name,
    revenue,
    costs,
    laborCost,
    otherCosts,
    marketingSpend: directCosts,
    profit,
    margin: profitMargin(revenue, costs),
    roi: computeRoi(revenue, costs),
  };
}

export function aggregateCampaignMetrics(metrics: CampaignMetricRow[]) {
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let spend = 0;
  for (const m of metrics) {
    impressions += num(m.impressions);
    clicks += num(m.clicks);
    conversions += num(m.conversions);
    spend += num(m.spend);
  }
  return {
    impressions,
    clicks,
    conversions,
    spend,
    ctr: computeCtr(clicks, impressions),
  };
}

export function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function seriesByMonth(
  invoices: MetricInvoice[],
  costs: MetricCost[],
) {
  const map = new Map<string, { revenue: number; costs: number; profit: number }>();
  for (const i of invoices) {
    if (!isRecognizedRevenue(i.status) || !i.invoice_date) continue;
    const key = monthKey(i.invoice_date);
    const cur = map.get(key) ?? { revenue: 0, costs: 0, profit: 0 };
    cur.revenue += num(i.total_amount);
    map.set(key, cur);
  }
  for (const c of costs) {
    if (!c.cost_date) continue;
    const key = monthKey(c.cost_date);
    const cur = map.get(key) ?? { revenue: 0, costs: 0, profit: 0 };
    cur.costs += num(c.amount);
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      revenue: v.revenue,
      costs: v.costs,
      profit: v.revenue - v.costs,
    }));
}

export { profitMargin, grossProfit, sumCosts, campaignRoi };
