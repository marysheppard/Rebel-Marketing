import type { DashboardSectionDef } from "@/lib/dashboard-layout";

export const CUSTOMER_DASHBOARD_SECTIONS = [
  {
    id: "campaigns",
    label: "Campaign progress",
    description: "Timeline and budget for your campaigns",
  },
  {
    id: "balance",
    label: "Amount you owe",
    description: "Open invoices and remaining balance",
  },
  {
    id: "approvals",
    label: "Approve or reject deliverables",
    description: "Items waiting on your decision",
  },
] as const satisfies readonly DashboardSectionDef[];

export type CustomerDashboardSectionId =
  (typeof CUSTOMER_DASHBOARD_SECTIONS)[number]["id"];

export const CUSTOMER_DASHBOARD_STORAGE =
  "rebel.customer-dashboard.layout.v1";
