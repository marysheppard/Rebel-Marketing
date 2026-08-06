import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignMilestonesPanel } from "@/components/campaigns/CampaignMilestonesPanel";
import { BudgetHealthBadge, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { money, num, pct } from "@/lib/format";
import { budgetHealth, budgetVariance, profitMargin, remainingBalance, sumCosts } from "@/lib/finance";
import { mapMilestoneRow } from "@/lib/milestones";
import {
  canApproveTasks,
  canLogWork,
  getProfile,
} from "@/lib/page-auth";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await getProfile();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, clients(client_name), contracts(contract_name, contract_number)")
    .eq("id", id)
    .single();
  if (!campaign) notFound();

  const [{ data: work }, { data: costs }, { data: approvals }, { data: invoices }, milestonesRes] =
    await Promise.all([
      supabase
        .from("work_entries")
        .select("*, profiles(full_name)")
        .eq("campaign_id", id)
        .order("work_date", { ascending: false }),
      supabase.from("costs").select("*").eq("campaign_id", id).order("cost_date", { ascending: false }),
      supabase.from("approvals").select("*").eq("campaign_id", id).order("requested_date", { ascending: false }),
      supabase
        .from("invoices")
        .select("*, payments(amount)")
        .eq("campaign_id", id)
        .order("invoice_date", { ascending: false }),
      supabase
        .from("campaign_milestones")
        .select("*")
        .eq("campaign_id", id)
        .order("sequence"),
    ]);

  const milestones = (milestonesRes.data ?? []).map((m) =>
    mapMilestoneRow(m as Record<string, unknown>),
  );
  const spent = sumCosts(costs ?? []);
  const budget = num(campaign.campaign_budget);
  const variance = budgetVariance(budget, spent);
  const health = budgetHealth(budget, spent);
  const revenue = (invoices ?? [])
    .filter((i) => !["Draft", "Canceled"].includes(i.status))
    .reduce((s, i) => s + num(i.total_amount), 0);
  const profit = revenue - spent;
  const margin = profitMargin(revenue, spent);
  const outstanding = (invoices ?? []).reduce((s, i) => s + remainingBalance(i), 0);
  const totalHours = (work ?? []).reduce((s, w) => s + num(w.hours), 0);

  const healthTone = health === "over" ? "bad" : health === "near" ? "warn" : "good";
  const clientName = (campaign as { clients?: { client_name: string } }).clients?.client_name;
  const contract = (campaign as { contracts?: { contract_name: string; contract_number: string } }).contracts;

  return (
    <div>
      <PageHeader
        title={campaign.campaign_name}
        subtitle={
          <span>
            {clientName ? (
              <Link href={`/app/clients/${campaign.client_id}`} className="link link-hover">
                {clientName}
              </Link>
            ) : null}
            {clientName && campaign.campaign_type ? " · " : null}
            {campaign.campaign_type}
          </span>
        }
        actions={
          <>
            <Link href={`/app/clients/${campaign.client_id}`} className="btn btn-ghost btn-sm">
              Client
            </Link>
            <Link href={`/app/contracts/${campaign.contract_id}`} className="btn btn-ghost btn-sm">
              Contract
            </Link>
            <Link href="/app/campaigns" className="btn btn-ghost btn-sm">
              ← All campaigns
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge status={campaign.campaign_status} />
        <BudgetHealthBadge budget={budget} spent={spent} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Budget" value={money(budget)} />
        <StatCard label="Spent" value={money(spent)} tone={healthTone} />
        <StatCard label="Remaining" value={money(variance)} tone={variance < 0 ? "bad" : "good"} />
        <StatCard label="Profit margin" value={pct(margin)} tone={profit >= 0 ? "good" : "bad"} />
        <StatCard label="Revenue" value={money(revenue)} tone="good" />
        <StatCard label="Gross profit" value={money(profit)} tone={profit >= 0 ? "good" : "bad"} />
        <StatCard label="Outstanding AR" value={money(outstanding)} tone="warn" />
        <StatCard label="Hours logged" value={totalHours.toFixed(1)} />
      </div>

      {campaign.description ? (
        <p className="mt-4 text-sm opacity-80">{campaign.description}</p>
      ) : null}

      {contract ? (
        <p className="mt-2 text-sm opacity-60">
          Contract:{" "}
          <Link href={`/app/contracts/${campaign.contract_id}`} className="link link-hover">
            {contract.contract_name} ({contract.contract_number})
          </Link>
        </p>
      ) : null}

      <CampaignMilestonesPanel
        milestones={milestones}
        canComplete={profile ? canLogWork(profile.role) : false}
        canApprove={profile ? canApproveTasks(profile.role) : false}
      />

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Work entries</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>By</th>
                <th className="text-right">Hours</th>
                <th>Billable</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(work ?? []).map((w) => (
                <tr key={w.id}>
                  <td>{w.work_date}</td>
                  <td>{w.work_type}</td>
                  <td>{(w as { profiles?: { full_name: string } }).profiles?.full_name ?? "—"}</td>
                  <td className="text-right">{w.hours}</td>
                  <td>{w.billable ? "Yes" : "No"}</td>
                  <td>
                    <StatusBadge status={w.approval_status} />
                    {w.billed ? <span className="badge badge-ghost badge-xs ml-1">Billed</span> : null}
                  </td>
                </tr>
              ))}
              {!work?.length ? (
                <tr>
                  <td colSpan={6} className="text-center opacity-60">
                    No work logged yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Costs</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Vendor</th>
                <th className="text-right">Amount</th>
                <th>Approval</th>
                <th>Pass-through</th>
              </tr>
            </thead>
            <tbody>
              {(costs ?? []).map((c) => (
                <tr key={c.id}>
                  <td>{c.cost_date}</td>
                  <td>{c.cost_type}</td>
                  <td>{c.vendor_name || "—"}</td>
                  <td className="text-right">{money(c.amount)}</td>
                  <td>
                    {(c as { approval_status?: string }).approval_status ??
                      (c.approved ? "Approved" : "Pending")}
                  </td>
                  <td>{c.pass_through ? "Yes" : "No"}</td>
                </tr>
              ))}
              {!costs?.length ? (
                <tr>
                  <td colSpan={6} className="text-center opacity-60">
                    No costs recorded.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Approvals</h2>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Requested</th>
                <th>Type</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(approvals ?? []).map((a) => (
                <tr key={a.id}>
                  <td>{a.requested_date}</td>
                  <td>{a.approval_type}</td>
                  <td>{a.description}</td>
                  <td>
                    <StatusBadge status={a.approval_status} />
                  </td>
                </tr>
              ))}
              {!approvals?.length ? (
                <tr>
                  <td colSpan={4} className="text-center opacity-60">
                    No approval requests.
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
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
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
                  <td className="text-right">{money(i.total_amount)}</td>
                  <td className="text-right">{money(remainingBalance(i))}</td>
                  <td>
                    <StatusBadge status={i.status} />
                  </td>
                </tr>
              ))}
              {!invoices?.length ? (
                <tr>
                  <td colSpan={5} className="text-center opacity-60">
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
