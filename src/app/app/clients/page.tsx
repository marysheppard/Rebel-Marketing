import { ClientsExplorer } from "@/components/ClientsExplorer";
import { CreateClientForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { canManageClients, requireRoles } from "@/lib/page-auth";
import { parsePeriodParam } from "@/lib/period-url";
import { getManagedClientIds } from "@/lib/portfolio";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, profile, userId } = await requireRoles([
    "agency_manager",
    "account_manager",
    "billing",
  ]);

  const scope = await getManagedClientIds(supabase, userId, profile.role);

  const [{ data: clients }, { data: invoices }, { data: campaigns }, { data: costs }, { data: managers }] =
    await Promise.all([
      supabase.from("clients").select("*").order("client_name"),
      supabase.from("invoices").select("*, payments(amount)"),
      supabase.from("campaigns").select("id, client_id"),
      supabase.from("costs").select("campaign_id, amount, client_id, cost_date"),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["agency_manager", "account_manager"]),
    ]);

  let list = clients ?? [];
  if (scope !== "all") {
    const set = new Set(scope);
    list = list.filter((c) => set.has(c.id));
  }

  const clientIds = new Set(list.map((c) => c.id));
  const scopedCampaigns = (campaigns ?? []).filter((c) =>
    clientIds.has(c.client_id),
  );
  const campIds = new Set(scopedCampaigns.map((c) => c.id));
  const scopedInvoices = (invoices ?? []).filter((i) =>
    clientIds.has(i.client_id),
  );
  const scopedCosts = (costs ?? []).filter(
    (c) =>
      (c.client_id && clientIds.has(c.client_id)) ||
      (c.campaign_id && campIds.has(c.campaign_id)),
  );

  const showForm = canManageClients(profile.role);

  return (
    <div>
      <PageHeader
        title={profile.role === "account_manager" ? "My Clients" : "Clients"}
        subtitle={
          profile.role === "account_manager"
            ? "Clients assigned to you — contract and profitability snapshot"
            : "Accounts, profitability, and outstanding balances"
        }
      />

      <ClientsExplorer
        initialPeriod={parsePeriodParam(sp.period)}
        source={{
          clients: list.map((c) => ({
            id: c.id,
            client_name: c.client_name,
            industry: c.industry,
            status: c.status,
            created_at: c.created_at,
          })),
          campaigns: scopedCampaigns,
          invoices: scopedInvoices,
          costs: scopedCosts,
        }}
      />

      {showForm ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">New client</h2>
          <CreateClientForm
            accountManagers={(managers ?? []).map((m) => ({
              id: m.id,
              label: m.full_name,
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}
