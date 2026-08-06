import { daysBetween, num } from "@/lib/format";
import { budgetHealth, paidAmount, remainingBalance } from "@/lib/finance";
import { computeRoas, profitMargin } from "@/lib/metrics";

export type ControlAlert = {
  id: string;
  severity: "warning" | "error" | "info";
  risk: string;
  control: string;
  title: string;
  detail: string;
  href?: string;
  clientId?: string | null;
  exceptionType?: string;
};

export const SEVERITY_LABELS: Record<
  ControlAlert["severity"],
  "Informational" | "Warning" | "Critical"
> = {
  info: "Informational",
  warning: "Warning",
  error: "Critical",
};

type ControlInput = {
  campaigns: {
    id: string;
    campaign_name: string;
    campaign_budget: number;
    campaign_status: string;
    end_date: string;
    contract_id: string;
    client_id: string;
  }[];
  contracts: {
    id: string;
    client_id?: string;
    contract_name: string;
    contract_status: string;
    end_date: string;
    approval_required: boolean;
    campaign_budget?: number;
    spending_approval_threshold?: number;
  }[];
  costs: {
    id: string;
    campaign_id: string | null;
    client_id?: string | null;
    amount: number;
    approved: boolean;
    cost_date: string;
    cost_type?: string;
    pass_through?: boolean;
  }[];
  work: {
    id: string;
    campaign_id: string;
    user_id?: string;
    billable: boolean;
    billed: boolean;
    hours: number;
    work_date: string;
    approval_status: string;
  }[];
  approvals: {
    id: string;
    campaign_id: string;
    approval_status: string;
    requested_date: string;
    description: string;
  }[];
  invoices: {
    id: string;
    client_id?: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    status: string;
    disputed: boolean;
    campaign_id: string | null;
    payments?: { amount: number }[] | null;
  }[];
  clients?: { id: string; client_name: string; status?: string }[];
  /** Optional portfolio profitability for low-margin alerts */
  clientProfit?: {
    clientId: string;
    name: string;
    revenue: number;
    costs: number;
    margin: number | null;
  }[];
  /** campaign_id → ad spend / revenue for ROAS alerts */
  campaignRoas?: { campaignId: string; name: string; clientId: string; roas: number | null }[];
  /** Tasks approaching due date */
  tasks?: {
    id: string;
    title: string;
    due_date: string | null;
    status: string;
    client_id?: string | null;
  }[];
  /** Missing time: assignees with no entries this week on active campaigns */
  missingTime?: { userName: string; detail: string; clientId?: string | null }[];
  marginTarget?: number;
  roasTarget?: number;
};

export function buildControlAlerts(data: ControlInput): ControlAlert[] {
  const alerts: ControlAlert[] = [];
  const costsByCampaign = new Map<string, number>();
  for (const c of data.costs) {
    if (!c.campaign_id) continue;
    costsByCampaign.set(
      c.campaign_id,
      (costsByCampaign.get(c.campaign_id) ?? 0) + num(c.amount),
    );
  }
  const contractById = new Map(data.contracts.map((c) => [c.id, c]));
  const campaignById = new Map(data.campaigns.map((c) => [c.id, c]));
  const marginTarget = data.marginTarget ?? 20;
  const roasTarget = data.roasTarget ?? 2;

  for (const camp of data.campaigns) {
    const spent = costsByCampaign.get(camp.id) ?? 0;
    const health = budgetHealth(num(camp.campaign_budget), spent);
    if (health === "over") {
      alerts.push({
        id: `budget-over-${camp.id}`,
        severity: "error",
        risk: "This business faces budget overrun risk.",
        control:
          "Our app reduces the risk by flagging campaigns where actual costs exceed budget.",
        title: "Campaign spending above budget",
        detail: `${camp.campaign_name} has spent more than its campaign budget.`,
        href: `/app/campaigns/${camp.id}`,
        clientId: camp.client_id,
        exceptionType: "Budget overrun",
      });
    } else if (health === "near") {
      alerts.push({
        id: `budget-near-${camp.id}`,
        severity: "warning",
        risk: "This business faces budget overrun risk.",
        control:
          "Our app reduces the risk by warning when spend approaches campaign budget.",
        title: "Significant budget variance",
        detail: `${camp.campaign_name} has used 85%+ of its budget.`,
        href: `/app/campaigns/${camp.id}`,
        clientId: camp.client_id,
        exceptionType: "Budget variance",
      });
    }

    const contract = contractById.get(camp.contract_id);
    if (
      contract &&
      (contract.contract_status === "Expired" ||
        contract.contract_status === "Canceled") &&
      ["Active", "Late", "On Hold"].includes(camp.campaign_status)
    ) {
      alerts.push({
        id: `expired-contract-${camp.id}`,
        severity: "error",
        risk: "This business faces unauthorized work risk under expired contracts.",
        control:
          "Our app reduces the risk by warning when active campaigns sit on expired or canceled contracts.",
        title: "Active campaign on expired/canceled contract",
        detail: `${camp.campaign_name} is still active while ${contract.contract_name} is ${contract.contract_status}.`,
        href: `/app/contracts/${contract.id}`,
        clientId: camp.client_id,
        exceptionType: "Contract status",
      });
    }

    if (
      camp.campaign_status === "Late" ||
      (new Date(camp.end_date) < new Date() &&
        !["Completed", "Canceled"].includes(camp.campaign_status))
    ) {
      alerts.push({
        id: `late-${camp.id}`,
        severity: "warning",
        risk: "This business faces delivery and revenue timing risk.",
        control:
          "Our app reduces the risk by highlighting late or past-due campaigns.",
        title: "Late campaign",
        detail: `${camp.campaign_name} is past its planned end date.`,
        href: `/app/campaigns/${camp.id}`,
        clientId: camp.client_id,
        exceptionType: "Campaign delivery",
      });
    }
  }

  for (const contract of data.contracts) {
    const daysLeft = daysBetween(new Date(), contract.end_date);
    if (
      daysLeft >= 0 &&
      daysLeft <= 45 &&
      !["Expired", "Canceled", "Completed"].includes(contract.contract_status)
    ) {
      alerts.push({
        id: `contract-expiring-${contract.id}`,
        severity: daysLeft <= 14 ? "error" : "warning",
        risk: "This business faces contract renewal and revenue continuity risk.",
        control:
          "Our app reduces the risk by flagging contracts approaching expiration.",
        title: "Client contract approaching expiration",
        detail: `${contract.contract_name} ends in ${daysLeft} days.`,
        href: `/app/contracts/${contract.id}`,
        clientId: contract.client_id ?? null,
        exceptionType: "Contract expiration",
      });
    }
    if (
      !contract.contract_name?.trim() ||
      contract.contract_status === "Draft"
    ) {
      alerts.push({
        id: `missing-contract-${contract.id}`,
        severity: "info",
        risk: "This business faces incomplete contract documentation risk.",
        control:
          "Our app reduces the risk by identifying missing or incomplete contract information.",
        title: "Missing contract information",
        detail: `${contract.contract_name || "Unnamed contract"} needs review.`,
        href: `/app/contracts/${contract.id}`,
        clientId: contract.client_id ?? null,
        exceptionType: "Missing contract info",
      });
    }
  }

  // Contract-level monthly advertising budget monitoring
  const adSpendByContract = new Map<string, number>();
  for (const cost of data.costs) {
    if (!cost.campaign_id) continue;
    const camp = campaignById.get(cost.campaign_id);
    if (!camp) continue;
    const isAd =
      cost.cost_type === "Advertising Spend" ||
      cost.cost_type === "Pass-Through" ||
      Boolean(cost.pass_through);
    if (!isAd) continue;
    adSpendByContract.set(
      camp.contract_id,
      (adSpendByContract.get(camp.contract_id) ?? 0) + num(cost.amount),
    );
  }

  for (const contract of data.contracts) {
    const budget = num(contract.campaign_budget);
    if (budget <= 0) continue;
    const spent = adSpendByContract.get(contract.id) ?? 0;
    const health = budgetHealth(budget, spent);
    if (health === "over") {
      alerts.push({
        id: `contract-ad-over-${contract.id}`,
        severity: "error",
        risk: "This business faces advertising budget overrun risk against MSA terms.",
        control:
          "Our app reduces the risk by monitoring contract advertising budgets from the Marketing Services Agreement.",
        title: "Contract advertising budget exceeded",
        detail: `${contract.contract_name} ad/pass-through spend exceeds the contracted monthly advertising budget.`,
        href: `/app/contracts/${contract.id}`,
      });
    } else if (health === "near") {
      alerts.push({
        id: `contract-ad-near-${contract.id}`,
        severity: "warning",
        risk: "This business faces advertising budget overrun risk against MSA terms.",
        control:
          "Our app reduces the risk by warning when spend approaches the contracted advertising budget.",
        title: "Contract advertising budget nearly used",
        detail: `${contract.contract_name} has used 85%+ of its contracted advertising budget.`,
        href: `/app/contracts/${contract.id}`,
      });
    }
  }

  for (const cost of data.costs) {
    if (!cost.approved) {
      const camp = cost.campaign_id
        ? campaignById.get(cost.campaign_id)
        : null;
      const contract = camp ? contractById.get(camp.contract_id) : null;
      const threshold = num(contract?.spending_approval_threshold);
      const overThreshold =
        Boolean(contract?.approval_required) &&
        threshold > 0 &&
        num(cost.amount) >= threshold;
      alerts.push({
        id: `unapproved-cost-${cost.id}`,
        severity: overThreshold ? "error" : "warning",
        risk: "This business faces unapproved expense risk.",
        control:
          "Our app reduces the risk by flagging costs that have not been approved, especially those above the MSA spending threshold.",
        title: overThreshold
          ? "Unapproved cost above MSA threshold"
          : "Unapproved expense",
        detail: `$${num(cost.amount).toLocaleString()} cost${camp ? ` on ${camp.campaign_name}` : ""} is not approved${
          overThreshold
            ? ` and exceeds the $${threshold.toLocaleString()} approval threshold.`
            : "."
        }`,
        href: "/app/costs",
        clientId: cost.client_id ?? camp?.client_id ?? null,
        exceptionType: "Unapproved cost",
      });
    }
  }

  for (const w of data.work) {
    const camp = campaignById.get(w.campaign_id);
    if (w.billable && !w.billed && w.approval_status === "Approved") {
      alerts.push({
        id: `missed-billing-${w.id}`,
        severity: "warning",
        risk: "This business faces missed billing risk.",
        control:
          "Our app reduces the risk by identifying approved billable work that has not been invoiced.",
        title: "Work performed but not billed",
        detail: `${w.hours}h on ${camp?.campaign_name ?? "a campaign"} is approved and still unbilled.`,
        href: "/app/billing",
        clientId: camp?.client_id ?? null,
        exceptionType: "Unbilled work",
      });
    }
    if (num(w.hours) > 12) {
      alerts.push({
        id: `excessive-hours-${w.id}`,
        severity: "warning",
        risk: "This business faces labor cost and timesheet integrity risk.",
        control:
          "Our app reduces the risk by flagging unusually high daily hour entries.",
        title: "Employees recording excessive hours",
        detail: `${num(w.hours)}h logged on ${w.work_date}${camp ? ` for ${camp.campaign_name}` : ""}.`,
        href: "/app/work",
        clientId: camp?.client_id ?? null,
        exceptionType: "Excessive hours",
      });
    }
  }

  for (const a of data.approvals.filter((x) => x.approval_status === "Pending")) {
    const wait = daysBetween(a.requested_date);
    if (wait >= 3) {
      const camp = campaignById.get(a.campaign_id);
      alerts.push({
        id: `approval-wait-${a.id}`,
        severity: wait >= 7 ? "error" : "warning",
        risk: "This business faces approval delay and blocked delivery risk.",
        control:
          "Our app reduces the risk by surfacing approvals waiting too long.",
        title: "Approval waiting too long",
        detail: `${a.description} has been pending ${wait} days.`,
        href: "/app/approvals",
        clientId: camp?.client_id ?? null,
        exceptionType: "Approval delay",
      });
    }
  }

  // Duplicate billing heuristic: same client, same amount, same date
  const invKey = new Map<string, string[]>();
  for (const inv of data.invoices) {
    if (["Draft", "Canceled"].includes(inv.status)) continue;
    const key = `${inv.client_id ?? ""}|${num(inv.total_amount)}|${inv.invoice_date}`;
    const list = invKey.get(key) ?? [];
    list.push(inv.id);
    invKey.set(key, list);
  }
  for (const [, ids] of invKey) {
    if (ids.length < 2) continue;
    alerts.push({
      id: `dup-billing-${ids[0]}`,
      severity: "error",
      risk: "This business faces duplicate billing and client dispute risk.",
      control:
        "Our app reduces the risk by detecting invoices with matching client, amount, and date.",
      title: "Possible duplicate billing",
      detail: `${ids.length} invoices share the same client, amount, and invoice date.`,
      href: "/app/billing",
      clientId: data.invoices.find((i) => i.id === ids[0])?.client_id ?? null,
      exceptionType: "Duplicate billing",
    });
  }

  for (const inv of data.invoices) {
    if (inv.disputed || inv.status === "Disputed") {
      alerts.push({
        id: `disputed-${inv.id}`,
        severity: "error",
        risk: "This business faces collection and revenue uncertainty risk.",
        control:
          "Our app reduces the risk by clearly marking disputed invoices for follow-up.",
        title: "Disputed invoice",
        detail: `${inv.invoice_number} is disputed.`,
        href: "/app/ar",
        clientId: inv.client_id ?? null,
        exceptionType: "Disputed invoice",
      });
    }
    const bal = remainingBalance(inv);
    if (bal > 0 && new Date(inv.due_date) < new Date() && inv.status !== "Paid") {
      alerts.push({
        id: `overdue-${inv.id}`,
        severity: "error",
        risk: "This business faces overdue collection risk.",
        control:
          "Our app reduces the risk by highlighting unpaid invoices past due date.",
        title: "Overdue invoice",
        detail: `${inv.invoice_number} has ${bal.toLocaleString("en-US", { style: "currency", currency: "USD" })} outstanding.`,
        href: "/app/ar",
        clientId: inv.client_id ?? null,
        exceptionType: "Overdue invoice",
      });
    }

    if (inv.campaign_id && ["Sent", "Paid", "Partially Paid"].includes(inv.status)) {
      const relatedWork = data.work.filter(
        (w) => w.campaign_id === inv.campaign_id && w.billable,
      );
      const hours = relatedWork.reduce((s, w) => s + num(w.hours), 0);
      if (hours < 2 && num(inv.total_amount) > 5000 && paidAmount(inv) === 0) {
        alerts.push({
          id: `revrec-${inv.id}`,
          severity: "info",
          risk: "This business faces revenue recognition timing risk.",
          control:
            "Our app reduces the risk by flagging invoices that appear billed before substantial related work.",
          title: "Revenue recognized without appropriate billing/support",
          detail: `${inv.invoice_number} may have been billed before related work was performed.`,
          href: "/app/accounting",
          clientId: inv.client_id ?? null,
          exceptionType: "Revenue recognition",
        });
      }
    }
  }

  for (const row of data.clientProfit ?? []) {
    if (row.revenue > 0 && row.margin != null && row.margin < marginTarget) {
      alerts.push({
        id: `low-margin-${row.clientId}`,
        severity: row.margin < 0 ? "error" : "warning",
        risk: "This business faces client profitability risk.",
        control:
          "Our app reduces the risk by flagging clients below the target profit margin.",
        title:
          row.margin < 0
            ? "Negative or unusually low client profitability"
            : "Client profitability below target",
        detail: `${row.name} margin is ${row.margin.toFixed(1)}% (target ${marginTarget}%).`,
        href: "/app/profitability",
        clientId: row.clientId,
        exceptionType: "Low profitability",
      });
    }
  }

  for (const row of data.campaignRoas ?? []) {
    if (row.roas != null && row.roas < roasTarget) {
      alerts.push({
        id: `low-roas-${row.campaignId}`,
        severity: "warning",
        risk: "This business faces advertising efficiency risk.",
        control:
          "Our app reduces the risk by flagging campaigns with ROAS below target.",
        title: "ROAS below target",
        detail: `${row.name} ROAS is ${row.roas.toFixed(2)}x (target ${roasTarget}x).`,
        href: `/app/campaigns/${row.campaignId}`,
        clientId: row.clientId,
        exceptionType: "Low ROAS",
      });
    }
  }

  for (const t of data.tasks ?? []) {
    if (!t.due_date || ["Completed", "Canceled"].includes(t.status)) continue;
    const days = daysBetween(new Date(), t.due_date);
    if (days >= 0 && days <= 3) {
      alerts.push({
        id: `task-due-${t.id}`,
        severity: days === 0 ? "error" : "warning",
        risk: "This business faces delivery timeline risk.",
        control:
          "Our app reduces the risk by highlighting tasks approaching their due date.",
        title: "Tasks approaching their due date",
        detail: `${t.title} is due in ${days} day(s).`,
        href: "/app/tasks",
        clientId: t.client_id ?? null,
        exceptionType: "Task due soon",
      });
    }
  }

  for (const [idx, m] of (data.missingTime ?? []).entries()) {
    alerts.push({
      id: `missing-time-${idx}`,
      severity: "warning",
      risk: "This business faces incomplete timekeeping and labor cost visibility risk.",
      control:
        "Our app reduces the risk by flagging missing employee time entries.",
      title: "Missing time entries",
      detail: m.detail,
      href: "/app/work",
      clientId: m.clientId ?? null,
      exceptionType: "Missing time",
    });
  }

  const missed = alerts.filter((a) => a.title === "Work performed but not billed");
  const other = alerts.filter((a) => a.title !== "Work performed but not billed");
  return [...other, ...missed.slice(0, 8)].slice(0, 50);
}

export function filterBillingAlerts(alerts: ControlAlert[]) {
  const billingTypes = new Set([
    "Unbilled work",
    "Overdue invoice",
    "Disputed invoice",
    "Duplicate billing",
    "Revenue recognition",
  ]);
  return alerts.filter(
    (a) =>
      (a.exceptionType && billingTypes.has(a.exceptionType)) ||
      [
        "Work performed but not billed",
        "Overdue invoice",
        "Disputed invoice",
        "Possible duplicate billing",
        "Revenue recognized without appropriate billing/support",
      ].includes(a.title),
  );
}

export function filterAmAlerts(alerts: ControlAlert[]) {
  return alerts;
}

// silence unused import if tree-shaken oddly
void computeRoas;
void profitMargin;
