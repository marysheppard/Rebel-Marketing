import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { money, num, pct } from "@/lib/format";
import { profitMargin, sumCosts } from "@/lib/finance";
import { getProfile } from "@/lib/page-auth";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getProfile();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, clients(client_name)")
    .eq("id", id)
    .single();
  if (!contract) notFound();

  const [{ data: campaigns }, { data: invoices }, { data: costs }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("contract_id", id),
    supabase.from("invoices").select("*").eq("contract_id", id),
    supabase.from("costs").select("amount, campaign_id"),
  ]);

  const campIds = new Set((campaigns ?? []).map((c) => c.id));
  const contractCosts = sumCosts(
    (costs ?? []).filter((c) => c.campaign_id && campIds.has(c.campaign_id)),
  );
  const revenue = (invoices ?? [])
    .filter((i) => !["Draft", "Canceled"].includes(i.status))
    .reduce((s, i) => s + num(i.total_amount), 0);
  const profit = revenue - contractCosts;
  const margin = profitMargin(revenue, contractCosts);

  const clientName = (contract as { clients?: { client_name: string } }).clients?.client_name;

  return (
    <div>
      <PageHeader
        title={contract.contract_name}
        subtitle={`${contract.contract_number}${clientName ? ` · ${clientName}` : ""}`}
        actions={
          <>
            <Link href={`/app/clients/${contract.client_id}`} className="btn btn-ghost btn-sm">
              Client
            </Link>
            <Link href="/app/contracts" className="btn btn-ghost btn-sm">
              ← All contracts
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge status={contract.contract_status} />
        <span className="badge badge-outline badge-sm">{contract.billing_method}</span>
        {contract.approval_required ? (
          <span className="badge badge-warning badge-sm">Approval required</span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly retainer" value={money(contract.monthly_retainer)} />
        <StatCard label="Project fee" value={money(contract.project_fee)} />
        <StatCard label="Campaign budget" value={money(contract.campaign_budget)} />
        <StatCard label="Profit margin" value={pct(margin)} tone={profit >= 0 ? "good" : "bad"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="font-semibold">Terms</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Period</dt>
              <dd>
                {contract.start_date} → {contract.end_date}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Payment terms</dt>
              <dd>{contract.payment_terms || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Deposit</dt>
              <dd>{money(contract.deposit_amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Renewal option</dt>
              <dd>{contract.renewal_option ? "Yes" : "No"}</dd>
            </div>
          </dl>
          {contract.scope ? (
            <p className="mt-4 text-sm opacity-80">
              <span className="font-medium">Scope:</span> {contract.scope}
            </p>
          ) : null}
          {contract.notes ? (
            <p className="mt-2 text-sm opacity-70">{contract.notes}</p>
          ) : null}
        </div>

        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="font-semibold">Profitability</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Revenue</dt>
              <dd className="text-success">{money(revenue)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Costs</dt>
              <dd>{money(contractCosts)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Gross profit</dt>
              <dd className={profit >= 0 ? "text-success" : "text-error"}>{money(profit)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Linked campaigns</h2>
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
                    No campaigns linked to this contract.
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
