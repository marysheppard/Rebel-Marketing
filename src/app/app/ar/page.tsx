import { RecordPaymentForm } from "@/components/forms";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { daysBetween, money, num } from "@/lib/format";
import { arAgingBucket, paidAmount, remainingBalance } from "@/lib/finance";
import { canRecordPayments, getProfile } from "@/lib/page-auth";
import Link from "next/link";

export default async function ArPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, clients(client_name), payments(amount)")
    .order("due_date", { ascending: true });

  const open = (invoices ?? []).filter(
    (i) => remainingBalance(i) > 0 && !["Draft", "Canceled", "Paid"].includes(i.status),
  );

  const agingBuckets = ["Current", "1–30", "31–60", "61–90", "90+"] as const;
  const agingTotals = Object.fromEntries(agingBuckets.map((b) => [b, 0])) as Record<string, number>;
  let totalAr = 0;
  let overdueCount = 0;

  for (const i of open) {
    const bal = remainingBalance(i);
    totalAr += bal;
    agingTotals[arAgingBucket(i.due_date)] += bal;
    if (new Date(i.due_date) < new Date()) overdueCount++;
  }

  const rows = (invoices ?? []).map((i) => {
    const paid = paidAmount(i);
    const remaining = remainingBalance(i);
    const daysOut =
      remaining > 0 && !["Draft", "Canceled", "Paid"].includes(i.status)
        ? daysBetween(i.invoice_date)
        : null;
    return { ...i, paid, remaining, daysOut };
  });

  const payableInvoices = open.map((i) => ({
    id: i.id,
    client_id: i.client_id,
    label: `${i.invoice_number} — ${(i as { clients?: { client_name: string } }).clients?.client_name ?? "Client"}`,
    remaining: remainingBalance(i),
  }));

  const showForm = canRecordPayments(profile.role);

  return (
    <div>
      <PageHeader
        title="Accounts Receivable"
        subtitle="Collections, aging, and payment recording"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open AR" value={money(totalAr)} tone="warn" />
        <StatCard label="Open invoices" value={String(open.length)} />
        <StatCard label="Overdue" value={String(overdueCount)} tone="bad" />
        <StatCard label="90+ days" value={money(agingTotals["90+"])} tone="bad" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        {agingBuckets.map((b) => (
          <StatCard key={b} label={b} value={money(agingTotals[b])} />
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No invoices"
          description="Invoices will appear here once billing creates them."
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Invoice date</th>
                <th>Due date</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Remaining</th>
                <th className="text-right">Days out</th>
                <th>Status</th>
                <th>Disputed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className={i.remaining > 0 && new Date(i.due_date) < new Date() ? "bg-error/5" : ""}>
                  <td className="font-medium">{i.invoice_number}</td>
                  <td>
                    <Link href={`/app/clients/${i.client_id}`} className="link link-hover">
                      {(i as { clients?: { client_name: string } }).clients?.client_name ?? "—"}
                    </Link>
                  </td>
                  <td>{i.invoice_date}</td>
                  <td>{i.due_date}</td>
                  <td className="text-right">{money(i.total_amount)}</td>
                  <td className="text-right">{money(i.paid)}</td>
                  <td className="text-right">{money(i.remaining)}</td>
                  <td className="text-right">{i.daysOut ?? "—"}</td>
                  <td>
                    <StatusBadge status={i.status} />
                  </td>
                  <td>{i.disputed ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && payableInvoices.length > 0 ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">Record payment</h2>
          <RecordPaymentForm invoices={payableInvoices} />
        </section>
      ) : null}
    </div>
  );
}
