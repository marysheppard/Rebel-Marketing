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
  const { clients, contracts, invoices, work, campaigns } = bundle;

  const rows = buildRevenueRecognitionRows({
    clients,
    contracts,
    invoices,
    work,
    campaigns,
  });
  const sums = sumRecognition(rows);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Revenue & Accounting"
        subtitle="Management / accounting reporting — estimates from contracts, invoices, and work (not GAAP financial statements)"
      />

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
