import { jsPDF } from "jspdf";
import { downloadBlob, rowsToCsv } from "@/lib/exports/csv";

export type TableExportFormat = "csv" | "pdf";

export function downloadTableExport(
  title: string,
  headers: string[],
  rows: Record<string, unknown>[],
  filenameBase: string,
  format: TableExportFormat,
): { count: number; filename: string } {
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `${filenameBase}-${stamp}`;

  if (format === "csv") {
    const csv = rowsToCsv(headers, rows);
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `${base}.csv`,
    );
    return { count: rows.length, filename: `${base}.csv` };
  }

  const bytes = buildLandscapeTablePdf(title, headers, rows);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(
    new Blob([copy.buffer], { type: "application/pdf" }),
    `${base}.pdf`,
  );
  return { count: rows.length, filename: `${base}.pdf` };
}

function buildLandscapeTablePdf(
  title: string,
  headers: string[],
  rows: Record<string, unknown>[],
): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  doc.setFillColor(11, 31, 58);
  doc.rect(0, 0, 297, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Rebel Marketing", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(title, 14, 22);
  doc.setTextColor(30, 30, 30);

  let y = 36;
  doc.setFontSize(8);
  const colW = 270 / Math.max(headers.length, 1);

  doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => {
    doc.text(h.slice(0, 22), 14 + i * colW, y);
  });
  doc.setFont("helvetica", "normal");
  y += 6;

  for (const row of rows) {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + 8 > pageH - 14) {
      doc.addPage();
      y = 20;
    }
    headers.forEach((h, i) => {
      const val = row[h];
      const text =
        typeof val === "number"
          ? Number.isFinite(val)
            ? val.toFixed(2)
            : "—"
          : String(val ?? "—");
      doc.text(text.slice(0, 28), 14 + i * colW, y);
    });
    y += 5.5;
  }

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.text("No rows matched the selected filters.", 14, y);
  }

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Rebel Marketing · Confidential", 14, pageH - 10);
  return new Uint8Array(doc.output("arraybuffer"));
}
