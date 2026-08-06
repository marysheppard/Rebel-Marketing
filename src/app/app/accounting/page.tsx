import { ListExportButton } from "@/components/exports/ListExportButton";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui";
import {
  buildRevenueRecognitionRows,
  sumRecognition,
} from "@/lib/accounting";
import { loadFinanceBundle } from "@/lib/finance-data";
import { money } from "@/lib/format";
import { requireRoles } from "@/lib/page-auth";

export default async function AccountingPage() {
  const { supabase, profile, userId } = await requireRoles([
    "agency_manager",
  ]);

  const bundle = await loadFinanceBundle(supabase, userId, profile.role);
  const { clients, contracts, invoices, work, campaigns, milestones } = bundle;

  const rows = buildRevenueRecognitionRows({
    clients,
    contracts,
    invoices,
    work,
    campaigns,
    milestones: milestones ?? [],
  });
  const sums = sumRecognition(rows);
  const milestoneBackedCount = rows.filter((r) => r.milestoneBacked).length;

  const clientOptions = [
    ...new Map(rows.map((r) => [r.clientId, r.clientName] as const)).entries(),
  ]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const paymentStatuses = [
    ...new Set(rows.map((r) => r.paymentStatus)),
  ].sort();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Revenue & Accounting"
        subtitle="Management / accounting reporting — estimates from contracts, invoices, work, and approved campaign milestones (not GAAP financial statements)"
        actions={
          <ListExportButton
            title="Export accounting report"
            description="Filter by client and payment status, then download CSV or PDF."
            filenameBase="accounting-revenue"
            matchLabel="contracts"
            className="btn btn-primary btn-sm gap-1"
            headers={[
              "Client",
              "Contract",
              "Contract #",
              "Contract Value",
              "Billing Period",
              "Amount Billed",
              "Revenue Recognized",
              "Deferred",
              "Unbilled",
              "AR",
              "Payment Status",
              "Contract Status",
            ]}
            items={rows.map((r) => ({
              _clientId: r.clientId,
              _status: r.paymentStatus,
              Client: r.clientName,
              Contract: r.contractName,
              "Contract #": r.contractNumber,
              "Contract Value": r.contractValue.toFixed(2),
              "Billing Period": r.billingPeriod,
              "Amount Billed": r.amountBilled.toFixed(2),
              "Revenue Recognized": r.revenueRecognized.toFixed(2),
              Deferred: r.deferredRevenue.toFixed(2),
              Unbilled: r.unbilledRevenue.toFixed(2),
              AR: r.accountsReceivable.toFixed(2),
              "Payment Status": r.paymentStatus,
              "Contract Status": r.contractStatus,
            }))}
            filterConfig={{
              clientKey: "_clientId",
              clients: clientOptions,
              statusKey: "_status",
              statuses: paymentStatuses,
              statusLabel: "Payment status",
              showDates: false,
            }}
          />
        }
      />

      {milestoneBackedCount > 0 ? (
        <div className="rounded-box border border-info/30 bg-info/10 px-4 py-3 text-sm">
          Milestone-backed recognition is active on {milestoneBackedCount}{" "}
          contract{milestoneBackedCount === 1 ? "" : "s"}: project fee / campaign
          revenue is recognized when milestones are <strong>Approved</strong> on
          the campaign, not only by calendar progress.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Amount billed" value={money(sums.billed)} />
        <StatCard label="Revenue recognized" value={money(sums.recognized)} />
        <StatCard label="Deferred revenue" value={money(sums.deferred)} />
        <StatCard label="Unbilled revenue" value={money(sums.unbilled)} />
        <StatCard label="Accounts receivable" value={money(sums.ar)} />
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contract</th>
              <th>Contract value</th>
              <th>Billing period</th>
              <th>Amount billed</th>
              <th>Revenue recognized</th>
              <th>Deferred</th>
              <th>Unbilled</th>
              <th>AR</th>
              <th>Payment status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.contractId}>
                <td>{r.clientName}</td>
                <td>
                  <div className="font-medium">{r.contractName}</div>
                  <div className="text-xs opacity-60">{r.contractNumber}</div>
                </td>
                <td>{money(r.contractValue)}</td>
                <td className="whitespace-nowrap text-xs">{r.billingPeriod}</td>
                <td>{money(r.amountBilled)}</td>
                <td>{money(r.revenueRecognized)}</td>
                <td>{money(r.deferredRevenue)}</td>
                <td>{money(r.unbilledRevenue)}</td>
                <td>{money(r.accountsReceivable)}</td>
                <td>
                  <StatusBadge status={r.paymentStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
