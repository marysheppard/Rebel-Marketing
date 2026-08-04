import Link from "next/link";
import { CreateClientForm } from "@/components/forms";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { money, num } from "@/lib/format";
import { remainingBalance } from "@/lib/finance";
import { canManageClients, getProfile } from "@/lib/page-auth";

export default async function ClientsPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  const [{ data: clients }, { data: invoices }, { data: campaigns }, { data: costs }, { data: managers }] =
    await Promise.all([
      supabase.from("clients").select("*").order("client_name"),
      supabase.from("invoices").select("*, payments(amount)"),
      supabase.from("campaigns").select("id, client_id"),
      supabase.from("costs").select("campaign_id, amount"),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["agency_manager", "account_manager"]),
    ]);

  const list = clients ?? [];
  const campByClient = new Map<string, string[]>();
  for (const c of campaigns ?? []) {
    const arr = campByClient.get(c.client_id) ?? [];
    arr.push(c.id);
    campByClient.set(c.client_id, arr);
  }

  const rows = list.map((cl) => {
    const campIds = new Set(campByClient.get(cl.id) ?? []);
    const revenue = (invoices ?? [])
      .filter((i) => i.client_id === cl.id && !["Draft", "Canceled"].includes(i.status))
      .reduce((s, i) => s + num(i.total_amount), 0);
    const clientCosts = (costs ?? [])
      .filter((c) => c.campaign_id && campIds.has(c.campaign_id))
      .reduce((s, c) => s + num(c.amount), 0);
    const outstanding = (invoices ?? [])
      .filter((i) => i.client_id === cl.id)
      .reduce((s, i) => s + remainingBalance(i), 0);
    return {
      ...cl,
      revenue,
      costs: clientCosts,
      profit: revenue - clientCosts,
      outstanding,
    };
  });

  const showForm = canManageClients(profile.role);

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Accounts, profitability, and outstanding balances"
      />

      {list.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add your first client to start tracking contracts, campaigns, and billing."
        />
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Industry</th>
                <th>Status</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Costs</th>
                <th className="text-right">Profit</th>
                <th className="text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((cl) => (
                <tr key={cl.id} className="hover">
                  <td>
                    <Link href={`/app/clients/${cl.id}`} className="link link-hover font-medium">
                      {cl.client_name}
                    </Link>
                  </td>
                  <td>{cl.industry || "—"}</td>
                  <td>
                    <StatusBadge status={cl.status} />
                  </td>
                  <td className="text-right">{money(cl.revenue)}</td>
                  <td className="text-right">{money(cl.costs)}</td>
                  <td className={`text-right ${cl.profit >= 0 ? "text-success" : "text-error"}`}>
                    {money(cl.profit)}
                  </td>
                  <td className="text-right">{money(cl.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
