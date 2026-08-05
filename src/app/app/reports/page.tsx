import Link from "next/link";
import { BudgetHealthBadge, PageHeader } from "@/components/ui";
import { daysBetween, money, num, pct } from "@/lib/format";
import {
  budgetHealth,
  budgetVariance,
  profitMargin,
  remainingBalance,
  sumCosts,
} from "@/lib/finance";
import { loadFinanceBundle } from "@/lib/finance-data";
import { requireRoles } from "@/lib/page-auth";

export default async function ReportsPage() {
  const { supabase, profile, userId } = await requireRoles([
    "agency_manager",
    "account_manager",
    "billing",
  ]);

  const bundle = await loadFinanceBundle(supabase, userId, profile.role);
  const clients = bundle.clients;
  const campaigns = bundle.campaigns;
  const costs = bundle.costs;
  const invoices = bundle.invoices;
  const approvals = bundle.approvals;
  const work = bundle.work;

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

  const clientProfit = (clients ?? []).map((cl) => {
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
  }).filter((r) => r.revenue > 0 || r.costs > 0);

  const campaignProfit = (campaigns ?? []).map((c) => {
    const revenue = revByCampaign.get(c.id) ?? 0;
    const campCosts = costsByCampaign.get(c.id) ?? 0;
    const profit = revenue - campCosts;
    return {
      id: c.id,
      name: c.campaign_name,
      client: (c as { clients?: { client_name: string } }).clients?.client_name ?? "—",
      revenue,
      costs: campCosts,
      profit,
      margin: profitMargin(revenue, campCosts),
    };
  }).filter((r) => r.revenue > 0 || r.costs > 0);

  const budgetPerf = (campaigns ?? []).map((c) => {
    const budget = num(c.campaign_budget);
    const spent = costsByCampaign.get(c.id) ?? 0;
    const health = budgetHealth(budget, spent);
    return {
      id: c.id,
      name: c.campaign_name,
      budget,
      spent,
      variance: budgetVariance(budget, spent),
      health,
    };
  }).filter((r) => r.budget > 0);

  const billingPerf = (invoices ?? []).reduce(
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

  const approvalPerf = (approvals ?? []).reduce(
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
  const avgWait =
    approvalPerf.pendingCount > 0
      ? approvalPerf.totalWaitDays / approvalPerf.pendingCount
      : null;

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

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Live profitability, budget, billing, and operational performance"
      />

      <section className="mt-2">
        <h2 className="mb-3 text-xl font-bold">Client profitability</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Client</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Costs</th>
                <th className="text-right">Profit</th>
                <th className="text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {clientProfit.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/app/clients/${r.id}`} className="link link-hover">
                      {r.name}
                    </Link>
                  </td>
                  <td className="text-right">{money(r.revenue)}</td>
                  <td className="text-right">{money(r.costs)}</td>
                  <td className={`text-right ${r.profit >= 0 ? "text-success" : "text-error"}`}>
                    {money(r.profit)}
                  </td>
                  <td className="text-right">{pct(r.margin)}</td>
                </tr>
              ))}
              {!clientProfit.length ? (
                <tr>
                  <td colSpan={5} className="text-center opacity-60">
                    No client profitability data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Campaign profitability</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Client</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Costs</th>
                <th className="text-right">Profit</th>
                <th className="text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {campaignProfit.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/app/campaigns/${r.id}`} className="link link-hover">
                      {r.name}
                    </Link>
                  </td>
                  <td>{r.client}</td>
                  <td className="text-right">{money(r.revenue)}</td>
                  <td className="text-right">{money(r.costs)}</td>
                  <td className={`text-right ${r.profit >= 0 ? "text-success" : "text-error"}`}>
                    {money(r.profit)}
                  </td>
                  <td className="text-right">{pct(r.margin)}</td>
                </tr>
              ))}
              {!campaignProfit.length ? (
                <tr>
                  <td colSpan={6} className="text-center opacity-60">
                    No campaign profitability data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Budget performance</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Campaign</th>
                <th className="text-right">Budget</th>
                <th className="text-right">Spent</th>
                <th className="text-right">Variance</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {budgetPerf.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/app/campaigns/${r.id}`} className="link link-hover">
                      {r.name}
                    </Link>
                  </td>
                  <td className="text-right">{money(r.budget)}</td>
                  <td className="text-right">{money(r.spent)}</td>
                  <td className={`text-right ${r.variance < 0 ? "text-error" : "text-success"}`}>
                    {money(r.variance)}
                  </td>
                  <td>
                    <BudgetHealthBadge budget={r.budget} spent={r.spent} />
                  </td>
                </tr>
              ))}
              {!budgetPerf.length ? (
                <tr>
                  <td colSpan={5} className="text-center opacity-60">
                    No budgeted campaigns yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Billing performance</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <tbody>
              <tr>
                <td className="font-medium">Total invoiced</td>
                <td className="text-right">{money(billingPerf.total)}</td>
              </tr>
              <tr>
                <td className="font-medium">Collected</td>
                <td className="text-right text-success">{money(billingPerf.collected)}</td>
              </tr>
              <tr>
                <td className="font-medium">Outstanding</td>
                <td className="text-right text-warning">{money(billingPerf.outstanding)}</td>
              </tr>
              <tr>
                <td className="font-medium">Overdue</td>
                <td className="text-right text-error">{money(billingPerf.overdue)}</td>
              </tr>
              <tr>
                <td className="font-medium">Disputed invoices</td>
                <td className="text-right">{billingPerf.disputed}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Approval performance</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <tbody>
              <tr>
                <td className="font-medium">Total requests</td>
                <td className="text-right">{approvalPerf.total}</td>
              </tr>
              <tr>
                <td className="font-medium">Pending</td>
                <td className="text-right text-warning">{approvalPerf.pending}</td>
              </tr>
              <tr>
                <td className="font-medium">Approved</td>
                <td className="text-right text-success">{approvalPerf.approved}</td>
              </tr>
              <tr>
                <td className="font-medium">Rejected</td>
                <td className="text-right text-error">{approvalPerf.rejected}</td>
              </tr>
              <tr>
                <td className="font-medium">Changes requested</td>
                <td className="text-right">{approvalPerf.changes}</td>
              </tr>
              <tr>
                <td className="font-medium">Avg. days waiting (pending)</td>
                <td className="text-right">
                  {avgWait != null ? `${avgWait.toFixed(1)} days` : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Work not yet billed</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Campaign</th>
                <th className="text-right">Entries</th>
                <th className="text-right">Hours</th>
              </tr>
            </thead>
            <tbody>
              {[...unbilledByCampaign.entries()].map(([campId, data]) => {
                const camp = (campaigns ?? []).find((c) => c.id === campId);
                return (
                  <tr key={campId}>
                    <td>
                      <Link href={`/app/campaigns/${campId}`} className="link link-hover">
                        {camp?.campaign_name ?? campId}
                      </Link>
                    </td>
                    <td className="text-right">{data.entries}</td>
                    <td className="text-right">{data.hours.toFixed(1)}</td>
                  </tr>
                );
              })}
              {!unbilledByCampaign.size ? (
                <tr>
                  <td colSpan={3} className="text-center opacity-60">
                    All approved billable work has been invoiced.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
