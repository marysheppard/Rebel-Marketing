import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { money, num } from "@/lib/format";
import { remainingBalance } from "@/lib/finance";
import { getProfile } from "@/lib/page-auth";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getProfile();

  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const [{ data: contracts }, { data: campaigns }, { data: invoices }] = await Promise.all([
    supabase
      .from("contracts")
      .select("*")
      .eq("client_id", id)
      .order("start_date", { ascending: false }),
    supabase
      .from("campaigns")
      .select("*")
      .eq("client_id", id)
      .order("start_date", { ascending: false }),
    supabase
      .from("invoices")
      .select("*, payments(amount)")
      .eq("client_id", id)
      .order("invoice_date", { ascending: false }),
  ]);

  const outstanding = (invoices ?? []).reduce((s, i) => s + remainingBalance(i), 0);
  const revenue = (invoices ?? [])
    .filter((i) => !["Draft", "Canceled"].includes(i.status))
    .reduce((s, i) => s + num(i.total_amount), 0);

  return (
    <div>
      <PageHeader
        title={client.client_name}
        subtitle={[client.industry, client.contact_name].filter(Boolean).join(" · ") || "Client account"}
        actions={
          <Link href="/app/clients" className="btn btn-ghost btn-sm">
            ← All clients
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <StatusBadge status={client.status} />
        {client.contact_email ? (
          <a href={`mailto:${client.contact_email}`} className="badge badge-outline badge-sm">
            {client.contact_email}
          </a>
        ) : null}
      </div>

      <nav className="mb-8 flex flex-wrap gap-2">
        <Link
          href={`/app/campaigns?client=${id}`}
          className="btn btn-outline btn-sm"
        >
          Campaigns
        </Link>
        <Link
          href={`/app/approvals?client=${id}`}
          className="btn btn-outline btn-sm"
        >
          Approvals
        </Link>
        <Link href={`/app/costs?client=${id}`} className="btn btn-outline btn-sm">
          Costs
        </Link>
        <Link
          href={`/app/contracts?client=${id}`}
          className="btn btn-outline btn-sm"
        >
          Contracts
        </Link>
        <Link
          href={`/app/profitability?client=${id}`}
          className="btn btn-outline btn-sm"
        >
          Profitability
        </Link>
      </nav>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Revenue" value={money(revenue)} tone="good" />
        <StatCard label="Outstanding balance" value={money(outstanding)} tone="warn" />
        <StatCard label="Active campaigns" value={String((campaigns ?? []).filter((c) => c.campaign_status === "Active").length)} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Contracts</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Number</th>
                <th>Status</th>
                <th>Billing</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              {(contracts ?? []).map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/app/contracts/${c.id}`} className="link link-hover">
                      {c.contract_name}
                    </Link>
                  </td>
                  <td>{c.contract_number}</td>
                  <td>
                    <StatusBadge status={c.contract_status} />
                  </td>
                  <td>{c.billing_method}</td>
                  <td className="text-sm opacity-70">
                    {c.start_date} → {c.end_date}
                  </td>
                </tr>
              ))}
              {!contracts?.length ? (
                <tr>
                  <td colSpan={5} className="text-center opacity-60">
                    No contracts for this client.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Campaigns</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-right">Budget</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns ?? []).map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/app/campaigns/${c.id}`} className="link link-hover">
                      {c.campaign_name}
                    </Link>
                  </td>
                  <td>{c.campaign_type}</td>
                  <td>
                    <StatusBadge status={c.campaign_status} />
                  </td>
                  <td className="text-right">{money(c.campaign_budget)}</td>
                </tr>
              ))}
              {!campaigns?.length ? (
                <tr>
                  <td colSpan={4} className="text-center opacity-60">
                    No campaigns yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Invoices</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Due</th>
                <th className="text-right">Total</th>
                <th className="text-right">Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(invoices ?? []).map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href="/app/billing" className="link link-hover">
                      {i.invoice_number}
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
              {!invoices?.length ? (
                <tr>
                  <td colSpan={6} className="text-center opacity-60">
                    No invoices yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
