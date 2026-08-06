import type { DashboardSectionDef } from "@/lib/dashboard-layout";

export const AGENCY_PORTFOLIO_SECTIONS = [
  {
    id: "kpis",
    label: "Key metrics",
    description: "Exceptions, AR, overdue invoices, and margin",
  },
  {
    id: "firm_metrics",
    label: "Firm financials",
    description: "Revenue, profit, and open invoices",
  },
  {
    id: "profit_charts",
    label: "Profit charts",
    description: "Profit by customer and monthly gross profit",
  },
  {
    id: "health_charts",
    label: "Delivery health",
    description: "Task track and campaign budget health",
  },
  {
    id: "team_capacity",
    label: "Team capacity",
    description: "Open and overdue tasks by person",
  },
] as const satisfies readonly DashboardSectionDef[];

export const AM_PORTFOLIO_SECTIONS = [
  {
    id: "delivery",
    label: "Delivery today",
    description: "Quick links for approvals, tasks, time, and costs",
  },
  {
    id: "kpis",
    label: "Key metrics",
    description: "Approvals, clients, campaigns at risk, and book P&L",
  },
  {
    id: "profit_charts",
    label: "Profit charts",
    description: "Profit by client and monthly gross profit",
  },
  {
    id: "budget_chart",
    label: "Campaign budgets",
    description: "Under / near / over budget mix",
  },
  {
    id: "my_clients",
    label: "My clients",
    description: "Top clients with hub links",
  },
] as const satisfies readonly DashboardSectionDef[];

export type AgencyPortfolioSectionId =
  (typeof AGENCY_PORTFOLIO_SECTIONS)[number]["id"];
export type AmPortfolioSectionId =
  (typeof AM_PORTFOLIO_SECTIONS)[number]["id"];

export const AGENCY_PORTFOLIO_STORAGE =
  "rebel.agency-portfolio.layout.v1";
export const AM_PORTFOLIO_STORAGE =
  "rebel.am-portfolio.layout.v1";
