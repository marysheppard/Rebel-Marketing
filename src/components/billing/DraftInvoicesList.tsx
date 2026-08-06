"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BillingStatusBadge } from "@/components/billing/BillingStatusBadge";
import {
  parseWorkEntryIdsFromNotes,
  type BillingInvoiceRow,
} from "@/lib/billing";
import { money } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export function DraftInvoicesList({
  drafts,
  canManage,
  embedded = false,
}: {
  drafts: BillingInvoiceRow[];
  canManage: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendInvoice(inv: BillingInvoiceRow) {
    if (!canManage) return;
    if (
      !confirm(
        `Send invoice ${inv.invoice_number}? Linked work entries will be marked billed.`,
      )
    ) {
      return;
    }
    setBusyId(inv.id);
    setError(null);
    const supabase = createClient();
    const workIds = parseWorkEntryIdsFromNotes(inv.notes);

    const { error: updErr } = await supabase
      .from("invoices")
      .update({ status: "Sent" })
      .eq("id", inv.id);

    if (updErr) {
      setBusyId(null);
      setError("Could not send invoice.");
      return;
    }

    if (workIds.length) {
      await supabase
        .from("work_entries")
        .update({ billed: true })
        .in("id", workIds)
        .eq("billed", false);
    }

    setBusyId(null);
    router.refresh();
  }

  if (drafts.length === 0) {
    return (
      <div>
        {!embedded ? (
          <h2 className="text-lg font-bold">Draft invoices</h2>
        ) : null}
        <p className={`${embedded ? "" : "mt-2 "}text-sm opacity-60`}>
          No drafts. Create one from Ready to Invoice.
        </p>
      </div>
    );
  }

  return (
    <div>
      {!embedded ? (
        <>
          <h2 className="text-lg font-bold">Draft invoices</h2>
          <p className="mt-1 text-sm opacity-70">
            Continue editing or send when the draft is ready.
          </p>
        </>
      ) : null}
      {error ? (
        <div className="mt-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      ) : null}
      <div
        className={`${embedded ? "" : "mt-4 "}overflow-x-auto rounded-box border border-base-300`}
      >
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th className="text-right">Total</th>
              <th>Created / last touch</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => (
              <tr key={d.id} className="hover">
                <td className="font-medium">{d.invoice_number}</td>
                <td>{d.client_name}</td>
                <td className="text-right">{money(d.total_amount)}</td>
                <td className="text-sm whitespace-nowrap opacity-70">
                  {d.created_at
                    ? new Date(d.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </td>
                <td>
                  <BillingStatusBadge status={d.status} />
                </td>
                <td className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={`/app/billing/review?invoice=${d.id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      Continue editing
                    </Link>
                    {canManage ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busyId === d.id}
                        onClick={() => sendInvoice(d)}
                      >
                        {busyId === d.id ? "Sending…" : "Send invoice"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
