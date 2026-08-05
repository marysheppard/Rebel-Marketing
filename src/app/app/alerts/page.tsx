import { RoleAlertList } from "@/components/dashboards/AlertPanel";
import { PageHeader } from "@/components/ui";
import { buildControlAlerts } from "@/lib/controls";
import { loadFinanceBundle } from "@/lib/finance-data";
import { num } from "@/lib/format";
import {
  clientProfitabilityRow,
  computeRoas,
  costsByClient,
  revenueByClient,
} from "@/lib/metrics";
import { requireRoles } from "@/lib/page-auth";

export default async function AlertsPage() {
  const { supabase, profile, userId } = await requireRoles([
    "account_manager",
    "agency_manager",
  ]);

  const bundle = await loadFinanceBundle(supabase, userId, profile.role);
  const {
    clients,
    campaigns,
    costs,
    invoices,
    work,
    contracts,
    metrics,
    approvals,
    profiles,
  } = bundle;

  const revByClient = revenueByClient(invoices);
  const costMap = costsByClient(costs);
  const campClient = new Map(campaigns.map((c) => [c.id, c.client_id]));
  const rates = new Map(
    profiles.map((p) => [p.id, num(p.internal_cost_rate ?? 75)]),
  );
  const laborMap = new Map<string, number>();
  for (const w of work) {
    const clientId = campClient.get(w.campaign_id);
    if (!clientId) continue;
    laborMap.set(
      clientId,
      (laborMap.get(clientId) ?? 0) +
        num(w.hours) * (rates.get(w.user_id) ?? 75),
    );
  }

  const clientProfit = clients.map((cl) => {
    const rev = revByClient.get(cl.id) ?? 0;
    const labor = laborMap.get(cl.id) ?? 0;
    const direct = costMap.get(cl.id) ?? 0;
    const row = clientProfitabilityRow(
      cl.id,
      cl.client_name,
      rev,
      direct,
      labor,
      0,
    );
    return {
      clientId: row.clientId,
      name: row.name,
      revenue: row.revenue,
      costs: row.costs,
      margin: row.margin,
    };
  });

  const campaignRoas = campaigns.map((c) => {
    const campMetrics = metrics.filter((m) => m.campaign_id === c.id);
    const spend = campMetrics.reduce((s, m) => s + num(m.spend), 0);
    const rev = invoices
      .filter(
        (i) =>
          i.campaign_id === c.id && !["Draft", "Canceled"].includes(i.status),
      )
      .reduce((s, i) => s + num(i.total_amount), 0);
    return {
      campaignId: c.id,
      name: c.campaign_name,
      clientId: c.client_id,
      roas: computeRoas(rev, spend),
    };
  });

  const campIds = campaigns.map((c) => c.id);
  const { data: taskRows } = campIds.length
    ? await supabase
        .from("tasks")
        .select("id, title, due_date, status, campaigns(client_id)")
        .in("campaign_id", campIds)
    : { data: [] as never[] };

  const alerts = buildControlAlerts({
    campaigns,
    contracts,
    costs,
    work,
    approvals,
    invoices,
    clients,
    clientProfit,
    campaignRoas,
    tasks: (taskRows ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
      status: t.status,
      client_id:
        (t.campaigns as { client_id?: string } | null)?.client_id ?? null,
    })),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        subtitle={
          profile.role === "account_manager"
            ? "Exceptions for your managed clients"
            : "Agency portfolio exceptions"
        }
      />
      <RoleAlertList
        alerts={alerts}
        emptyTitle="No alerts"
        emptyDescription="Budgets, margins, billing, and deadlines look clear for this portfolio."
      />
    </div>
  );
}
