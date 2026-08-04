import { num } from "@/lib/format";

export type InvoiceLike = {
  total_amount: number | string;
  status: string;
  payments?: { amount: number | string }[] | null;
};

export type CostLike = { amount: number | string };

export function paidAmount(invoice: InvoiceLike) {
  return (invoice.payments ?? []).reduce((s, p) => s + num(p.amount), 0);
}

export function remainingBalance(invoice: InvoiceLike) {
  return Math.max(0, num(invoice.total_amount) - paidAmount(invoice));
}

export function grossProfit(revenue: number, costs: number) {
  return revenue - costs;
}

export function profitMargin(revenue: number, costs: number) {
  if (revenue <= 0) return null;
  return ((revenue - costs) / revenue) * 100;
}

export function campaignRoi(profit: number, costs: number) {
  if (costs <= 0) return null;
  return (profit / costs) * 100;
}

export function budgetVariance(budget: number, actual: number) {
  return budget - actual;
}

export function budgetHealth(budget: number, actual: number) {
  if (budget <= 0) return "unknown" as const;
  const used = actual / budget;
  if (used > 1) return "over" as const;
  if (used >= 0.85) return "near" as const;
  return "under" as const;
}

export function sumCosts(costs: CostLike[]) {
  return costs.reduce((s, c) => s + num(c.amount), 0);
}

export function arAgingBucket(dueDate: string, asOf = new Date()) {
  const daysPastDue = Math.floor(
    (asOf.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysPastDue <= 0) return "Current";
  if (daysPastDue <= 30) return "1–30";
  if (daysPastDue <= 60) return "31–60";
  if (daysPastDue <= 90) return "61–90";
  return "90+";
}
