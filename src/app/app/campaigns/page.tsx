import { CampaignsExplorer } from "@/components/CampaignsExplorer";
import { CreateCampaignForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import {
  canManageCampaigns,
  isClientRole,
  requireRoles,
} from "@/lib/page-auth";
import { parsePeriodParam } from "@/lib/period-url";
import { getManagedClientIds } from "@/lib/portfolio";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; client?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, profile, userId } = await requireRoles([
    "agency_manager",
    "account_manager",
    "marketing",
    "billing",
    "client",
  ]);

  const scope = await getManagedClientIds(supabase, userId, profile.role);

  const [
    { data: campaigns },
    { data: clients },
    { data: contracts },
    { data: costs },
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*, clients(client_name)")
      .order("campaign_name"),
    supabase.from("clients").select("id, client_name").order("client_name"),
    supabase
      .from("contracts")
      .select("id, contract_name, contract_number, client_id")
      .order("contract_name"),
    supabase.from("costs").select("campaign_id, amount, cost_date"),
  ]);

  let list = campaigns ?? [];
  if (profile.role === "account_manager" && scope !== "all") {
    const set = new Set(scope);
    list = list.filter((c) => set.has(c.client_id));
  }
  const showForm =
    canManageCampaigns(profile.role) && !isClientRole(profile.role);

  const campIds = new Set(list.map((c) => c.id));
  const scopedCosts = (costs ?? []).filter(
    (c) => c.campaign_id && campIds.has(c.campaign_id),
  );

  let formClients = clients ?? [];
  if (profile.role === "account_manager" && scope !== "all") {
    const set = new Set(scope);
    formClients = formClients.filter((c) => set.has(c.id));
  }

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle="Delivery tracking with live budget health"
      />

      <CampaignsExplorer
        initialPeriod={parsePeriodParam(sp.period)}
        initialClientId={sp.client ?? "all"}
        source={{
          campaigns: list.map((c) => ({
            id: c.id,
            campaign_name: c.campaign_name,
            campaign_type: c.campaign_type,
            campaign_status: c.campaign_status,
            campaign_budget: c.campaign_budget,
            client_id: c.client_id,
            start_date: c.start_date,
            end_date: c.end_date,
            clients: (c as { clients?: { client_name: string } | null }).clients,
          })),
          costs: scopedCosts,
        }}
      />

      {showForm ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">New campaign</h2>
          <CreateCampaignForm
            clients={formClients.map((c) => ({
              id: c.id,
              label: c.client_name,
            }))}
            contracts={(contracts ?? []).map((c) => ({
              id: c.id,
              label: `${c.contract_name} (${c.contract_number})`,
              client_id: c.client_id,
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}
