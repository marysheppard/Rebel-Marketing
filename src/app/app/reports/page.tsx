import { daysBetween, money, num } from "@/lib/format";
import { buildControlAlerts } from "@/lib/controls";
import {
  budgetHealth,
  budgetVariance,
  profitMargin,
  remainingBalance,
} from "@/lib/finance";
import { getProfile } from "@/lib/page-auth";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import type {
  ApprovalPerf,
  BillingPerf,
  BudgetRow,
  ProfitRow,
  UnbilledRow,
} from "@/components/reports/types";

function buildPulse({
  critical,
  agencyMargin,
  agencyProfit,
  overdue,
  overBudget,
  unbilledHours,
}: {
  critical: number;
  agencyMargin: number | null;
  agencyProfit: number;
  overdue: number;
  overBudget: number;
  unbilledHours: number;
}) {
  const bits: string[] = [];
  if (critical > 0) {
    bits.push(
      `${critical} critical control${critical === 1 ? "" : "s"} need review`,
    );
  } else {
    bits.push("No critical controls open");
  }
  if (agencyMargin != null) {
    bits.push(
      `agency margin ${agencyMargin.toFixed(1)}% (${money(agencyProfit)} net)`,
    );
  }
  if (overdue > 0) bits.push(`${money(overdue)} overdue AR`);
  if (overBudget > 0) {
    bits.push(
      `${overBudget} campaign${overBudget === 1 ? "" : "s"} over budget`,
    );
  }
  if (unbilledHours > 0) {
    bits.push(`${unbilledHours.toFixed(1)} approved hours ready to invoice`);
  }
  return `${bits.join(" · ")}.`;
}

export default async function ReportsPage() {
  const { supabase } = await getProfile();

  const [
    { data: clients },
    { data: campaigns },
    { data: costs },
    { data: invoices },
    { data: approvals },
    { data: work },
    { data: contracts },
  ] = await Promise.all([
    supabase.from("clients").select("*").order("client_name"),
    supabase.from("campaigns").select("*, clients(client_name)").order("campaign_name"),
    supabase
      .from("costs")
      .select("id, campaign_id, amount, approved, cost_date, cost_type, pass_through"),
    supabase.from("invoices").select("*, payments(amount)"),
    supabase.from("approvals").select("*"),
    supabase.from("work_entries").select("*"),
    supabase
      .from("contracts")
      .select(
        "id, contract_name, contract_status, end_date, approval_required, campaign_budget, spending_approval_threshold",
      ),
  ]);

  const controlAlerts = buildControlAlerts({
    campaigns: (campaigns ?? []).map((c) => ({
      id: c.id,
      campaign_name: c.campaign_name,
      campaign_budget: num(c.campaign_budget),
      campaign_status: c.campaign_status,
      end_date: c.end_date,
      contract_id: c.contract_id,
      client_id: c.client_id,
    })),
    contracts: (contracts ?? []).map((c) => ({
      id: c.id,
      contract_name: c.contract_name,
      contract_status: c.contract_status,
      end_date: c.end_date,
      approval_required: Boolean(c.approval_required),
      campaign_budget: num(c.campaign_budget),
      spending_approval_threshold: num(c.spending_approval_threshold),
    })),
    costs: (costs ?? []).map((c) => ({
      id: c.id,
      campaign_id: c.campaign_id,
      amount: num(c.amount),
      approved: Boolean(c.approved),
      cost_date: c.cost_date,
      cost_type: c.cost_type,
      pass_through: Boolean(c.pass_through),
    })),
    work: (work ?? []).map((w) => ({
      id: w.id,
      campaign_id: w.campaign_id,
      billable: Boolean(w.billable),
      billed: Boolean(w.billed),
      hours: num(w.hours),
      work_date: w.work_date,
      approval_status: w.approval_status,
    })),
    approvals: (approvals ?? []).map((a) => ({
      id: a.id,
      campaign_id: a.campaign_id,
      approval_status: a.approval_status,
      requested_date: a.requested_date,
      description: a.description,
    })),
    invoices: (invoices ?? []).map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      invoice_date: i.invoice_date,
      due_date: i.due_date,
      total_amount: num(i.total_amount),
      status: i.status,
      disputed: Boolean(i.disputed),
      campaign_id: i.campaign_id,
      payments: i.payments,
    })),
    clients: (clients ?? []).map((c) => ({ id: c.id, client_name: c.client_name })),
  });

  const costsByCampaign = new Map<string, number>();
  for (const c of costs ?? []) {
    if (!c.campaign_id) continue;
    costsByCampaign.set(
      c.campaign_id,
      (costsByCampaign.get(c.campaign_id) ?? 0) + num(c.amount),
    );
  }

  const revByCampaign = new Map<string, number>();
  const revByClient = new Map<string, number>();
  for (const i of invoices ?? []) {
    if (["Draft", "Canceled"].includes(i.status)) continue;
    const amt = num(i.total_amount);
    revByClient.set(i.client_id, (revByClient.get(i.client_id) ?? 0) + amt);
    if (i.campaign_id) {
      revByCampaign.set(i.campaign_id, (revByCampaign.get(i.campaign_id) ?? 0) + amt);
    }
  }

  const clientProfit: ProfitRow[] = (clients ?? [])
    .map((cl) => {
      const campIds = new Set(
        (campaigns ?? []).filter((c) => c.client_id === cl.id).map((c) => c.id),
      );
      const clientCosts = (costs ?? [])
        .filter((c) => c.campaign_id && campIds.has(c.campaign_id))
        .reduce((s, c) => s + num(c.amount), 0);
      const revenue = revByClient.get(cl.id) ?? 0;
      const profit = revenue - clientCosts;
      return {
        id: cl.id,
        name: cl.client_name,
        revenue,
        costs: clientCosts,
        profit,
        margin: profitMargin(revenue, clientCosts),
      };
    })
    .filter((r) => r.revenue > 0 || r.costs > 0);

  const campaignProfit: ProfitRow[] = (campaigns ?? [])
    .map((c) => {
      const revenue = revByCampaign.get(c.id) ?? 0;
      const campCosts = costsByCampaign.get(c.id) ?? 0;
      const profit = revenue - campCosts;
      return {
        id: c.id,
        name: c.campaign_name,
        client:
          (c as { clients?: { client_name: string } }).clients?.client_name ?? "—",
        revenue,
        costs: campCosts,
        profit,
        margin: profitMargin(revenue, campCosts),
      };
    })
    .filter((r) => r.revenue > 0 || r.costs > 0);

  const budgetPerf: BudgetRow[] = (campaigns ?? [])
    .map((c) => {
      const budget = num(c.campaign_budget);
      const spent = costsByCampaign.get(c.id) ?? 0;
      const healthRaw = budgetHealth(budget, spent);
      const health: BudgetRow["health"] =
        healthRaw === "unknown" ? "na" : healthRaw;
      return {
        id: c.id,
        name: c.campaign_name,
        budget,
        spent,
        variance: budgetVariance(budget, spent),
        health,
        pctUsed: budget > 0 ? (spent / budget) * 100 : 0,
      };
    })
    .filter((r) => r.budget > 0);

  const billingPerf: BillingPerf = (invoices ?? []).reduce(
    (acc, i) => {
      acc.total += num(i.total_amount);
      acc.collected += num(i.total_amount) - remainingBalance(i);
      acc.outstanding += remainingBalance(i);
      if (remainingBalance(i) > 0 && new Date(i.due_date) < new Date()) {
        acc.overdue += remainingBalance(i);
      }
      if (i.disputed) acc.disputed++;
      return acc;
    },
    { total: 0, collected: 0, outstanding: 0, overdue: 0, disputed: 0 },
  );

  const approvalAgg = (approvals ?? []).reduce(
    (acc, a) => {
      acc.total++;
      if (a.approval_status === "Pending") {
        acc.pending++;
        const wait = daysBetween(a.requested_date);
        acc.totalWaitDays += wait;
        acc.pendingCount++;
      }
      if (a.approval_status === "Approved") acc.approved++;
      if (a.approval_status === "Rejected") acc.rejected++;
      if (a.approval_status === "Changes Requested") acc.changes++;
      return acc;
    },
    {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      changes: 0,
      totalWaitDays: 0,
      pendingCount: 0,
    },
  );

  const approvalPerf: ApprovalPerf = {
    total: approvalAgg.total,
    pending: approvalAgg.pending,
    approved: approvalAgg.approved,
    rejected: approvalAgg.rejected,
    changes: approvalAgg.changes,
    avgWaitDays:
      approvalAgg.pendingCount > 0
        ? approvalAgg.totalWaitDays / approvalAgg.pendingCount
        : null,
  };

  const unbilledWork = (work ?? []).filter(
    (w) => w.billable && !w.billed && w.approval_status === "Approved",
  );
  const unbilledByCampaign = new Map<string, { hours: number; entries: number }>();
  for (const w of unbilledWork) {
    const cur = unbilledByCampaign.get(w.campaign_id) ?? { hours: 0, entries: 0 };
    cur.hours += num(w.hours);
    cur.entries++;
    unbilledByCampaign.set(w.campaign_id, cur);
  }

  const unbilled: UnbilledRow[] = [...unbilledByCampaign.entries()]
    .map(([campaignId, data]) => {
      const camp = (campaigns ?? []).find((c) => c.id === campaignId);
      return {
        campaignId,
        campaignName: camp?.campaign_name ?? campaignId,
        entries: data.entries,
        hours: data.hours,
      };
    })
    .sort((a, b) => b.hours - a.hours);

  const agencyRevenue = clientProfit.reduce((s, r) => s + r.revenue, 0);
  const agencyCosts = clientProfit.reduce((s, r) => s + r.costs, 0);
  const agencyProfit = agencyRevenue - agencyCosts;
  const agencyMargin =
    agencyRevenue > 0 ? (agencyProfit / agencyRevenue) * 100 : null;
  const unbilledHours = unbilled.reduce((s, r) => s + r.hours, 0);
  const overBudget = budgetPerf.filter((r) => r.health === "over").length;
  const critical = controlAlerts.filter((a) => a.severity === "error").length;

  const pulse = buildPulse({
    critical,
    agencyMargin,
    agencyProfit,
    overdue: billingPerf.overdue,
    overBudget,
    unbilledHours,
  });

  return (
    <ReportsDashboard
      alerts={controlAlerts}
      clientProfit={clientProfit}
      campaignProfit={campaignProfit}
      budgetPerf={budgetPerf}
      billingPerf={billingPerf}
      approvalPerf={approvalPerf}
      unbilled={unbilled}
      pulse={pulse}
    />
  );
}
