import type { BillingInvoiceRow } from "@/lib/billing";
import { downloadBlob, rowsToCsv } from "@/lib/exports/csv";
import { paidAmount } from "@/lib/finance";

const HEADERS = [
  "Invoice Number",
  "Client",
  "Campaign",
  "Invoice Date",
  "Due Date",
  "Subtotal",
  "Pass-Through",
  "Tax",
  "Total",
  "Paid",
  "Remaining",
  "Status",
] as const;

export function billingInvoicesToCsvRows(invoices: BillingInvoiceRow[]) {
  return invoices.map((i) => ({
    "Invoice Number": i.invoice_number,
    Client: i.client_name,
    Campaign: i.campaign_label,
    "Invoice Date": i.invoice_date,
    "Due Date": i.due_date,
    Subtotal: i.subtotal.toFixed(2),
    "Pass-Through": i.pass_through_amount.toFixed(2),
    Tax: i.tax_amount.toFixed(2),
    Total: i.total_amount.toFixed(2),
    Paid: paidAmount(i).toFixed(2),
    Remaining: i.remaining.toFixed(2),
    Status: i.status,
  }));
}

export function downloadBillingInvoicesCsv(
  invoices: BillingInvoiceRow[],
  filename: string,
): void {
  const rows = billingInvoicesToCsvRows(invoices);
  const csv = rowsToCsv([...HEADERS], rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const safe = filename.replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "");
  downloadBlob(blob, `${safe || "invoices"}.csv`);
}
