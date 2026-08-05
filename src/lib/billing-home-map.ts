import {
  DEFAULT_BILL_RATE_USD,
  estimateEntryAmount,
  type BillingInvoiceRow,
  type UnbilledEntry,
} from "@/lib/billing";
import { remainingBalance } from "@/lib/finance";
import { num } from "@/lib/format";

export function mapBillingHomeInvoices(
  rows: {
    id: string;
    client_id: string;
    contract_id: string | null;
    campaign_id: string | null;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    subtotal: number | string;
    pass_through_amount: number | string;
    tax_amount: number | string;
    total_amount: number | string;
    status: string;
    disputed: boolean;
    notes: string | null;
    created_at: string;
    clients?: { client_name: string } | { client_name: string }[] | null;
    payments?: { amount: number | string }[] | null;
    campaigns?: { campaign_name: string } | { campaign_name: string }[] | null;
  }[],
): BillingInvoiceRow[] {
  return rows.map((i) => {
    const clientRel = Array.isArray(i.clients) ? i.clients[0] : i.clients;
    const campRel = Array.isArray(i.campaigns) ? i.campaigns[0] : i.campaigns;
    return {
      id: i.id,
      client_id: i.client_id,
      contract_id: i.contract_id,
      campaign_id: i.campaign_id,
      invoice_number: i.invoice_number,
      invoice_date: i.invoice_date,
      due_date: i.due_date,
      subtotal: num(i.subtotal),
      pass_through_amount: num(i.pass_through_amount),
      tax_amount: num(i.tax_amount),
      total_amount: num(i.total_amount),
      status: i.status,
      disputed: Boolean(i.disputed),
      notes: i.notes ?? "",
      created_at: i.created_at,
      client_name: clientRel?.client_name ?? "Client",
      remaining: remainingBalance(i),
      campaign_label: campRel?.campaign_name ?? "—",
      payments: i.payments as { amount: number }[] | null,
    };
  });
}

export function mapUnbilledWork(
  rows: {
    id: string;
    campaign_id: string;
    hours: number | string;
    work_date: string;
    work_type: string;
    description: string;
    campaigns?:
      | {
          campaign_name?: string;
          client_id?: string;
          clients?:
            | { client_name?: string }
            | { client_name?: string }[]
            | null;
        }
      | Array<{
          campaign_name?: string;
          client_id?: string;
          clients?:
            | { client_name?: string }
            | { client_name?: string }[]
            | null;
        }>
      | null;
  }[],
): UnbilledEntry[] {
  return rows.map((w) => {
    const camps = Array.isArray(w.campaigns) ? w.campaigns[0] : w.campaigns;
    const clientsRel = camps?.clients;
    const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;
    const hours = num(w.hours);
    const rate = DEFAULT_BILL_RATE_USD;
    return {
      id: w.id,
      work_date: String(w.work_date ?? ""),
      hours,
      work_type: String(w.work_type ?? ""),
      description: String(w.description ?? ""),
      campaign_id: String(w.campaign_id ?? ""),
      campaign_name: camps?.campaign_name ?? "Campaign",
      client_id: String(camps?.client_id ?? ""),
      client_name: clientObj?.client_name ?? "Client",
      estimated_rate: rate,
      estimated_amount: estimateEntryAmount(hours, rate),
    };
  });
}
