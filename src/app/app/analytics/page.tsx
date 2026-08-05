import {
  CtrByCampaignChart,
  ImpressionsClicksTrendChart,
} from "@/components/Charts";
import { ClientAnalyticsPicker } from "@/components/ClientAnalyticsPicker";
import { ClientGrowthSection } from "@/components/ClientGrowthSection";
import { PortfolioGrowthSection } from "@/components/PortfolioGrowthSection";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { money, moneyExact, num } from "@/lib/format";
import {
  getProfile,
  isClientRole,
  isEmployeeWorkRole,
} from "@/lib/page-auth";
import { redirect } from "next/navigation";

type Search = { searchParams: Promise<{ client?: string }> };

function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

export default async function AnalyticsPage({ searchParams }: Search) {
  const { client: clientParam } = await searchParams;
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;

  if (isClientRole(profile.role) || !isEmployeeWorkRole(profile.role)) {
    redirect("/app");
  }

  if (
    profile.role !== "agency_manager" &&
    profile.role !== "account_manager" &&
    profile.role !== "marketing"
  ) {
    redirect("/app");
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const d30 = new Date(today);
  d30.setDate(d30.getDate() - 30);
  const d60 = new Date(today);
  d60.setDate(d60.getDate() - 60);
  const last30Start = d30.toISOString().slice(0, 10);
  const prior30Start = d60.toISOString().slice(0, 10);

  const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
  const quarterStart = `${today.getFullYear()}-${String(quarterMonth + 1).padStart(2, "0")}-01`;

  const [{ data: ownedClients }, { data: assignments }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, client_name, status, created_at")
      .eq("account_manager_id", userId)
      .order("client_name"),
    supabase
      .from("campaign_assignments")
      .select(
        "campaign_id, campaigns(id, campaign_name, campaign_type, campaign_status, client_id, start_date, clients(client_name, status, created_at))",
      )
      .eq("user_id", userId),
  ]);

  const ownedIds = (ownedClients ?? []).map((c) => c.id as string);
  const { data: ownedCampaigns } =
    ownedIds.length > 0
      ? await supabase
          .from("campaigns")
          .select(
            "id, campaign_name, campaign_type, campaign_status, client_id, start_date",
          )
          .in("client_id", ownedIds)
      : {
          data: [] as {
            id: string;
            campaign_name: string;
            campaign_type: string;
            campaign_status: string;
            client_id: string;
            start_date: string;
          }[],
        };

  type ScopedCampaign = {
    id: string;
    name: string;
    client_id: string;
    campaign_type: string;
    campaign_status: string;
  };

  type ClientMeta = {
    name: string;
    status: string;
    created_at: string | null;
  };

  const clientMeta = new Map<string, ClientMeta>();
  const campaignsByClient = new Map<string, ScopedCampaign[]>();

  function addCampaign(clientId: string, camp: ScopedCampaign) {
    const list = campaignsByClient.get(clientId) ?? [];
    if (!list.some((x) => x.id === camp.id)) {
      list.push(camp);
    }
    campaignsByClient.set(clientId, list);
  }

  for (const c of ownedClients ?? []) {
    clientMeta.set(c.id, {
      name: c.client_name,
      status: String(c.status ?? ""),
      created_at: c.created_at ? String(c.created_at) : null,
    });
    if (!campaignsByClient.has(c.id)) campaignsByClient.set(c.id, []);
  }

  for (const camp of ownedCampaigns ?? []) {
    addCampaign(camp.client_id, {
      id: camp.id,
      name: camp.campaign_name,
      client_id: camp.client_id,
      campaign_type: String(camp.campaign_type ?? "Other"),
      campaign_status: String(camp.campaign_status ?? ""),
    });
  }

  for (const row of assignments ?? []) {
    const campRaw = row.campaigns as unknown;
    const camp = Array.isArray(campRaw)
      ? (campRaw[0] as Record<string, unknown> | undefined)
      : (campRaw as Record<string, unknown> | null | undefined);
    if (!camp) continue;
    const clientId = String(camp.client_id ?? "");
    if (!clientId) continue;
    const clientsRaw = camp.clients as unknown;
    const clientObj = Array.isArray(clientsRaw)
      ? (clientsRaw[0] as {
          client_name?: string;
          status?: string;
          created_at?: string;
        } | undefined)
      : (clientsRaw as {
          client_name?: string;
          status?: string;
          created_at?: string;
        } | null | undefined);
    if (!clientMeta.has(clientId)) {
      clientMeta.set(clientId, {
        name: clientObj?.client_name ?? "Client",
        status: String(clientObj?.status ?? ""),
        created_at: clientObj?.created_at
          ? String(clientObj.created_at)
          : null,
      });
    }
    addCampaign(clientId, {
      id: String(camp.id),
      name: String(camp.campaign_name ?? "Campaign"),
      client_id: clientId,
      campaign_type: String(camp.campaign_type ?? "Other"),
      campaign_status: String(camp.campaign_status ?? ""),
    });
  }

  const scopedClients = [...clientMeta.entries()]
    .map(([id, meta]) => ({ id, name: meta.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (scopedClients.length === 0) {
    return (
      <div>
        <PageHeader
          title="Analytics"
          subtitle="Digital performance by client for your assigned work"
        />
        <EmptyState
          title="No clients in scope"
          description="When you're staffed on campaigns or own client accounts, pick a client here to see clicks, CTR, and conversions."
        />
      </div>
    );
  }

  const allScopedCampaigns = [...campaignsByClient.values()].flat();
  const allScopedCampaignIds = allScopedCampaigns.map((c) => c.id);

  const activeClients = [...clientMeta.values()].filter((c) => {
    const s = (c.status ?? "").toLowerCase();
    return s === "active" || s === "active client";
  }).length;
  const newClientsQuarter = [...clientMeta.values()].filter((c) => {
    if (!c.created_at) return false;
    return c.created_at.slice(0, 10) >= quarterStart;
  }).length;
  const activeCampaigns = allScopedCampaigns.filter(
    (c) => c.campaign_status === "Active" || c.campaign_status === "Late",
  ).length;

  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthKeys.push(monthKey(d));
  }
  const newByMonth = new Map(monthKeys.map((k) => [k, 0]));
  for (const meta of clientMeta.values()) {
    if (!meta.created_at) continue;
    const key = meta.created_at.slice(0, 7);
    if (newByMonth.has(key)) {
      newByMonth.set(key, (newByMonth.get(key) ?? 0) + 1);
    }
  }
  const newClientsByMonth = monthKeys.map((k) => ({
    month: monthLabel(k),
    count: newByMonth.get(k) ?? 0,
  }));

  const { data: portfolioMetricRows } =
    allScopedCampaignIds.length > 0
      ? await supabase
          .from("campaign_metrics")
          .select("campaign_id, metric_date, conversions")
          .in("campaign_id", allScopedCampaignIds)
          .gte("metric_date", last30Start)
          .lte("metric_date", todayStr)
      : { data: [] as { campaign_id: string; metric_date: string; conversions: number }[] };

  const conversions30d = (portfolioMetricRows ?? []).reduce(
    (s, m) => s + num(m.conversions),
    0,
  );

  const selectedId =
    clientParam && scopedClients.some((c) => c.id === clientParam)
      ? clientParam
      : scopedClients[0]!.id;

  const clientCampaigns = campaignsByClient.get(selectedId) ?? [];
  const campaignIds = clientCampaigns.map((c) => c.id);
  const campaignNameById = new Map(
    clientCampaigns.map((c) => [c.id, c.name] as const),
  );
  const campaignTypeById = new Map(
    clientCampaigns.map((c) => [c.id, c.campaign_type] as const),
  );

  const { data: metricRows } =
    campaignIds.length > 0
      ? await supabase
          .from("campaign_metrics")
          .select(
            "campaign_id, metric_date, impressions, clicks, conversions, spend",
          )
          .in("campaign_id", campaignIds)
          .order("metric_date", { ascending: true })
      : {
          data: [] as {
            campaign_id: string;
            metric_date: string;
            impressions: number;
            clicks: number;
            conversions: number;
            spend: number;
          }[],
        };

  type CampAgg = {
    name: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  };

  const byCampaign = new Map<string, CampAgg>();
  const byDate = new Map<string, { impressions: number; clicks: number }>();

  type PeriodAgg = {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  };
  const emptyPeriod = (): PeriodAgg => ({
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
  });
  let currentPeriod = emptyPeriod();
  let priorPeriod = emptyPeriod();

  type StratAgg = PeriodAgg;
  const strategyCurrent = new Map<string, StratAgg>();
  const strategyPrior = new Map<string, StratAgg>();

  function bumpStrategy(
    map: Map<string, StratAgg>,
    type: string,
    impressions: number,
    clicks: number,
    conversions: number,
    spend: number,
  ) {
    const prev = map.get(type) ?? emptyPeriod();
    prev.impressions += impressions;
    prev.clicks += clicks;
    prev.conversions += conversions;
    prev.spend += spend;
    map.set(type, prev);
  }

  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let totalSpend = 0;

  for (const m of metricRows ?? []) {
    const cid = String(m.campaign_id);
    const impressions = num(m.impressions);
    const clicks = num(m.clicks);
    const conversions = num(m.conversions);
    const spend = num(m.spend);
    const d = String(m.metric_date);
    const type = campaignTypeById.get(cid) ?? "Other";

    totalImpressions += impressions;
    totalClicks += clicks;
    totalConversions += conversions;
    totalSpend += spend;

    const prev = byCampaign.get(cid) ?? {
      name: campaignNameById.get(cid) ?? "Campaign",
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
    };
    prev.impressions += impressions;
    prev.clicks += clicks;
    prev.conversions += conversions;
    prev.spend += spend;
    byCampaign.set(cid, prev);

    const day = byDate.get(d) ?? { impressions: 0, clicks: 0 };
    day.impressions += impressions;
    day.clicks += clicks;
    byDate.set(d, day);

    if (d >= last30Start && d <= todayStr) {
      currentPeriod.impressions += impressions;
      currentPeriod.clicks += clicks;
      currentPeriod.conversions += conversions;
      currentPeriod.spend += spend;
      bumpStrategy(strategyCurrent, type, impressions, clicks, conversions, spend);
    } else if (d >= prior30Start && d < last30Start) {
      priorPeriod.impressions += impressions;
      priorPeriod.clicks += clicks;
      priorPeriod.conversions += conversions;
      priorPeriod.spend += spend;
      bumpStrategy(strategyPrior, type, impressions, clicks, conversions, spend);
    }
  }

  for (const c of clientCampaigns) {
    if (!byCampaign.has(c.id)) {
      byCampaign.set(c.id, {
        name: c.name,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
      });
    }
  }

  const ctrPct =
    totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 10000) / 100
      : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

  const currentCpa =
    currentPeriod.conversions > 0
      ? currentPeriod.spend / currentPeriod.conversions
      : 0;
  const priorCpa =
    priorPeriod.conversions > 0
      ? priorPeriod.spend / priorPeriod.conversions
      : 0;

  const clicksDeltaPct = pctChange(currentPeriod.clicks, priorPeriod.clicks);
  const conversionsDeltaPct = pctChange(
    currentPeriod.conversions,
    priorPeriod.conversions,
  );
  const spendDeltaPct = pctChange(currentPeriod.spend, priorPeriod.spend);
  const cpaDeltaPct =
    priorCpa === 0 && currentCpa === 0
      ? 0
      : priorCpa === 0
        ? null
        : pctChange(currentCpa, priorCpa);

  const strategyTypes = [
    ...new Set([
      ...strategyCurrent.keys(),
      ...strategyPrior.keys(),
      ...clientCampaigns.map((c) => c.campaign_type),
    ]),
  ].sort();

  const strategySpendPie = strategyTypes
    .map((type) => ({
      name: type,
      value: strategyCurrent.get(type)?.spend ?? 0,
    }))
    .filter((d) => d.value > 0);

  const strategyConversionsBars = strategyTypes
    .map((type) => ({
      name: type,
      conversions: strategyCurrent.get(type)?.conversions ?? 0,
    }))
    .filter((d) => d.conversions > 0);

  const strategyRows = strategyTypes
    .map((type) => {
      const cur = strategyCurrent.get(type) ?? emptyPeriod();
      const prior = strategyPrior.get(type) ?? emptyPeriod();
      return {
        type,
        spend: cur.spend,
        clicks: cur.clicks,
        impressions: cur.impressions,
        conversions: cur.conversions,
        ctr:
          cur.impressions > 0
            ? Math.round((cur.clicks / cur.impressions) * 10000) / 100
            : 0,
        cpa: cur.conversions > 0 ? cur.spend / cur.conversions : 0,
        conversionsDeltaPct: pctChange(cur.conversions, prior.conversions),
      };
    })
    .filter((r) => r.spend > 0 || r.clicks > 0 || r.conversions > 0)
    .sort((a, b) => b.spend - a.spend);

  const ctrByCampaign = [...byCampaign.values()]
    .map((r) => ({
      name: r.name,
      ctr:
        r.impressions > 0
          ? Math.round((r.clicks / r.impressions) * 10000) / 100
          : 0,
    }))
    .sort((a, b) => b.ctr - a.ctr);

  const trendSeries = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date: date.slice(5),
      impressions: v.impressions,
      clicks: v.clicks,
    }));

  const tableRows = [...byCampaign.entries()]
    .map(([id, r]) => ({
      id,
      name: r.name,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr:
        r.impressions > 0
          ? Math.round((r.clicks / r.impressions) * 10000) / 100
          : 0,
      conversions: r.conversions,
      spend: r.spend,
      cpc: r.clicks > 0 ? r.spend / r.clicks : 0,
      cpa: r.conversions > 0 ? r.spend / r.conversions : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  const hasMetrics = (metricRows ?? []).length > 0;
  const selectedName =
    scopedClients.find((c) => c.id === selectedId)?.name ?? "Client";

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Portfolio growth and digital performance by client strategy"
      />

      <PortfolioGrowthSection
        activeClients={activeClients}
        newClientsQuarter={newClientsQuarter}
        activeCampaigns={activeCampaigns}
        conversions30d={conversions30d}
        newClientsByMonth={newClientsByMonth}
      />

      <div className="mb-6">
        <ClientAnalyticsPicker
          clients={scopedClients}
          selectedId={selectedId}
        />
      </div>

      <h2 className="mb-3 text-lg font-bold text-[#0b1f3a]">{selectedName}</h2>

      {clientCampaigns.length === 0 ? (
        <EmptyState
          title="No campaigns for this client"
          description="Staff this client’s campaigns to see performance here."
        />
      ) : !hasMetrics ? (
        <EmptyState
          title="No metrics yet"
          description="Impressions, clicks, and conversions will show once campaign metrics are available."
        />
      ) : (
        <>
          <ClientGrowthSection
            clicksDeltaPct={clicksDeltaPct}
            conversionsDeltaPct={conversionsDeltaPct}
            spendDeltaPct={spendDeltaPct}
            cpaDeltaPct={cpaDeltaPct}
            strategySpendPie={strategySpendPie}
            strategyConversionsBars={strategyConversionsBars}
            strategyRows={strategyRows}
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <StatCard
              label="Impressions"
              value={totalImpressions.toLocaleString()}
            />
            <StatCard label="Clicks" value={totalClicks.toLocaleString()} />
            <StatCard label="CTR" value={`${ctrPct}%`} />
            <StatCard
              label="Conversions"
              value={totalConversions.toLocaleString()}
            />
            <StatCard label="Spend" value={money(totalSpend)} />
            <StatCard label="CPC" value={moneyExact(cpc)} />
            <StatCard
              label="Cost / conv."
              value={totalConversions > 0 ? moneyExact(cpa) : "—"}
            />
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <ImpressionsClicksTrendChart data={trendSeries} />
            </div>
            <div className="lg:col-span-2">
              <CtrByCampaignChart data={ctrByCampaign} />
            </div>
          </div>

          <section className="mt-8">
            <h3 className="mb-3 text-lg font-bold">Campaign breakdown</h3>
            <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
              <table className="table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th className="text-right">Impressions</th>
                    <th className="text-right">Clicks</th>
                    <th className="text-right">CTR</th>
                    <th className="text-right">Conversions</th>
                    <th className="text-right">Spend</th>
                    <th className="text-right">CPC</th>
                    <th className="text-right">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.name}</td>
                      <td className="text-right">
                        {r.impressions.toLocaleString()}
                      </td>
                      <td className="text-right">
                        {r.clicks.toLocaleString()}
                      </td>
                      <td className="text-right">{r.ctr}%</td>
                      <td className="text-right">
                        {r.conversions.toLocaleString()}
                      </td>
                      <td className="text-right">{money(r.spend)}</td>
                      <td className="text-right">
                        {r.clicks > 0 ? moneyExact(r.cpc) : "—"}
                      </td>
                      <td className="text-right">
                        {r.conversions > 0 ? moneyExact(r.cpa) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
