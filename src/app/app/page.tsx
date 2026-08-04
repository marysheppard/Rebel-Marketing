import { createClient } from "@/lib/supabase/server";
import {
  arAgingBucket,
  budgetHealth,
  grossProfit,
  profitMargin,
  remainingBalance,
  sumCosts,
} from "@/lib/finance";
import { buildControlAlerts } from "@/lib/controls";
import { money, num, pct } from "@/lib/format";
import { AlertList, PageHeader, StatCard } from "@/components/ui";
import {
  ArAgingChart,
  BudgetActualChart,
  ClientProfitChart,
  MarginChart,
  RevenueByTypeChart,
  RevenueCostChart,
} from "@/components/Charts";
import type { Profile } from "@/lib/types";
import Link from "next/link";
import { format } from "date-fns";

async function loadDashboardData() {
  const supabase = await createClient();
  const [
    clients,
    contracts,
    campaigns,
    costs,
    work,
    approvals,
    invoices,
    payments,
  ] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("contracts").select("*"),
    supabase.from("campaigns").select("*"),
    supabase.from("costs").select("*"),
    supabase.from("work_entries").select("*"),
    supabase.from("approvals").select("*, clients(client_name), campaigns(campaign_name)"),
    supabase.from("invoices").select("*, payments(amount), clients(client_name)"),
    supabase.from("payments").select("*"),
  ]);

  return {
    clients: clients.data ?? [],
    contracts: contracts.data ?? [],
    campaigns: campaigns.data ?? [],
    costs: costs.data ?? [],
    work: work.data ?? [],
    approvals: approvals.data ?? [],
    invoices: invoices.data ?? [],
    payments: payments.data ?? [],
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();
  const p = profile as Profile;
  const data = await loadDashboardData();

  const revenue = data.invoices
    .filter((i) => !["Draft", "Canceled"].includes(i.status))
    .reduce((s, i) => s + num(i.total_amount), 0);
  const totalCosts = sumCosts(data.costs);
  const profit = grossProfit(revenue, totalCosts);
  const margin = profitMargin(revenue, totalCosts);
  const ar = data.invoices
    .filter((i) => !["Paid", "Canceled", "Draft"].includes(i.status))
    .reduce((s, i) => s + remainingBalance(i), 0);
  const overdueAr = data.invoices
    .filter(
      (i) =>
        remainingBalance(i) > 0 &&
        new Date(i.due_date) < new Date() &&
        !["Paid", "Canceled", "Draft"].includes(i.status),
    )
    .reduce((s, i) => s + remainingBalance(i), 0);

  const costsByCampaign = new Map<string, number>();
  for (const c of data.costs) {
    if (!c.campaign_id) continue;
    costsByCampaign.set(
      c.campaign_id,
      (costsByCampaign.get(c.campaign_id) ?? 0) + num(c.amount),
    );
  }
  const revByCampaign = new Map<string, number>();
  for (const i of data.invoices) {
    if (!i.campaign_id || ["Draft", "Canceled"].includes(i.status)) continue;
    revByCampaign.set(
      i.campaign_id,
      (revByCampaign.get(i.campaign_id) ?? 0) + num(i.total_amount),
    );
  }

  const overBudget = data.campaigns.filter((c) => {
    const spent = costsByCampaign.get(c.id) ?? 0;
    return budgetHealth(num(c.campaign_budget), spent) === "over";
  });
  const unprofitable = data.campaigns.filter((c) => {
    const r = revByCampaign.get(c.id) ?? 0;
    const cost = costsByCampaign.get(c.id) ?? 0;
    return r > 0 && r - cost < 0;
  });
  const pendingApprovals = data.approvals.filter(
    (a) => a.approval_status === "Pending",
  );
  const unbilledHours = data.work
    .filter((w) => w.billable && !w.billed && w.approval_status === "Approved")
    .reduce((s, w) => s + num(w.hours), 0);

  const alerts = buildControlAlerts({
    campaigns: data.campaigns,
    contracts: data.contracts,
    costs: data.costs,
    work: data.work,
    approvals: data.approvals,
    invoices: data.invoices,
  });

  // Charts
  const monthMap = new Map<string, { revenue: number; costs: number }>();
  for (const i of data.invoices) {
    if (["Draft", "Canceled"].includes(i.status)) continue;
    const key = format(new Date(i.invoice_date), "yyyy-MM");
    const cur = monthMap.get(key) ?? { revenue: 0, costs: 0 };
    cur.revenue += num(i.total_amount);
    monthMap.set(key, cur);
  }
  for (const c of data.costs) {
    const key = format(new Date(c.cost_date), "yyyy-MM");
    const cur = monthMap.get(key) ?? { revenue: 0, costs: 0 };
    cur.costs += num(c.amount);
    monthMap.set(key, cur);
  }
  const monthly = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  const clientProfit = data.clients.map((cl) => {
    const revenueC = data.invoices
      .filter((i) => i.client_id === cl.id && !["Draft", "Canceled"].includes(i.status))
      .reduce((s, i) => s + num(i.total_amount), 0);
    const campIds = new Set(
      data.campaigns.filter((c) => c.client_id === cl.id).map((c) => c.id),
    );
    const costsC = data.costs
      .filter((c) => c.campaign_id && campIds.has(c.campaign_id))
      .reduce((s, c) => s + num(c.amount), 0);
    return {
      name: cl.client_name,
      revenue: revenueC,
      costs: costsC,
      profit: revenueC - costsC,
    };
  }).filter((c) => c.revenue > 0 || c.costs > 0);

  const budgetActual = data.campaigns
    .filter((c) => ["Active", "Late", "Completed"].includes(c.campaign_status))
    .slice(0, 10)
    .map((c) => ({
      name: c.campaign_name,
      budget: num(c.campaign_budget),
      actual: costsByCampaign.get(c.id) ?? 0,
    }));

  const byType = new Map<string, number>();
  for (const i of data.invoices) {
    if (!i.campaign_id || ["Draft", "Canceled"].includes(i.status)) continue;
    const camp = data.campaigns.find((c) => c.id === i.campaign_id);
    if (!camp) continue;
    byType.set(
      camp.campaign_type,
      (byType.get(camp.campaign_type) ?? 0) + num(i.total_amount),
    );
  }
  const revenueByType = [...byType.entries()].map(([type, revenue]) => ({
    type,
    revenue,
  }));

  const agingBuckets = ["Current", "1–30", "31–60", "61–90", "90+"] as const;
  const agingMap = Object.fromEntries(agingBuckets.map((b) => [b, 0])) as Record<
    string,
    number
  >;
  for (const i of data.invoices) {
    const bal = remainingBalance(i);
    if (bal <= 0 || ["Draft", "Canceled", "Paid"].includes(i.status)) continue;
    agingMap[arAgingBucket(i.due_date)] += bal;
  }
  const aging = agingBuckets.map((bucket) => ({
    bucket,
    amount: agingMap[bucket],
  }));

  const margins = data.campaigns
    .map((c) => {
      const r = revByCampaign.get(c.id) ?? 0;
      const cost = costsByCampaign.get(c.id) ?? 0;
      const m = profitMargin(r, cost);
      return { name: c.campaign_name, margin: m ?? 0 };
    })
    .filter((c) => c.margin !== 0)
    .slice(0, 12);

  if (p.role === "client") {
    return <ClientDashboard data={data} />;
  }
  if (p.role === "marketing") {
    return (
      <MarketingDashboard
        data={data}
        userId={p.id}
        alerts={alerts.slice(0, 6)}
      />
    );
  }
  if (p.role === "account_manager") {
    return (
      <AccountManagerDashboard
        data={data}
        userId={p.id}
        alerts={alerts.slice(0, 8)}
      />
    );
  }
  if (p.role === "billing") {
    return <BillingDashboard data={data} alerts={alerts.slice(0, 8)} />;
  }

  // Executive
  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        subtitle="Agency-wide revenue, cost, collections, and control risks"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Clients" value={String(data.clients.filter((c) => c.status === "Active").length)} />
        <StatCard label="Active Contracts" value={String(data.contracts.filter((c) => c.contract_status === "Active").length)} />
        <StatCard label="Active Campaigns" value={String(data.campaigns.filter((c) => c.campaign_status === "Active").length)} />
        <StatCard label="Total Revenue" value={money(revenue)} tone="good" />
        <StatCard label="Total Costs" value={money(totalCosts)} />
        <StatCard label="Gross Profit" value={money(profit)} tone={profit >= 0 ? "good" : "bad"} />
        <StatCard label="Profit Margin" value={pct(margin)} />
        <StatCard label="Accounts Receivable" value={money(ar)} tone="warn" />
        <StatCard label="Overdue AR" value={money(overdueAr)} tone="bad" />
        <StatCard label="Pending Approvals" value={String(pendingApprovals.length)} tone="warn" />
        <StatCard label="Campaigns Over Budget" value={String(overBudget.length)} tone="bad" />
        <StatCard label="Unprofitable Campaigns" value={String(unprofitable.length)} tone="bad" />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Management Attention</h2>
        <div className="mb-4 rounded-box border border-warning/30 bg-warning/10 p-4 text-sm">
          <ul className="list-inside list-disc space-y-1">
            <li>{overBudget.length} campaigns are over budget</li>
            <li>
              {
                data.invoices.filter(
                  (i) =>
                    remainingBalance(i) > 0 &&
                    (Date.now() - new Date(i.due_date).getTime()) /
                      (1000 * 60 * 60 * 24) >
                      30,
                ).length
              }{" "}
              invoices are more than 30 days overdue
            </li>
            <li>{pendingApprovals.length} client approvals are pending</li>
            <li>{unprofitable.length} campaign(s) currently unprofitable</li>
            <li>
              {unbilledHours.toFixed(1)} hours of approved work completed but not
              billed
            </li>
          </ul>
        </div>
        <AlertList alerts={alerts.slice(0, 10)} />
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        <RevenueCostChart data={monthly} />
        <ClientProfitChart data={clientProfit} />
        <BudgetActualChart data={budgetActual} />
        <RevenueByTypeChart data={revenueByType} />
        <ArAgingChart data={aging} />
        <MarginChart data={margins} />
      </section>
    </div>
  );
}

function ClientDashboard({
  data,
}: {
  data: Awaited<ReturnType<typeof loadDashboardData>>;
}) {
  const myClients = data.clients;
  const clientIds = new Set(myClients.map((c) => c.id));
  const invoices = data.invoices.filter((i) => clientIds.has(i.client_id));
  const campaigns = data.campaigns.filter((c) => clientIds.has(c.client_id));
  const approvals = data.approvals.filter((a) => clientIds.has(a.client_id));
  const balance = invoices.reduce((s, i) => s + remainingBalance(i), 0);

  return (
    <div>
      <PageHeader
        title="Client Portal"
        subtitle="Your contracts, campaigns, approvals, invoices, and balances"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Your Campaigns" value={String(campaigns.length)} />
        <StatCard
          label="Pending Approvals"
          value={String(approvals.filter((a) => a.approval_status === "Pending").length)}
          tone="warn"
        />
        <StatCard label="Open Invoices" value={String(invoices.filter((i) => remainingBalance(i) > 0).length)} />
        <StatCard label="Outstanding Balance" value={money(balance)} tone="warn" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="font-semibold">Campaigns</h3>
          <ul className="mt-3 space-y-2">
            {campaigns.map((c) => (
              <li key={c.id} className="flex justify-between gap-2 text-sm">
                <Link className="link link-hover" href={`/app/campaigns/${c.id}`}>
                  {c.campaign_name}
                </Link>
                <span className="opacity-60">{c.campaign_status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="font-semibold">Needs your approval</h3>
          <ul className="mt-3 space-y-2">
            {approvals
              .filter((a) => a.approval_status === "Pending")
              .map((a) => (
                <li key={a.id} className="text-sm">
                  <Link className="link link-hover" href="/app/approvals">
                    {a.description}
                  </Link>
                </li>
              ))}
            {!approvals.some((a) => a.approval_status === "Pending") ? (
              <li className="text-sm opacity-60">Nothing waiting right now.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MarketingDashboard({
  data,
  userId,
  alerts,
}: {
  data: Awaited<ReturnType<typeof loadDashboardData>>;
  userId: string;
  alerts: ReturnType<typeof buildControlAlerts>;
}) {
  const myWork = data.work.filter((w) => w.user_id === userId);
  const hours = myWork.reduce((s, w) => s + num(w.hours), 0);
  return (
    <div>
      <PageHeader
        title="My Workspace"
        subtitle="Assigned campaigns, hours, and work to document"
        actions={
          <Link href="/app/work" className="btn btn-primary btn-sm">
            Log work
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Hours logged" value={hours.toFixed(1)} />
        <StatCard label="Work entries" value={String(myWork.length)} />
        <StatCard
          label="Pending approvals"
          value={String(data.approvals.filter((a) => a.approval_status === "Pending").length)}
          tone="warn"
        />
      </div>
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Attention</h2>
        <AlertList alerts={alerts} />
      </div>
      <div className="mt-6 overflow-x-auto rounded-box border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {myWork.slice(0, 10).map((w) => (
              <tr key={w.id}>
                <td>{w.work_date}</td>
                <td>{w.work_type}</td>
                <td>{w.hours}</td>
                <td>{w.approval_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountManagerDashboard({
  data,
  userId,
  alerts,
}: {
  data: Awaited<ReturnType<typeof loadDashboardData>>;
  userId: string;
  alerts: ReturnType<typeof buildControlAlerts>;
}) {
  const mine = data.clients.filter((c) => c.account_manager_id === userId);
  const ids = new Set(mine.map((c) => c.id));
  const pending = data.approvals.filter(
    (a) => ids.has(a.client_id) && a.approval_status === "Pending",
  );
  return (
    <div>
      <PageHeader
        title="Account Manager Dashboard"
        subtitle="Your clients, deadlines, approvals, and billing issues"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned clients" value={String(mine.length)} />
        <StatCard
          label="Active campaigns"
          value={String(
            data.campaigns.filter(
              (c) => ids.has(c.client_id) && c.campaign_status === "Active",
            ).length,
          )}
        />
        <StatCard label="Pending approvals" value={String(pending.length)} tone="warn" />
        <StatCard
          label="Overdue invoices"
          value={String(
            data.invoices.filter(
              (i) =>
                ids.has(i.client_id) &&
                remainingBalance(i) > 0 &&
                new Date(i.due_date) < new Date(),
            ).length,
          )}
          tone="bad"
        />
      </div>
      <div className="mt-6 rounded-box border border-base-300 bg-base-100 p-4">
        <h3 className="font-semibold">Client approval needed</h3>
        <ul className="mt-3 space-y-2">
          {pending.slice(0, 6).map((a) => {
            const wait = Math.floor(
              (Date.now() - new Date(a.requested_date).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return (
              <li key={a.id} className="text-sm">
                <span className="font-medium">
                  {(a as { clients?: { client_name: string } }).clients
                    ?.client_name ?? "Client"}
                </span>{" "}
                — {(a as { campaigns?: { campaign_name: string } }).campaigns
                  ?.campaign_name ?? "Campaign"}{" "}
                — {wait} days waiting
              </li>
            );
          })}
          {!pending.length ? (
            <li className="text-sm opacity-60">No pending approvals.</li>
          ) : null}
        </ul>
      </div>
      <div className="mt-6">
        <AlertList alerts={alerts} />
      </div>
    </div>
  );
}

function BillingDashboard({
  data,
  alerts,
}: {
  data: Awaited<ReturnType<typeof loadDashboardData>>;
  alerts: ReturnType<typeof buildControlAlerts>;
}) {
  const unbilled = data.work.filter(
    (w) => w.billable && !w.billed && w.approval_status === "Approved",
  );
  const ar = data.invoices.reduce((s, i) => s + remainingBalance(i), 0);
  return (
    <div>
      <PageHeader
        title="Billing Workspace"
        subtitle="Billable work, invoices, payments, and AR exceptions"
        actions={
          <>
            <Link href="/app/billing" className="btn btn-primary btn-sm">
              Create invoice
            </Link>
            <Link href="/app/ar" className="btn btn-outline btn-sm">
              Open AR
            </Link>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Unbilled approved entries" value={String(unbilled.length)} tone="warn" />
        <StatCard label="Open AR" value={money(ar)} />
        <StatCard
          label="Disputed invoices"
          value={String(data.invoices.filter((i) => i.disputed).length)}
          tone="bad"
        />
      </div>
      <div className="mt-6">
        <AlertList alerts={alerts} />
      </div>
    </div>
  );
}
