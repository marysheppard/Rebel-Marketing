/** Escape a CSV field for Excel-friendly output. */
export function csvEscape(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV string from headers + row objects (or parallel arrays). */
export function rowsToCsv(
  headers: string[],
  rows: Array<Record<string, unknown> | unknown[]>,
): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    if (Array.isArray(row)) {
      lines.push(row.map(csvEscape).join(","));
    } else {
      lines.push(headers.map((h) => csvEscape(row[h])).join(","));
    }
  }
  // BOM helps Excel recognize UTF-8
  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
