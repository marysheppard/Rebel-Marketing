import Link from "next/link";
import { CreateCampaignForm } from "@/components/forms";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { money, num } from "@/lib/format";
import { budgetHealth } from "@/lib/finance";
import { canManageCampaigns, getProfile, isClientRole } from "@/lib/page-auth";

function BudgetBadge({ budget, spent }: { budget: number; spent: number }) {
  const health = budgetHealth(budget, spent);
  const cls =
    health === "over"
      ? "badge-error"
      : health === "near"
        ? "badge-warning"
        : health === "under"
          ? "badge-success"
          : "badge-ghost";
  const label =
    health === "over"
      ? "Over budget"
      : health === "near"
        ? "Near budget"
        : health === "under"
          ? "Under budget"
          : "No budget";
  return <span className={`badge badge-sm ${cls}`}>{label}</span>;
}

export default async function CampaignsPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  const [{ data: campaigns }, { data: clients }, { data: contracts }, { data: costs }] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select("*, clients(client_name)")
        .order("start_date", { ascending: false }),
      supabase.from("clients").select("id, client_name").order("client_name"),
      supabase
        .from("contracts")
        .select("id, contract_name, contract_number, client_id")
        .order("contract_name"),
      supabase.from("costs").select("campaign_id, amount"),
    ]);

  const spentByCampaign = new Map<string, number>();
  for (const c of costs ?? []) {
    if (!c.campaign_id) continue;
    spentByCampaign.set(
      c.campaign_id,
      (spentByCampaign.get(c.campaign_id) ?? 0) + num(c.amount),
    );
  }

  const list = campaigns ?? [];
  const showForm = canManageCampaigns(profile.role) && !isClientRole(profile.role);

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle="Delivery tracking with live budget health"
      />

      {list.length === 0 ? (
        <EmptyState
          title="No campaigns"
          description="Launch a campaign under an active contract to track work, costs, and billing."
        />
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Client</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-right">Budget</th>
                <th className="text-right">Spent</th>
                <th className="text-right">Remaining</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const spent = spentByCampaign.get(c.id) ?? 0;
                const budget = num(c.campaign_budget);
                const remaining = budget - spent;
                return (
                  <tr key={c.id} className="hover">
                    <td>
                      <Link href={`/app/campaigns/${c.id}`} className="link link-hover font-medium">
                        {c.campaign_name}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/app/clients/${c.client_id}`} className="link link-hover">
                        {(c as { clients?: { client_name: string } }).clients?.client_name ?? "—"}
                      </Link>
                    </td>
                    <td>{c.campaign_type}</td>
                    <td>
                      <StatusBadge status={c.campaign_status} />
                    </td>
                    <td className="text-right">{money(budget)}</td>
                    <td className="text-right">{money(spent)}</td>
                    <td className={`text-right ${remaining < 0 ? "text-error" : ""}`}>
                      {money(remaining)}
                    </td>
                    <td>
                      <BudgetBadge budget={budget} spent={spent} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">New campaign</h2>
          <CreateCampaignForm
            clients={(clients ?? []).map((c) => ({ id: c.id, label: c.client_name }))}
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
