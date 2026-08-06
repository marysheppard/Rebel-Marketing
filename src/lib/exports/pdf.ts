import { jsPDF } from "jspdf";
import { contractValue, type AccountingContract } from "@/lib/accounting";
import {
  formatEmail,
  formatPhone,
} from "@/lib/contact-format";
import {
  moneyFmt,
  type ExportContract,
  type ExportDataset,
  type ExportInvoice,
} from "@/lib/exports/builders";
import { num } from "@/lib/format";
import { paidAmount } from "@/lib/finance";

function agencyHeader(doc: jsPDF, agencyName: string, subtitle: string) {
  doc.setFillColor(11, 31, 58);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(agencyName, 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(subtitle, 14, 22);
  doc.setTextColor(30, 30, 30);
}

function footer(doc: jsPDF, page = 1) {
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Rebel Marketing · Confidential · Page ${page}`,
    14,
    h - 10,
  );
  doc.setTextColor(30);
}

function ensureSpace(doc: jsPDF, y: number, need: number) {
  const h = doc.internal.pageSize.getHeight();
  if (y + need > h - 18) {
    doc.addPage();
    return 20;
  }
  return y;
}

/** Professional single-invoice PDF. */
export function buildInvoicePdf(
  ds: ExportDataset,
  invoice: ExportInvoice,
): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const agency = ds.agencyName ?? "Rebel Marketing";
  const client = ds.clients.find((c) => c.id === invoice.client_id);
  const contract = ds.contracts.find((c) => c.id === invoice.contract_id);

  agencyHeader(doc, agency, "INVOICE");

  let y = 38;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Invoice ${invoice.invoice_number}`, 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 7;
  doc.text(`Invoice date: ${invoice.invoice_date}`, 14, y);
  y += 5;
  doc.text(`Due date: ${invoice.due_date}`, 14, y);
  y += 5;
  doc.text(`Status: ${invoice.status}`, 14, y);
  y += 5;
  doc.text(
    `Payment terms: ${contract?.payment_terms?.trim() || "Net 30"}`,
    14,
    y,
  );

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Bill to", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(client?.client_name ?? "—", 14, y);
  y += 5;
  if (client?.contact_name) {
    doc.text(client.contact_name, 14, y);
    y += 5;
  }
  if (client?.contact_email) {
    doc.text(formatEmail(client.contact_email), 14, y);
    y += 5;
  }
  if (client?.contact_phone) {
    doc.text(formatPhone(client.contact_phone), 14, y);
    y += 5;
  }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Contract reference", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(
    contract
      ? `${contract.contract_number} — ${contract.contract_name}`
      : "—",
    14,
    y,
  );

  y += 12;
  doc.setFillColor(240, 244, 248);
  doc.rect(14, y - 5, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Description", 16, y);
  doc.text("Amount", 170, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 10;

  const lines: { label: string; amount: number }[] = [];
  if (num(invoice.subtotal) > 0) {
    lines.push({
      label: "Professional services / contract billing",
      amount: num(invoice.subtotal),
    });
  }
  if (num(invoice.pass_through_amount) > 0) {
    lines.push({
      label: "Pass-through / reimbursable expenses",
      amount: num(invoice.pass_through_amount),
    });
  }
  if (lines.length === 0) {
    lines.push({
      label: invoice.notes?.trim() || "Services rendered",
      amount: num(invoice.total_amount) - num(invoice.tax_amount),
    });
  }

  for (const line of lines) {
    y = ensureSpace(doc, y, 10);
    doc.text(line.label, 16, y);
    doc.text(moneyFmt(line.amount), 196, y, { align: "right" });
    y += 7;
  }

  y += 4;
  doc.setDrawColor(200);
  doc.line(120, y, 196, y);
  y += 7;
  doc.text("Subtotal", 140, y);
  doc.text(moneyFmt(num(invoice.subtotal)), 196, y, { align: "right" });
  y += 6;
  doc.text("Tax", 140, y);
  doc.text(moneyFmt(num(invoice.tax_amount)), 196, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Total", 140, y);
  doc.text(moneyFmt(num(invoice.total_amount)), 196, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 8;
  doc.text(`Amount paid: ${moneyFmt(paidAmount(invoice))}`, 140, y);

  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    "Thank you for your business. Remit payment per the terms above.",
    14,
    y,
  );
  doc.setTextColor(30);
  footer(doc);
  return new Uint8Array(doc.output("arraybuffer"));
}

/** Professional single-contract summary PDF. */
export function buildContractPdf(
  ds: ExportDataset,
  contract: ExportContract,
): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const agency = ds.agencyName ?? "Rebel Marketing";
  const client = ds.clients.find((c) => c.id === contract.client_id);
  const value = contractValue(contract as AccountingContract);

  agencyHeader(doc, agency, "CONTRACT");

  let y = 38;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(contract.contract_name || "Contract", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 7;
  doc.text(`Contract #: ${contract.contract_number || "—"}`, 14, y);
  y += 5;
  doc.text(`Status: ${contract.contract_status}`, 14, y);
  y += 5;
  doc.text(`Billing method: ${contract.billing_method || "—"}`, 14, y);
  y += 5;
  doc.text(
    `Payment terms: ${contract.payment_terms?.trim() || "Net 30"}`,
    14,
    y,
  );
  y += 5;
  doc.text(`Start: ${contract.start_date || "—"}`, 14, y);
  y += 5;
  doc.text(`End: ${contract.end_date || "—"}`, 14, y);
  if (contract.auto_renew != null) {
    y += 5;
    doc.text(
      `Renewal: ${contract.auto_renew ? "Auto-renew" : "Manual / none"}`,
      14,
      y,
    );
  }

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Client", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(client?.client_name ?? "—", 14, y);
  y += 5;
  if (client?.contact_name) {
    doc.text(client.contact_name, 14, y);
    y += 5;
  }
  if (client?.contact_email) {
    doc.text(formatEmail(client.contact_email), 14, y);
    y += 5;
  }
  if (client?.contact_phone) {
    doc.text(formatPhone(client.contact_phone), 14, y);
    y += 5;
  }

  y += 10;
  doc.setFillColor(240, 244, 248);
  doc.rect(14, y - 5, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Commercial terms", 16, y);
  doc.text("Amount", 170, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 10;

  const lines: { label: string; amount: number }[] = [
    { label: "Monthly retainer", amount: num(contract.monthly_retainer) },
    { label: "Project fee", amount: num(contract.project_fee) },
    { label: "Campaign budget", amount: num(contract.campaign_budget) },
    { label: "Deposit", amount: num(contract.deposit_amount) },
  ].filter((l) => l.amount > 0);

  if (lines.length === 0) {
    lines.push({ label: "Estimated contract value", amount: value });
  }

  for (const line of lines) {
    y = ensureSpace(doc, y, 10);
    doc.text(line.label, 16, y);
    doc.text(moneyFmt(line.amount), 196, y, { align: "right" });
    y += 7;
  }

  y += 4;
  doc.setDrawColor(200);
  doc.line(120, y, 196, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Estimated contract value", 100, y);
  doc.text(moneyFmt(value), 196, y, { align: "right" });
  doc.setFont("helvetica", "normal");

  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    "This summary reflects commercial terms on file. Signed agreement text may apply separately.",
    14,
    y,
  );
  doc.setTextColor(30);
  footer(doc);
  return new Uint8Array(doc.output("arraybuffer"));
}

