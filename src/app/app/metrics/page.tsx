import { PageHeader, StatCard } from "@/components/ui";
import { NamedBarChart } from "@/components/tasks/NamedBarChart";
import { loadFinanceBundle } from "@/lib/finance-data";
import { money, num, pct } from "@/lib/format";
import {
  acquisitionCostsInPeriod,
  aggregateCampaignMetrics,
  avgClv,
  computeCac,
  computeRetentionRate,
  computeRoas,
  computeRoi,
  newClientsInPeriod,
  revenueFromInvoices,
  totalAdSpend,
} from "@/lib/metrics";
import { requireRoles } from "@/lib/page-auth";

export default async function MarketingMetricsPage() {
  const { supabase, profile, userId } = await requireRoles([
    "account_manager",
    "agency_manager",
  ]);

  const bundle = await loadFinanceBundle(supabase, userId, profile.role);
  const { clients, costs, invoices, metrics, campaigns } = bundle;

  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const revenue = revenueFromInvoices(invoices);
  const totalCosts = costs.reduce((s, c) => s + num(c.amount), 0);
  const adSpend = totalAdSpend(metrics, costs);
  const agg = aggregateCampaignMetrics(metrics);
  const acquisition = acquisitionCostsInPeriod(costs, yearAgo, now) + adSpend;
  const newClients = newClientsInPeriod(clients, yearAgo, now);

  const byCampaign = campaigns
    .map((c) => {
      const campMetrics = metrics.filter((m) => m.campaign_id === c.id);
      const m = aggregateCampaignMetrics(campMetrics);
      const rev = invoices
        .filter(
          (i) =>
            i.campaign_id === c.id && !["Draft", "Canceled"].includes(i.status),
        )
        .reduce((s, i) => s + num(i.total_amount), 0);
      return {
        name: c.campaign_name,
        clicks: m.clicks,
        impressions: m.impressions,
        spend: m.spend,
        ctr: m.ctr,
        roas: computeRoas(rev, m.spend),
        revenue: rev,
      };
    })
    .filter((r) => r.clicks > 0 || r.spend > 0 || r.revenue > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campaign Performance"
        subtitle={
          profile.role === "account_manager"
            ? "CAC, ROI, ROAS, CTR, retention, and CLV for your portfolio — performance metrics, not P&L"
            : "Agency marketing performance metrics — distinct from profitability"
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Customer Acquisition Cost"
          value={money(computeCac(acquisition, newClients) ?? 0)}
          hint={`${newClients} new clients · 12 months`}
        />
        <StatCard label="ROI" value={pct(computeRoi(revenue, totalCosts))} />
        <StatCard
          label="ROAS"
          value={
            computeRoas(revenue, adSpend) != null
              ? `${computeRoas(revenue, adSpend)!.toFixed(2)}x`
              : "—"
          }
          hint={`Ad spend ${money(adSpend)}`}
        />
        <StatCard
          label="CTR"
          value={pct(agg.ctr)}
          hint={`${agg.clicks.toLocaleString()} / ${agg.impressions.toLocaleString()}`}
        />
        <StatCard
          label="Client retention rate"
          value={pct(computeRetentionRate(clients))}
        />
        <StatCard
          label="Avg client lifetime value"
          value={money(avgClv(clients, invoices) ?? 0)}
        />
      </div>

      <NamedBarChart
        title="Clicks by campaign"
        data={byCampaign.slice(0, 12).map((c) => ({
          name: c.name,
          value: c.clicks,
        }))}
      />

      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>CTR</th>
              <th>Ad spend</th>
              <th>Attributed revenue</th>
              <th>ROAS</th>
            </tr>
          </thead>
          <tbody>
            {byCampaign.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.impressions.toLocaleString()}</td>
                <td>{r.clicks.toLocaleString()}</td>
                <td>{pct(r.ctr)}</td>
                <td>{money(r.spend)}</td>
                <td>{money(r.revenue)}</td>
                <td>
                  {r.roas != null ? `${r.roas.toFixed(2)}x` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
