import { jsPDF } from "jspdf";
import type { BillingInvoiceRow } from "@/lib/billing";
import { downloadBillingInvoicesCsv } from "@/lib/billing/invoice-csv";
import {
  buildDatasetForInvoicePdf,
  downloadBillingInvoicePdf,
} from "@/lib/billing/invoice-pdf";
import { moneyFmt } from "@/lib/exports/builders";
import { downloadBlob } from "@/lib/exports/csv";
import { buildInvoicePdf } from "@/lib/exports/pdf";

export type BillingExportScope = "all" | "drafts" | "active" | "history";
export type BillingExportFormat = "csv" | "pdf";

export type BillingExportFilters = {
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  scope?: BillingExportScope;
};

const ACTIVE_STATUSES = new Set([
  "Sent",
  "Partially Paid",
  "Overdue",
  "Disputed",
]);

function inScope(inv: BillingInvoiceRow, scope: BillingExportScope): boolean {
  if (scope === "all") return true;
  if (scope === "drafts") return inv.status === "Draft";
  if (scope === "history")
    return inv.status === "Paid" || inv.status === "Canceled";
  return (
    ACTIVE_STATUSES.has(inv.status) ||
    (Boolean(inv.disputed) &&
      inv.status !== "Paid" &&
      inv.status !== "Canceled" &&
      inv.status !== "Draft")
  );
}

function inDateRange(date: string, from?: string, to?: string): boolean {
  if (!date) return !from && !to;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function filterBillingInvoices(
  invoices: BillingInvoiceRow[],
  filters: BillingExportFilters = {},
): BillingInvoiceRow[] {
  const scope = filters.scope ?? "all";
  return invoices.filter((i) => {
    if (!inScope(i, scope)) return false;
    if (filters.clientId && i.client_id !== filters.clientId) return false;
    if (!inDateRange(i.invoice_date, filters.dateFrom, filters.dateTo))
      return false;
    return true;
  });
}

function buildInvoicesListPdf(
  invoices: BillingInvoiceRow[],
  filters: BillingExportFilters,
): Uint8Array {
  if (invoices.length === 1) {
    const row = invoices[0]!;
    const { dataset, invoice } = buildDatasetForInvoicePdf(row, {
      contact_name: row.contact_name,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      contract_number: row.contract_number,
      contract_name: row.contract_name,
      payment_terms: row.payment_terms,
    });
    return buildInvoicePdf(dataset, invoice);
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(11, 31, 58);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Rebel Marketing", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Invoice Export", 14, 22);
  doc.setTextColor(30, 30, 30);

  let y = 38;
  doc.setFontSize(10);
  const range =
    filters.dateFrom || filters.dateTo
      ? ` · ${filters.dateFrom || "…"} → ${filters.dateTo || "…"}`
      : "";
  doc.text(`${invoices.length} invoice(s)${range}`, 14, y);
  y += 8;

  for (const inv of invoices) {
    const h = doc.internal.pageSize.getHeight();
    if (y + 16 > h - 18) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text(inv.invoice_number, 14, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    doc.setFontSize(9);
    doc.text(
      `${inv.client_name} · ${inv.status} · Total ${moneyFmt(inv.total_amount)} · Due ${inv.due_date}`,
      14,
      y,
    );
    doc.setFontSize(10);
    y += 8;
  }

  if (invoices.length === 0) {
    doc.text("No invoices matched the selected filters.", 14, y);
  }

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Rebel Marketing · Confidential", 14, pageH - 10);
  return new Uint8Array(doc.output("arraybuffer"));
}

export async function downloadFilteredBillingExport(
  invoices: BillingInvoiceRow[],
  filters: BillingExportFilters,
  format: BillingExportFormat,
): Promise<{ count: number; filename: string }> {
  const filtered = filterBillingInvoices(invoices, filters);
  const stamp = new Date().toISOString().slice(0, 10);
  const scope = filters.scope ?? "all";
  const base = `billing-invoices-${scope}-${stamp}`;

  if (format === "csv") {
    downloadBillingInvoicesCsv(filtered, base);
    return { count: filtered.length, filename: `${base}.csv` };
  }

  if (filtered.length === 1) {
    const row = filtered[0]!;
    await downloadBillingInvoicePdf(row, {
      contact_name: row.contact_name,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      contract_number: row.contract_number,
      contract_name: row.contract_name,
      payment_terms: row.payment_terms,
    });
    return {
      count: 1,
      filename: `${row.invoice_number || "invoice"}.pdf`,
    };
  }

  const bytes = buildInvoicesListPdf(filtered, filters);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(
    new Blob([copy.buffer], { type: "application/pdf" }),
    `${base}.pdf`,
  );
  return { count: filtered.length, filename: `${base}.pdf` };
}
