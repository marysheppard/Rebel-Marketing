import { jsPDF } from "jspdf";
import { downloadBlob, rowsToCsv } from "@/lib/exports/csv";
import { moneyFmt } from "@/lib/exports/builders";
import { num } from "@/lib/format";
import { clientProfitabilityRow } from "@/lib/metrics";

/** Mirrors ProfitabilityExplorer source shape for exports. */
export type ProfitabilityExportSource = {
  clients: {
    id: string;
    client_name: string;
    status: string;
    account_manager_id: string | null;
  }[];
  campaigns: {
    id: string;
    campaign_name: string;
    client_id: string;
    clients?: { client_name: string } | null;
  }[];
  invoices: {
    client_id: string;
    campaign_id: string | null;
    total_amount: number | string;
    status: string;
    invoice_date: string;
  }[];
  costs: {
    client_id: string | null;
    campaign_id: string | null;
    amount: number | string;
    cost_date: string;
  }[];
  work: {
    campaign_id: string;
    user_id: string;
    hours: number | string;
    work_date: string;
  }[];
  profiles: {
    id: string;
    full_name: string;
    internal_cost_rate?: number | null;
  }[];
};

export type ProfitabilityExportFormat = "csv" | "pdf";
export type ProfitabilityExportView = "client" | "campaign" | "account_manager";
export type ProfitabilityExportPeriod =
  | "all"
  | "mtd"
  | "last30"
  | "last90"
  | "qtd"
  | "ytd"
  | "custom";

export type ProfitabilityExportFilters = {
  period: ProfitabilityExportPeriod;
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  view: ProfitabilityExportView;
};

type ClientRow = {
  clientId: string;
  name: string;
  revenue: number;
  costs: number;
  laborCost: number;
  profit: number;
  margin: number | null;
  roi: number | null;
  accountManager: string;
  status: string;
};

type CampaignRow = {
  id: string;
  name: string;
  client: string;
  clientId: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number | null;
  accountManager: string;
};

type AmRow = {
  name: string;
  revenue: number;
  costs: number;
  profit: number;
};

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function resolveExportPeriod(
  period: ProfitabilityExportPeriod,
  customStart?: string,
  customEnd?: string,
): { start: string | null; end: string | null; label: string } {
  const now = new Date();
  const end = toDateStr(now);

  if (period === "all") return { start: null, end: null, label: "All time" };
  if (period === "custom") {
    return {
      start: customStart || null,
      end: customEnd || end,
      label:
        customStart || customEnd
          ? `${customStart || "…"} → ${customEnd || "…"}`
          : "Custom range",
    };
  }
  if (period === "mtd") {
    return {
      start: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
      end,
      label: "Month to date",
    };
  }
  if (period === "last30") {
    const s = new Date(now);
    s.setDate(s.getDate() - 30);
    return { start: toDateStr(s), end, label: "Last 30 days" };
  }
  if (period === "last90") {
    const s = new Date(now);
    s.setDate(s.getDate() - 90);
    return { start: toDateStr(s), end, label: "Last 90 days" };
  }
  if (period === "qtd") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return {
      start: toDateStr(new Date(now.getFullYear(), q, 1)),
      end,
      label: "Quarter to date",
    };
  }
  return {
    start: toDateStr(new Date(now.getFullYear(), 0, 1)),
    end,
    label: "Year to date",
  };
}

function inPeriod(
  dateStr: string | null | undefined,
  start: string | null,
  end: string | null,
) {
  if (!dateStr) return start == null && end == null;
  if (start && dateStr < start) return false;
  if (end && dateStr > end) return false;
  return true;
}

export function buildProfitabilityExportRows(
  source: ProfitabilityExportSource,
  start: string | null,
  end: string | null,
  includeAccountManagers: boolean,
): { byClient: ClientRow[]; byCampaign: CampaignRow[]; byAm: AmRow[] } {
  const { clients, campaigns, invoices, costs, work, profiles } = source;
  const amNameById = new Map(profiles.map((p) => [p.id, p.full_name]));
  const amNameByClient = new Map(
    clients.map((cl) => [
      cl.id,
      cl.account_manager_id
        ? (amNameById.get(cl.account_manager_id) ?? "Unassigned")
        : "Unassigned",
    ]),
  );
  const campClient = new Map(campaigns.map((c) => [c.id, c.client_id]));
  const rates = new Map(
    profiles.map((p) => [p.id, num(p.internal_cost_rate ?? 75)]),
  );

  const periodInvoices = invoices.filter(
    (i) =>
      !["Draft", "Canceled"].includes(i.status) &&
      inPeriod(i.invoice_date, start, end),
  );
  const periodCosts = costs.filter((c) => inPeriod(c.cost_date, start, end));
  const periodWork = work.filter((w) => inPeriod(w.work_date, start, end));

  const revByClient = new Map<string, number>();
  const revByCampaign = new Map<string, number>();
  for (const i of periodInvoices) {
    const amt = num(i.total_amount);
    revByClient.set(i.client_id, (revByClient.get(i.client_id) ?? 0) + amt);
    if (i.campaign_id) {
      revByCampaign.set(
        i.campaign_id,
        (revByCampaign.get(i.campaign_id) ?? 0) + amt,
      );
    }
  }

  const costByClient = new Map<string, number>();
  const costByCampaign = new Map<string, number>();
  for (const c of periodCosts) {
    const amt = num(c.amount);
    if (c.client_id) {
      costByClient.set(c.client_id, (costByClient.get(c.client_id) ?? 0) + amt);
    } else if (c.campaign_id) {
      const clientId = campClient.get(c.campaign_id);
      if (clientId) {
        costByClient.set(clientId, (costByClient.get(clientId) ?? 0) + amt);
      }
    }
    if (c.campaign_id) {
      costByCampaign.set(
        c.campaign_id,
        (costByCampaign.get(c.campaign_id) ?? 0) + amt,
      );
    }
  }

  const laborByClient = new Map<string, number>();
  for (const w of periodWork) {
    const clientId = campClient.get(w.campaign_id);
    if (!clientId) continue;
    const rate = rates.get(w.user_id) ?? 75;
    laborByClient.set(
      clientId,
      (laborByClient.get(clientId) ?? 0) + num(w.hours) * rate,
    );
  }

  const byClient: ClientRow[] = clients
    .map((cl) => {
      const rev = revByClient.get(cl.id) ?? 0;
      const labor = laborByClient.get(cl.id) ?? 0;
      const direct = costByClient.get(cl.id) ?? 0;
      const row = clientProfitabilityRow(
        cl.id,
        cl.client_name,
        rev,
        direct,
        labor,
        0,
      );
      return {
        ...row,
        accountManager: amNameByClient.get(cl.id) ?? "Unassigned",
        status: cl.status,
      };
    })
    .filter((r) => r.revenue > 0 || r.costs > 0)
    .sort((a, b) => b.profit - a.profit);

  const byCampaign: CampaignRow[] = campaigns
    .map((c) => {
      const rev = revByCampaign.get(c.id) ?? 0;
      const campCosts = costByCampaign.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.campaign_name,
        client: c.clients?.client_name ?? "—",
        clientId: c.client_id,
        revenue: rev,
        costs: campCosts,
        profit: rev - campCosts,
        margin: rev > 0 ? ((rev - campCosts) / rev) * 100 : null,
        accountManager: amNameByClient.get(c.client_id) ?? "Unassigned",
      };
    })
    .filter((r) => r.revenue > 0 || r.costs > 0)
    .sort((a, b) => b.profit - a.profit);

  const byAm: AmRow[] = includeAccountManagers
    ? (() => {
        const map = new Map<string, AmRow>();
        for (const cl of clients) {
          const amId = cl.account_manager_id ?? "unassigned";
          const amName = amNameByClient.get(cl.id) ?? "Unassigned";
          const cur = map.get(amId) ?? {
            name: amName,
            revenue: 0,
            costs: 0,
            profit: 0,
          };
          const row = byClient.find((r) => r.clientId === cl.id);
          if (row) {
            cur.revenue += row.revenue;
            cur.costs += row.costs;
            cur.profit += row.profit;
          }
          map.set(amId, cur);
        }
        return [...map.values()]
          .filter((r) => r.revenue > 0 || r.costs > 0)
          .sort((a, b) => b.profit - a.profit);
      })()
    : [];

  return { byClient, byCampaign, byAm };
}

export function selectProfitabilityExportRows(
  source: ProfitabilityExportSource,
  filters: ProfitabilityExportFilters,
  includeAccountManagers: boolean,
): {
  headers: string[];
  rows: Record<string, unknown>[];
  label: string;
  count: number;
} {
  const range = resolveExportPeriod(
    filters.period,
    filters.dateFrom,
    filters.dateTo,
  );
  const { byClient, byCampaign, byAm } = buildProfitabilityExportRows(
    source,
    range.start,
    range.end,
    includeAccountManagers,
  );

  const clientId = filters.clientId;

  if (filters.view === "campaign") {
    const rows = byCampaign
      .filter((r) => !clientId || r.clientId === clientId)
      .map((r) => ({
        Campaign: r.name,
        Client: r.client,
        "Account Manager": r.accountManager,
        Revenue: r.revenue.toFixed(2),
        Costs: r.costs.toFixed(2),
        Profit: r.profit.toFixed(2),
        "Margin %": r.margin == null ? "" : r.margin.toFixed(1),
      }));
    return {
      headers: [
        "Campaign",
        "Client",
        "Account Manager",
        "Revenue",
        "Costs",
        "Profit",
        "Margin %",
      ],
      rows,
      label: `Campaign profitability · ${range.label}`,
      count: rows.length,
    };
  }

  if (filters.view === "account_manager" && includeAccountManagers) {
    const rows = byAm.map((r) => ({
      "Account Manager": r.name,
      Revenue: r.revenue.toFixed(2),
      Costs: r.costs.toFixed(2),
      Profit: r.profit.toFixed(2),
      "Margin %":
        r.revenue > 0 ? ((r.profit / r.revenue) * 100).toFixed(1) : "",
    }));
    return {
      headers: ["Account Manager", "Revenue", "Costs", "Profit", "Margin %"],
      rows,
      label: `Account manager profitability · ${range.label}`,
      count: rows.length,
    };
  }

  const rows = byClient
    .filter((r) => !clientId || r.clientId === clientId)
    .map((r) => ({
      Client: r.name,
      Status: r.status,
      "Account Manager": r.accountManager,
      Revenue: r.revenue.toFixed(2),
      Labor: r.laborCost.toFixed(2),
      Costs: r.costs.toFixed(2),
      Profit: r.profit.toFixed(2),
      "Margin %": r.margin == null ? "" : r.margin.toFixed(1),
      "ROI %": r.roi == null ? "" : r.roi.toFixed(1),
    }));
  return {
    headers: [
      "Client",
      "Status",
      "Account Manager",
      "Revenue",
      "Labor",
      "Costs",
      "Profit",
      "Margin %",
      "ROI %",
    ],
    rows,
    label: `Client profitability · ${range.label}`,
    count: rows.length,
  };
}

function buildProfitabilityPdf(
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
            ? moneyFmt(val)
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

export function downloadProfitabilityExport(
  source: ProfitabilityExportSource,
  filters: ProfitabilityExportFilters,
  format: ProfitabilityExportFormat,
  includeAccountManagers: boolean,
): { count: number; filename: string } {
  const selected = selectProfitabilityExportRows(
    source,
    filters,
    includeAccountManagers,
  );
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `profitability-${filters.view}-${stamp}`;

  if (format === "csv") {
    const csv = rowsToCsv(selected.headers, selected.rows);
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `${base}.csv`,
    );
    return { count: selected.count, filename: `${base}.csv` };
  }

  const bytes = buildProfitabilityPdf(
    selected.label,
    selected.headers,
    selected.rows,
  );
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(
    new Blob([copy.buffer], { type: "application/pdf" }),
    `${base}.pdf`,
  );
  return { count: selected.count, filename: `${base}.pdf` };
}
