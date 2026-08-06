import type { ControlAlert } from "@/lib/controls";

export type ProfitRow = {
  id: string;
  name: string;
  client?: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number | null;
};

export type BudgetRow = {
  id: string;
  name: string;
  budget: number;
  spent: number;
  variance: number;
  health: "under" | "near" | "over" | "na";
  pctUsed: number;
};

export type BillingPerf = {
  total: number;
  collected: number;
  outstanding: number;
  overdue: number;
  disputed: number;
};

export type ApprovalPerf = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  changes: number;
  avgWaitDays: number | null;
};

export type UnbilledRow = {
  campaignId: string;
  campaignName: string;
  entries: number;
  hours: number;
};

export type ReportsDashboardProps = {
  alerts: ControlAlert[];
  clientProfit: ProfitRow[];
  campaignProfit: ProfitRow[];
  budgetPerf: BudgetRow[];
  billingPerf: BillingPerf;
  approvalPerf: ApprovalPerf;
  unbilled: UnbilledRow[];
  pulse: string;
};

export function alertCategory(alert: ControlAlert): string {
  const t = `${alert.exceptionType ?? ""} ${alert.title}`.toLowerCase();
  if (t.includes("budget") || t.includes("spend") || t.includes("cost")) return "Budget";
  if (t.includes("invoice") || t.includes("overdue") || t.includes("ar") || t.includes("disput"))
    return "Cash";
  if (t.includes("approval")) return "Approvals";
  if (t.includes("contract") || t.includes("renew")) return "Contracts";
  if (t.includes("margin") || t.includes("profit") || t.includes("roas")) return "Profit";
  return "Ops";
}
