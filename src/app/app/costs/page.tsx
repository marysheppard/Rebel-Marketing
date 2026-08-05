import { CreateCostForm } from "@/components/forms";
import { NamedBarChart } from "@/components/tasks/NamedBarChart";
import { EmptyState, PageHeader } from "@/components/ui";
import { money, num } from "@/lib/format";
import { budgetVariance } from "@/lib/finance";
import { canManageCosts, requireRoles } from "@/lib/page-auth";
import Link from "next/link";

export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client: clientFilter } = await searchParams;
  const { supabase, profile } = await requireRoles([
    "agency_manager",
    "account_manager",
  ]);

  const [{ data: costs }, { data: campaigns }, { data: clients }] =
    await Promise.all([
      supabase
        .from("costs")
        .select("*, campaigns(campaign_name, campaign_budget, client_id)")
        .order("cost_date", { ascending: false }),
      supabase
        .from("campaigns")
        .select("id, campaign_name, client_id")
        .in("campaign_status", ["Active", "Late", "On Hold", "Completed"])
        .order("campaign_name"),
      supabase.from("clients").select("id, client_name").order("client_name"),
    ]);

  const campClient = new Map(
    (campaigns ?? []).map((c) => [c.id, c.client_id]),
  );

  let list = costs ?? [];
  if (clientFilter) {
    list = list.filter((c) => {
      const fromJoin = (
        c as { campaigns?: { client_id?: string } | null }
      ).campaigns?.client_id;
      const fromMap = c.campaign_id ? campClient.get(c.campaign_id) : null;
      return (fromJoin ?? fromMap) === clientFilter;
    });
  }

  const spentByCampaign = new Map<string, number>();
  for (const c of list) {
    if (!c.campaign_id) continue;
    spentByCampaign.set(
      c.campaign_id,
      (spentByCampaign.get(c.campaign_id) ?? 0) + num(c.amount),
    );
  }

  const showForm = canManageCosts(profile.role);
  const filterName = clientFilter
    ? (clients ?? []).find((c) => c.id === clientFilter)?.client_name
    : null;

  const byType = new Map<string, number>();
  for (const c of list) {
    const key = String(c.cost_type || "Other");
    byType.set(key, (byType.get(key) ?? 0) + num(c.amount));
  }
  const typeChart = [...byType.entries()]
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const formCampaigns = (campaigns ?? []).filter(
    (c) => !clientFilter || c.client_id === clientFilter,
  );

  return (
    <div>
      <PageHeader
        title="Costs"
        subtitle={
          filterName
            ? `Campaign spend for ${filterName}`
            : "Campaign spend with budget variance context"
        }
        actions={
          filterName ? (
            <Link href="/app/costs" className="btn btn-ghost btn-sm">
              Clear client filter
            </Link>
          ) : null
        }
      />

      {list.length === 0 ? (
        <EmptyState
          title="No costs recorded"
          description={
            filterName
              ? `No costs for ${filterName} yet.`
              : "Track media, production, freelance, and pass-through expenses against campaigns."
          }
        />
      ) : (
        <>
          <div className="mb-8 max-w-xl">
            <NamedBarChart
              title="Spend by cost type"
              data={typeChart}
              valueKey="amount"
              color="#fb923c"
            />
          </div>
          <div className="overflow-x-auto rounded-box border border-base-300">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Budget var.</th>
                  <th>Approved</th>
                  <th>Pass-through</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const camp = (
                    c as {
                      campaigns?: {
                        campaign_name: string;
                        campaign_budget: number;
                      };
                    }
                  ).campaigns;
                  const budget = num(camp?.campaign_budget);
                  const spent = c.campaign_id
                    ? (spentByCampaign.get(c.campaign_id) ?? 0)
                    : 0;
                  const variance =
                    budget > 0 ? budgetVariance(budget, spent) : null;
                  return (
                    <tr key={c.id}>
                      <td>{c.cost_date}</td>
                      <td>
                        {c.campaign_id ? (
                          <Link
                            href={`/app/campaigns/${c.campaign_id}`}
                            className="link link-hover"
                          >
                            {camp?.campaign_name ?? "—"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{c.cost_type}</td>
                      <td className="max-w-xs truncate">
                        {c.description || c.vendor_name || "—"}
                      </td>
                      <td className="text-right">{money(c.amount)}</td>
                      <td
                        className={`text-right ${variance != null && variance < 0 ? "text-error" : ""}`}
                      >
                        {variance != null ? money(variance) : "—"}
                      </td>
                      <td>{c.approved ? "Yes" : "No"}</td>
                      <td>{c.pass_through ? "Yes" : "No"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">Record cost</h2>
          <CreateCostForm
            campaigns={formCampaigns.map((c) => ({
              id: c.id,
              label: c.campaign_name,
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}
