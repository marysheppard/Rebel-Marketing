"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DEFAULT_BILL_RATE_USD,
  buildLineItemsFromEntries,
  defaultDueDate,
  encodeWorkEntryMeta,
  generateInvoiceNumber,
  lineItemsSubtotal,
  parseWorkEntryIdsFromNotes,
  primaryCampaignId,
  stripWorkEntryMeta,
  type InvoiceType,
  type LineItem,
  type UnbilledEntry,
} from "@/lib/billing";
import { money, num } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type ExistingInvoice = {
  id: string;
  client_id: string;
  contract_id: string | null;
  campaign_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  pass_through_amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes: string;
};

type ContractOption = {
  id: string;
  label: string;
  client_id: string;
  monthly_retainer: number;
};

export function InvoiceComposer({
  mode,
  entries,
  existing,
  contracts,
  clientName,
  canManage,
  retainerPaidHint,
}: {
  mode: "create" | "edit";
  entries: UnbilledEntry[];
  existing?: ExistingInvoice | null;
  contracts: ContractOption[];
  clientName: string;
  canManage: boolean;
  /** Rough retainer remaining when available */
  retainerPaidHint?: number | null;
}) {
  const router = useRouter();
  const clientId = existing?.client_id ?? entries[0]?.client_id ?? "";
  const workIds = useMemo(
    () => entries.map((e) => e.id),
    [entries],
  );

  const [invoiceType, setInvoiceType] = useState<InvoiceType>("hourly");
  const [groupBy, setGroupBy] = useState<"campaign" | "work_type">("campaign");
  const [invoiceNumber, setInvoiceNumber] = useState(
    existing?.invoice_number ?? generateInvoiceNumber(),
  );
  const [invoiceDate, setInvoiceDate] = useState(
    existing?.invoice_date ?? new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(
    existing?.due_date ?? defaultDueDate(),
  );
  const [contractId, setContractId] = useState(existing?.contract_id ?? "");
  const [items, setItems] = useState<LineItem[]>(() => {
    if (entries.length) return buildLineItemsFromEntries(entries, "campaign");
    if (existing) {
      return [
        {
          id: "subtotal",
          label: "Invoice subtotal",
          qty: 1,
          rate: num(existing.subtotal),
          amount: num(existing.subtotal),
          kind: "other",
        },
      ];
    }
    return [];
  });
  const [passThrough, setPassThrough] = useState(
    num(existing?.pass_through_amount ?? 0),
  );
  const [tax, setTax] = useState(num(existing?.tax_amount ?? 0));
  const [markupPct, setMarkupPct] = useState(15);
  const [notes, setNotes] = useState(
    stripWorkEntryMeta(existing?.notes ?? ""),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientContracts = contracts.filter((c) => c.client_id === clientId);
  const selectedContract = clientContracts.find((c) => c.id === contractId);
  const subtotal = lineItemsSubtotal(items);
  const markupAmount =
    invoiceType === "media"
      ? Math.round(passThrough * (markupPct / 100) * 100) / 100
      : 0;
  const total =
    Math.round((subtotal + passThrough + markupAmount + tax) * 100) / 100;

  function rebuildLines(nextGroup: "campaign" | "work_type") {
    setGroupBy(nextGroup);
    if (entries.length) {
      setItems(buildLineItemsFromEntries(entries, nextGroup));
    }
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, ...patch };
        if (patch.qty != null || patch.rate != null) {
          next.amount =
            Math.round(num(next.qty) * num(next.rate) * 100) / 100;
        }
        return next;
      }),
    );
  }

  async function save(status: "Draft" | "Sent") {
    if (!canManage) return;
    if (!clientId) {
      setError("Missing client.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const campaign_id =
      existing?.campaign_id ?? primaryCampaignId(entries);
    const fullNotes = encodeWorkEntryMeta(
      workIds.length ? workIds : parseWorkEntryIdsFromNotes(existing?.notes),
      notes,
    );

    const payload = {
      client_id: clientId,
      contract_id: contractId || null,
      campaign_id,
      invoice_number: invoiceNumber.trim(),
      invoice_date: invoiceDate,
      due_date: dueDate,
      subtotal,
      pass_through_amount: passThrough + markupAmount,
      tax_amount: tax,
      total_amount: total,
      status,
      disputed: false,
      notes: fullNotes,
    };

    let invoiceId = existing?.id;

    if (mode === "edit" && existing?.id) {
      const { error: updErr } = await supabase
        .from("invoices")
        .update(payload)
        .eq("id", existing.id);
      if (updErr) {
        setLoading(false);
        setError("Could not update invoice.");
        return;
      }
    } else {
      const { data: inv, error: insErr } = await supabase
        .from("invoices")
        .insert(payload)
        .select("id")
        .single();
      if (insErr || !inv) {
        setLoading(false);
        setError("Could not create invoice. Check required fields and permissions.");
        return;
      }
      invoiceId = inv.id as string;
    }

    void invoiceId;

    if (status === "Sent") {
      const ids =
        workIds.length > 0
          ? workIds
          : parseWorkEntryIdsFromNotes(existing?.notes);
      if (ids.length) {
        await supabase
          .from("work_entries")
          .update({ billed: true })
          .in("id", ids)
          .eq("billed", false);
      }
    }

    setLoading(false);
    router.push("/app/billing");
    router.refresh();
  }

  if (!canManage && mode === "create") {
    return (
      <p className="text-sm opacity-70">You do not have permission to create invoices.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
            {mode === "create" ? "New invoice" : "Edit invoice"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{clientName}</h1>
          <p className="text-sm opacity-70">
            {entries.length
              ? `${entries.length} work entries · default rate ${money(DEFAULT_BILL_RATE_USD)}/hr`
              : "Review amounts and send when ready"}
          </p>
        </div>
        <Link href="/app/billing" className="btn btn-ghost btn-sm">
          Back to Billing
        </Link>
      </div>

      {selectedContract && selectedContract.monthly_retainer > 0 ? (
        <div className="rounded-box border border-info/30 bg-info/10 px-4 py-3 text-sm">
          Contract retainer: {money(selectedContract.monthly_retainer)}/mo
          {retainerPaidHint != null ? (
            <span className="opacity-80">
              {" "}
              · Invoiced on this contract (approx): {money(retainerPaidHint)}
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="form-control">
          <span className="mb-1 text-sm font-medium">Invoice type</span>
          <select
            className="select select-bordered"
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
            disabled={!canManage || existing?.status === "Sent"}
          >
            <option value="hourly">Hourly</option>
            <option value="fixed">Fixed fee</option>
            <option value="retainer">Retainer draw-down</option>
            <option value="mixed">Mixed</option>
            <option value="media">Media + markup</option>
          </select>
        </label>
        <label className="form-control">
          <span className="mb-1 text-sm font-medium">Group line items by</span>
          <select
            className="select select-bordered"
            value={groupBy}
            onChange={(e) =>
              rebuildLines(e.target.value as "campaign" | "work_type")
            }
            disabled={!entries.length || !canManage}
          >
            <option value="campaign">Campaign</option>
            <option value="work_type">Work type</option>
          </select>
        </label>
        <label className="form-control">
          <span className="mb-1 text-sm font-medium">Invoice number</span>
          <input
            className="input input-bordered"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            disabled={!canManage}
            required
          />
        </label>
        <label className="form-control">
          <span className="mb-1 text-sm font-medium">Invoice date</span>
          <input
            type="date"
            className="input input-bordered"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            disabled={!canManage}
          />
        </label>
        <label className="form-control">
          <span className="mb-1 text-sm font-medium">Due date</span>
          <input
            type="date"
            className="input input-bordered"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={!canManage}
          />
        </label>
        <label className="form-control">
          <span className="mb-1 text-sm font-medium">Contract</span>
          <select
            className="select select-bordered"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            disabled={!canManage}
          >
            <option value="">None</option>
            {clientContracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Line item</th>
              <th className="text-right">Qty / hours</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>
                  <input
                    className="input input-bordered input-sm w-full max-w-xs"
                    value={it.label}
                    disabled={!canManage}
                    onChange={(e) => updateItem(it.id, { label: e.target.value })}
                  />
                </td>
                <td className="text-right">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className="input input-bordered input-sm w-24 text-right"
                    value={it.qty}
                    disabled={!canManage}
                    onChange={(e) =>
                      updateItem(it.id, { qty: num(e.target.value) })
                    }
                  />
                </td>
                <td className="text-right">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="input input-bordered input-sm w-28 text-right"
                    value={it.rate}
                    disabled={!canManage}
                    onChange={(e) =>
                      updateItem(it.id, { rate: num(e.target.value) })
                    }
                  />
                </td>
                <td className="text-right font-medium">{money(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="form-control">
          <span className="mb-1 text-sm font-medium">Pass-through / media</span>
          <input
            type="number"
            min={0}
            step={0.01}
            className="input input-bordered"
            value={passThrough}
            disabled={!canManage}
            onChange={(e) => setPassThrough(num(e.target.value))}
          />
        </label>
        {invoiceType === "media" ? (
          <label className="form-control">
            <span className="mb-1 text-sm font-medium">Markup %</span>
            <input
              type="number"
              min={0}
              step={1}
              className="input input-bordered"
              value={markupPct}
              disabled={!canManage}
              onChange={(e) => setMarkupPct(num(e.target.value))}
            />
          </label>
        ) : null}
        <label className="form-control">
          <span className="mb-1 text-sm font-medium">Tax</span>
          <input
            type="number"
            min={0}
            step={0.01}
            className="input input-bordered"
            value={tax}
            disabled={!canManage}
            onChange={(e) => setTax(num(e.target.value))}
          />
        </label>
        <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
          <div className="text-xs uppercase tracking-wide opacity-60">Total</div>
          <div className="text-2xl font-bold">{money(total)}</div>
          <div className="text-xs opacity-60">
            Labor {money(subtotal)}
            {markupAmount ? ` + markup ${money(markupAmount)}` : ""}
          </div>
        </div>
      </div>

      <label className="form-control">
        <span className="mb-1 text-sm font-medium">Notes</span>
        <textarea
          className="textarea textarea-bordered"
          rows={3}
          value={notes}
          disabled={!canManage}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {canManage ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-outline"
            disabled={loading}
            onClick={() => save("Draft")}
          >
            {loading ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            className="btn border-none bg-[#0b1f3a] text-white hover:bg-[#163054]"
            disabled={loading}
            onClick={() => {
              if (
                confirm(
                  "Send this invoice? Linked work entries will be marked as billed.",
                )
              ) {
                void save("Sent");
              }
            }}
          >
            {loading ? "Sending…" : "Send invoice"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
