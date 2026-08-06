import Link from "next/link";
import { ClientsExplorer } from "@/components/ClientsExplorer";
import { canManageClients, getProfile } from "@/lib/page-auth";

export default async function ClientsPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  const [{ data: clients }, { data: invoices }, { data: campaigns }, { data: costs }] =
    await Promise.all([
      supabase.from("clients").select("*").order("client_name"),
      supabase.from("invoices").select("*, payments(amount)"),
      supabase.from("campaigns").select("id, client_id"),
      supabase
        .from("costs")
        .select("campaign_id, amount, client_id, cost_date"),
    ]);

  const list = clients ?? [];
  const showForm = canManageClients(profile.role);

  return (
    <div>
      <ClientsExplorer
        canManage={showForm}
        source={{
          clients: list.map((c) => ({
            id: c.id,
            client_name: c.client_name,
            industry: c.industry,
            status: c.status,
            created_at: c.created_at,
            customer_id: c.customer_id,
          })),
          campaigns: campaigns ?? [],
          invoices: invoices ?? [],
          costs: (costs ?? []).map((c) => ({
            campaign_id: c.campaign_id,
            client_id: c.client_id ?? null,
            amount: c.amount,
            cost_date: String(c.cost_date ?? ""),
          })),
        }}
      />

      {showForm ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-2 text-xl font-bold">Add or renew</h2>
          <p className="mb-4 text-sm opacity-70">
            New companies go through Client Intake. Renewals and additional
            engagements use <strong>New contract</strong> on the existing
            client profile — never a second client record.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/clients/intake" className="btn btn-primary btn-sm">
              New Client Intake
            </Link>
            <Link
              href="/app/contracts/builder"
              className="btn btn-outline btn-sm"
            >
              Attach contract to existing client
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
