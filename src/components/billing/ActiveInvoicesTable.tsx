"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BillingStatusBadge } from "@/components/billing/BillingStatusBadge";
import { InvoicePdfButton } from "@/components/billing/InvoicePdfButton";
import type { BillingInvoiceRow } from "@/lib/billing";
import { money } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

const STATUS_FILTERS = [
  "All active",
  "Sent",
  "Partially Paid",
  "Overdue",
  "Disputed",
] as const;

export function ActiveInvoicesTable({
  invoices,
  canManage,
  embedded = false,
}: {
  invoices: BillingInvoiceRow[];
  canManage: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("All active");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDisputeId, setConfirmDisputeId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === "All active") return invoices;
    return invoices.filter((i) => {
      if (statusFilter === "Disputed") return i.status === "Disputed" || i.disputed;
      return i.status === statusFilter;
    });
  }, [invoices, statusFilter]);

  async function markDisputed(inv: BillingInvoiceRow) {
    if (!canManage) return;
    setBusyId(inv.id);
    const supabase = createClient();
    await supabase
      .from("invoices")
      .update({ status: "Disputed", disputed: true })
      .eq("id", inv.id);
    setBusyId(null);
    setConfirmDisputeId(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        {!embedded ? (
          <div>
            <h2 className="text-lg font-bold">Recently sent / active</h2>
            <p className="mt-1 text-sm opacity-70">
              Open invoices awaiting payment. Record payments in Accounts Receivable.
            </p>
          </div>
        ) : (
          <span />
        )}
        <Link href="/app/ar" className="btn btn-outline btn-sm">
          Open AR
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            className={`btn btn-sm ${statusFilter === s ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setStatusFilter(s)}
          >
            {s}
            {s !== "All active" ? (
              <span className="opacity-70">
                (
                {
                  invoices.filter((i) =>
                    s === "Disputed"
                      ? i.status === "Disputed" || i.disputed
                      : i.status === s,
                  ).length
                }
                )
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm opacity-60">No active invoices in this filter.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Campaign(s)</th>
                <th>Date</th>
                <th>Due</th>
                <th className="text-right">Total</th>
                <th className="text-right">Remaining</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="hover">
                  <td className="font-medium whitespace-nowrap">{i.invoice_number}</td>
                  <td>
                    <Link href={`/app/clients/${i.client_id}`} className="link link-hover">
                      {i.client_name}
                    </Link>
                  </td>
                  <td className="max-w-[10rem] truncate">{i.campaign_label}</td>
                  <td className="whitespace-nowrap">{i.invoice_date}</td>
                  <td className="whitespace-nowrap">{i.due_date}</td>
                  <td className="text-right">{money(i.total_amount)}</td>
                  <td className="text-right font-medium">{money(i.remaining)}</td>
                  <td>
                    <BillingStatusBadge status={i.status} />
                  </td>
                  <td className="text-right">
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
                        <Link
                          href={`/app/billing/review?invoice=${i.id}`}
                          className="btn btn-ghost btn-xs"
                        >
                          View
                        </Link>
                        {canManage && i.status !== "Disputed" && !i.disputed ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-warning"
                            disabled={busyId === i.id}
                            onClick={() =>
                              setConfirmDisputeId(
                                confirmDisputeId === i.id ? null : i.id,
                              )
                            }
                          >
                            Dispute
                          </button>
                        ) : null}
                        <InvoicePdfButton invoice={i} />
                      </div>
                      {canManage && confirmDisputeId === i.id ? (
                        <div
                          className="max-w-xs rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-left text-xs"
                          role="alertdialog"
                          aria-label="Confirm dispute"
                        >
                          <p className="text-sm leading-snug">
                            Are you sure you want to dispute this invoice{" "}
                            <span className="font-semibold">{i.invoice_number}</span>?
                          </p>
                          <div className="mt-2 flex flex-wrap justify-end gap-1">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              disabled={busyId === i.id}
                              onClick={() => setConfirmDisputeId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-warning btn-xs"
                              disabled={busyId === i.id}
                              onClick={() => markDisputed(i)}
                            >
                              {busyId === i.id ? "Updating…" : "Confirm"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
