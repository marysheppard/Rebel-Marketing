import { PageHeader } from "@/components/ui";
import {
  ProfitabilityExplorer,
  type ProfitabilitySource,
} from "@/components/dashboards/ProfitabilityExplorer";
import { ProfitabilityExportButton } from "@/components/dashboards/ProfitabilityExportButton";
import { loadFinanceBundle } from "@/lib/finance-data";
import { requireRoles } from "@/lib/page-auth";
import { parsePeriodParam } from "@/lib/period-url";

export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; client?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, profile, userId } = await requireRoles([
    "account_manager",
    "agency_manager",
  ]);

  const bundle = await loadFinanceBundle(supabase, userId, profile.role);
  const { clients, campaigns, costs, invoices, work, profiles } = bundle;

  const source: ProfitabilitySource = {
    clients: clients.map((c) => ({
      id: c.id,
      client_name: c.client_name,
      status: c.status,
      account_manager_id: c.account_manager_id,
    })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      campaign_name: c.campaign_name,
      client_id: c.client_id,
      clients: (c as { clients?: { client_name: string } | null }).clients ?? null,
    })),
    invoices: invoices.map((i) => ({
      client_id: i.client_id,
      campaign_id: i.campaign_id,
      total_amount: i.total_amount,
      status: i.status,
      invoice_date: i.invoice_date,
    })),
    costs: costs.map((c) => ({
      client_id: c.client_id ?? null,
      campaign_id: c.campaign_id ?? null,
      amount: c.amount,
      cost_date: c.cost_date,
    })),
    work: work.map((w) => ({
      campaign_id: w.campaign_id,
      user_id: w.user_id,
      hours: w.hours,
      work_date: w.work_date,
    })),
    profiles: profiles.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      internal_cost_rate: p.internal_cost_rate,
    })),
  };

  const isAgency = profile.role === "agency_manager";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAgency ? "Firm Profitability" : "Client Profitability"}
        subtitle={
          isAgency
            ? "Money view — filter by period, client, campaign, or account manager"
            : "Money view for your managed clients"
        }
        actions={
          <ProfitabilityExportButton
            source={source}
            showAccountManagers={isAgency}
          />
        }
      />

      <ProfitabilityExplorer
        source={source}
        showAccountManagers={isAgency}
        initialPeriod={parsePeriodParam(sp.period)}
        initialClientId={sp.client}
      />
    </div>
  );
}
