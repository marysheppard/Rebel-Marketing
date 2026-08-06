"use client";

import { BillingStatusBadge } from "@/components/billing/BillingStatusBadge";
import { InvoicePdfButton } from "@/components/billing/InvoicePdfButton";
import type { BillingInvoiceRow } from "@/lib/billing";
import { money } from "@/lib/format";

export function PaidHistorySection({
  invoices,
  embedded = false,
}: {
  invoices: BillingInvoiceRow[];
  embedded?: boolean;
}) {
  if (invoices.length === 0) {
    return (
      <p className="text-sm opacity-60">
        No paid or canceled invoices yet.
      </p>
    );
  }

  const table = (
    <div className="overflow-x-auto rounded-box border border-base-300">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Client</th>
            <th>Date</th>
            <th className="text-right">Total</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id}>
              <td className="font-medium">{i.invoice_number}</td>
              <td>{i.client_name}</td>
              <td>{i.invoice_date}</td>
              <td className="text-right">{money(i.total_amount)}</td>
              <td>
                <BillingStatusBadge status={i.status} />
              </td>
              <td className="text-right">
                <InvoicePdfButton invoice={i} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (embedded) return table;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">
        Paid / History ({invoices.length})
      </h2>
      {table}
    </section>
  );
}
