import type { BillingInvoiceRow } from "@/lib/billing";
import type {
  ExportDataset,
  ExportInvoice,
} from "@/lib/exports/builders";
import { downloadBlob } from "@/lib/exports/csv";
import { buildInvoicePdf } from "@/lib/exports/pdf";

/** Extra contact / contract fields for a professional invoice PDF. */
export type InvoicePdfContext = {
  agencyName?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  industry?: string;
  contract_number?: string | null;
  contract_name?: string | null;
  payment_terms?: string | null;
};

export function billingRowToExportInvoice(
  row: BillingInvoiceRow,
): ExportInvoice {
  return {
    id: row.id,
    client_id: row.client_id,
    contract_id: row.contract_id,
    campaign_id: row.campaign_id,
    invoice_number: row.invoice_number,
    status: row.status,
    invoice_date: row.invoice_date,
    due_date: row.due_date,
    subtotal: row.subtotal,
    pass_through_amount: row.pass_through_amount,
    tax_amount: row.tax_amount,
    total_amount: row.total_amount,
    notes: row.notes,
    disputed: row.disputed,
    payments: row.payments ?? null,
  };
}

export function buildDatasetForInvoicePdf(
  row: BillingInvoiceRow,
  ctx: InvoicePdfContext = {},
): { dataset: ExportDataset; invoice: ExportInvoice } {
  const invoice = billingRowToExportInvoice(row);
  const dataset: ExportDataset = {
    agencyName: ctx.agencyName ?? "Rebel Marketing",
    clients: [
      {
        id: row.client_id,
        client_name: row.client_name,
        industry: ctx.industry ?? "",
        contact_name: ctx.contact_name ?? "",
        contact_email: ctx.contact_email ?? "",
        contact_phone: ctx.contact_phone ?? "",
        status: "",
        account_manager_id: null,
      },
    ],
    contracts: row.contract_id
      ? [
          {
            id: row.contract_id,
            client_id: row.client_id,
            contract_name: ctx.contract_name ?? "Contract",
            contract_number: ctx.contract_number ?? row.contract_id.slice(0, 8),
            billing_method: "",
            contract_status: "Active",
            start_date: row.invoice_date,
            end_date: row.due_date,
            payment_terms: ctx.payment_terms ?? "Net 30",
            monthly_retainer: 0,
            project_fee: 0,
            campaign_budget: 0,
            deposit_amount: 0,
          },
        ]
      : [],
    campaigns: [],
    invoices: [invoice],
    costs: [],
    payments: [],
    assignments: [],
    profiles: [],
  };
  return { dataset, invoice };
}

export async function downloadBillingInvoicePdf(
  row: BillingInvoiceRow,
  ctx: InvoicePdfContext = {},
): Promise<void> {
  const { dataset, invoice } = buildDatasetForInvoicePdf(row, ctx);
  const bytes = buildInvoicePdf(dataset, invoice);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: "application/pdf" });
  downloadBlob(blob, `${row.invoice_number || "invoice"}.pdf`);
}
