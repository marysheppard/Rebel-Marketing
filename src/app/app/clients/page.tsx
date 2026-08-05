import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { money, num } from "@/lib/format";
import { remainingBalance } from "@/lib/finance";
import { canManageClients, getProfile } from "@/lib/page-auth";

export default async function ClientsPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  const [{ data: clients }, { data: invoices }, { data: campaigns }, { data: costs }] =
    await Promise.all([
      supabase.from("clients").select("*").order("client_name"),
      supabase.from("invoices").select("*, payments(amount)"),
      supabase.from("campaigns").select("id, client_id"),
      supabase.from("costs").select("campaign_id, amount"),
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
        subtitle="One account per company — contracts and engagements attach here"
        actions={
          showForm ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/app/clients/intake" className="btn btn-primary btn-sm">
                New Client Intake
              </Link>
              <Link href="/app/contracts/builder" className="btn btn-outline btn-sm">
                New contract
              </Link>
            </div>
          ) : null
        }
      />

      {list.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Start with Client Intake to create the company profile, then build contracts for each engagement."
        />
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>CustomerID</th>
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
                  <td className="font-mono text-xs">{cl.customer_id || "—"}</td>
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
          <h2 className="mb-2 text-xl font-bold">Add or renew</h2>
          <p className="mb-4 text-sm opacity-70">
            New companies go through Client Intake. Renewals and additional engagements use{" "}
            <strong>New contract</strong> on the existing client profile — never a second client
            record.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/clients/intake" className="btn btn-primary btn-sm">
              New Client Intake
            </Link>
            <Link href="/app/contracts/builder" className="btn btn-outline btn-sm">
              Attach contract to existing client
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
