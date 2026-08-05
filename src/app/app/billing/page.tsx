import { CreateInvoiceForm } from "@/components/forms";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { joinField, money, num } from "@/lib/format";
import { remainingBalance } from "@/lib/finance";
import { canManageBilling, requireRoles } from "@/lib/page-auth";
import Link from "next/link";

export default async function BillingPage() {
  const { supabase, profile } = await requireRoles([
    "agency_manager",
    "billing",
  ]);

  const [
    { data: invoices },
    { data: clients },
    { data: contracts },
    { data: campaigns },
    { data: unbilledWork },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, clients(client_name), payments(amount)")
      .order("invoice_date", { ascending: false }),
    supabase.from("clients").select("id, client_name").order("client_name"),
    supabase
      .from("contracts")
      .select("id, contract_name, contract_number, client_id")
      .order("contract_name"),
    supabase.from("campaigns").select("id, campaign_name, client_id").order("campaign_name"),
    supabase
      .from("work_entries")
      .select("id, campaign_id, hours, work_date, work_type, description, campaigns(campaign_name)")
      .eq("billable", true)
      .eq("billed", false)
      .eq("approval_status", "Approved")
      .order("work_date", { ascending: false }),
  ]);

  const unbilledWorkByCampaign: Record<string, number> = {};
  for (const w of unbilledWork ?? []) {
    unbilledWorkByCampaign[w.campaign_id] =
      (unbilledWorkByCampaign[w.campaign_id] ?? 0) + num(w.hours);
  }

  const list = invoices ?? [];
  const showForm = canManageBilling(profile.role);

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Invoices, unbilled work, and revenue recognition"
      />

      {(unbilledWork ?? []).length > 0 ? (
        <section className="mb-8 rounded-box border border-warning/40 bg-warning/10 p-4">
          <h2 className="font-semibold">Unbilled approved work</h2>
          <p className="mt-1 text-sm opacity-70">
            {(unbilledWork ?? []).length} entries ready to invoice (
            {(unbilledWork ?? []).reduce((s, w) => s + num(w.hours), 0).toFixed(1)} hours)
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th className="text-right">Hours</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {(unbilledWork ?? []).slice(0, 10).map((w) => (
                  <tr key={w.id}>
                    <td>{w.work_date}</td>
                    <td>
                      <Link href={`/app/campaigns/${w.campaign_id}`} className="link link-hover">
                        {joinField(w.campaigns, "campaign_name")}
                      </Link>
                    </td>
                    <td>{w.work_type}</td>
                    <td className="text-right">{w.hours}</td>
                    <td className="max-w-xs truncate">{w.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {list.length === 0 ? (
        <EmptyState
          title="No invoices"
          description="Create invoices from approved work and contract terms."
        />
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Date</th>
                <th>Due</th>
                <th className="text-right">Total</th>
                <th className="text-right">Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}>
                  <td className="font-medium">{i.invoice_number}</td>
                  <td>
                    <Link href={`/app/clients/${i.client_id}`} className="link link-hover">
                      {(i as { clients?: { client_name: string } }).clients?.client_name ?? "—"}
                    </Link>
                  </td>
                  <td>{i.invoice_date}</td>
                  <td>{i.due_date}</td>
                  <td className="text-right">{money(i.total_amount)}</td>
                  <td className="text-right">{money(remainingBalance(i))}</td>
                  <td>
                    <StatusBadge status={i.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">Create invoice</h2>
          <CreateInvoiceForm
            clients={(clients ?? []).map((c) => ({ id: c.id, label: c.client_name }))}
            contracts={(contracts ?? []).map((c) => ({
              id: c.id,
              label: `${c.contract_name} (${c.contract_number})`,
              client_id: c.client_id,
            }))}
            campaigns={(campaigns ?? []).map((c) => ({
              id: c.id,
              label: c.campaign_name,
              client_id: c.client_id,
            }))}
            unbilledWorkByCampaign={unbilledWorkByCampaign}
          />
        </section>
      ) : null}
    </div>
  );
}
