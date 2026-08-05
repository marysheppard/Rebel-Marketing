import { daysBetween, num } from "@/lib/format";
import { budgetHealth, paidAmount, remainingBalance } from "@/lib/finance";

export type ControlAlert = {
  id: string;
  severity: "warning" | "error" | "info";
  risk: string;
  control: string;
  title: string;
  detail: string;
  href?: string;
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
    amount: number;
    approved: boolean;
    cost_date: string;
    cost_type?: string;
    pass_through?: boolean;
  }[];
  work: {
    id: string;
    campaign_id: string;
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
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    status: string;
    disputed: boolean;
    campaign_id: string | null;
    payments?: { amount: number }[] | null;
  }[];
  clients?: { id: string; client_name: string }[];
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
        title: "Campaign over budget",
        detail: `${camp.campaign_name} has spent more than its campaign budget.`,
        href: `/app/campaigns/${camp.id}`,
      });
    } else if (health === "near") {
      alerts.push({
        id: `budget-near-${camp.id}`,
        severity: "warning",
        risk: "This business faces budget overrun risk.",
        control:
          "Our app reduces the risk by warning when spend approaches campaign budget.",
        title: "Campaign near budget",
        detail: `${camp.campaign_name} has used 85%+ of its budget.`,
        href: `/app/campaigns/${camp.id}`,
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
      });
    }
  }

  for (const w of data.work) {
    const camp = campaignById.get(w.campaign_id);
    const contract = camp ? contractById.get(camp.contract_id) : null;
    if (
      contract?.approval_required &&
      w.approval_status === "Pending" &&
      w.billable
    ) {
      // pending is normal; focus on work completed while approval was still open and already marked approved without approval center
    }
    if (w.billable && !w.billed && w.approval_status === "Approved") {
      alerts.push({
        id: `missed-billing-${w.id}`,
        severity: "warning",
        risk: "This business faces missed billing risk.",
        control:
          "Our app reduces the risk by identifying approved billable work that has not been invoiced.",
        title: "Work completed but not billed",
        detail: `${w.hours}h on ${camp?.campaign_name ?? "a campaign"} is approved and still unbilled.`,
        href: "/app/billing",
      });
    }
  }

  // Work before approval: work date earlier than any pending approval request on same campaign
  for (const a of data.approvals.filter((x) => x.approval_status === "Pending")) {
    const wait = daysBetween(a.requested_date);
    if (wait >= 3) {
      alerts.push({
        id: `approval-wait-${a.id}`,
        severity: wait >= 7 ? "error" : "warning",
        risk: "This business faces approval delay and blocked delivery risk.",
        control:
          "Our app reduces the risk by surfacing approvals waiting too long.",
        title: "Approval waiting too long",
        detail: `${a.description} has been pending ${wait} days.`,
        href: "/app/approvals",
      });
    }
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
      });
    }

    // Revenue recognition: billed with little/no related work yet
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
          title: "Billed before substantial work",
          detail: `${inv.invoice_number} may have been billed before related work was performed.`,
          href: "/app/billing",
        });
      }
    }
  }

  // Deduplicate similar missed billing noise — keep first 8 of that type
  const missed = alerts.filter((a) => a.title === "Work completed but not billed");
  const other = alerts.filter((a) => a.title !== "Work completed but not billed");
  return [...other, ...missed.slice(0, 8)].slice(0, 40);
}
