import { num } from "@/lib/format";
import {
  contractBillRate,
  overageAmount,
  overageHours,
  remainingBalance,
  suggestedInvoiceSubtotal,
  type InvoiceLike,
} from "@/lib/finance";

/** Default bill rate when contract overage_hourly_rate is unset. */
export const DEFAULT_BILL_RATE_USD = 150;

export const INVOICE_STATUS_BADGE_MAP: Record<string, string> = {
  Draft: "badge-ghost",
  Sent: "badge-info",
  "Partially Paid": "badge-warning",
  Overdue: "badge-error",
  /** Orange for dispute (not same as Overdue red) */
  Disputed: "badge-warning border-orange-500 bg-orange-500 text-white",
  Paid: "badge-success",
  Canceled: "badge-ghost",
};

export type UnbilledEntry = {
  id: string;
  work_date: string;
  hours: number;
  work_type: string;
  description: string;
  campaign_id: string;
  campaign_name: string;
  client_id: string;
  client_name: string;
  estimated_rate: number;
  estimated_amount: number;
  contract_id?: string | null;
};

export type ContractBillingTerms = {
  id: string;
  billing_method?: string | null;
  monthly_retainer?: number | string | null;
  project_fee?: number | string | null;
  deposit_amount?: number | string | null;
  included_agency_hours?: number | string | null;
  overage_hourly_rate?: number | string | null;
  pass_through_markup_pct?: number | string | null;
};

export type InvoiceSuggestion = {
  invoiceType: InvoiceType;
  lineItems: LineItem[];
  subtotal: number;
  passThrough: number;
  markupPct: number;
  rate: number;
  summary: string;
};

export type BillingInvoiceRow = {
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
  disputed: boolean;
  notes: string;
  created_at: string;
  client_name: string;
  remaining: number;
  campaign_label: string;
  payments?: { amount: number }[] | null;
  /** Optional fields used for invoice PDF generation */
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contract_number?: string | null;
  contract_name?: string | null;
  payment_terms?: string | null;
};

export type InvoiceType =
  | "hourly"
  | "fixed"
  | "retainer"
  | "mixed"
  | "media";

export type LineItem = {
  id: string;
  label: string;
  qty: number;
  rate: number;
  amount: number;
  kind: "labor" | "fixed" | "retainer" | "pass_through" | "markup" | "other";
};

export type ClientCampaignGroup = {
  client_id: string;
  client_name: string;
  campaigns: {
    campaign_id: string;
    campaign_name: string;
    entries: UnbilledEntry[];
  }[];
};

const META_PREFIX = "meta:work_entry_ids=";

export function estimateEntryAmount(
  hours: number,
  rate = DEFAULT_BILL_RATE_USD,
) {
  return Math.round(num(hours) * rate * 100) / 100;
}

export function groupUnbilledByClient(
  entries: UnbilledEntry[],
): ClientCampaignGroup[] {
  const byClient = new Map<string, ClientCampaignGroup>();

  for (const e of entries) {
    let client = byClient.get(e.client_id);
    if (!client) {
      client = {
        client_id: e.client_id,
        client_name: e.client_name || "Unknown client",
        campaigns: [],
      };
      byClient.set(e.client_id, client);
    }
    let camp = client.campaigns.find((c) => c.campaign_id === e.campaign_id);
    if (!camp) {
      camp = {
        campaign_id: e.campaign_id,
        campaign_name: e.campaign_name || "Campaign",
        entries: [],
      };
      client.campaigns.push(camp);
    }
    camp.entries.push(e);
  }

  return Array.from(byClient.values()).sort((a, b) =>
    a.client_name.localeCompare(b.client_name),
  );
}

export function summarizeEntries(entries: UnbilledEntry[]) {
  const hours = entries.reduce((s, e) => s + num(e.hours), 0);
  const amount = entries.reduce((s, e) => s + num(e.estimated_amount), 0);
  return {
    count: entries.length,
    hours: Math.round(hours * 10) / 10,
    amount: Math.round(amount * 100) / 100,
  };
}

export function buildLineItemsFromEntries(
  entries: UnbilledEntry[],
  groupBy: "campaign" | "work_type",
  rate = DEFAULT_BILL_RATE_USD,
): LineItem[] {
  const buckets = new Map<
    string,
    { label: string; hours: number; amount: number }
  >();

  for (const e of entries) {
    const key = groupBy === "campaign" ? e.campaign_id : e.work_type || "Other";
    const label =
      groupBy === "campaign"
        ? e.campaign_name || "Campaign"
        : e.work_type || "Other";
    const prev = buckets.get(key) ?? { label, hours: 0, amount: 0 };
    prev.hours += num(e.hours);
    prev.amount +=
      num(e.estimated_amount) ||
      estimateEntryAmount(e.hours, e.estimated_rate || rate);
    buckets.set(key, prev);
  }

  return Array.from(buckets.entries()).map(([key, b]) => {
    const hours = Math.round(b.hours * 10) / 10;
    const amount = Math.round(b.amount * 100) / 100;
    const lineRate =
      hours > 0 ? Math.round((amount / hours) * 100) / 100 : rate;
    return {
      id: key,
      label: b.label,
      qty: hours,
      rate: lineRate,
      amount,
      kind: "labor" as const,
    };
  });
}

/**
 * Build suggested invoice lines from MSA terms + approved unbilled hours.
 * Pass-through costs are optional inputs from the composer.
 */
export function buildInvoiceSuggestion(input: {
  contract: ContractBillingTerms | null | undefined;
  entries: UnbilledEntry[];
  passThrough?: number;
  groupBy?: "campaign" | "work_type";
  hasPriorSentInvoice?: boolean;
}): InvoiceSuggestion {
  const contract = input.contract;
  const entries = input.entries;
  const groupBy = input.groupBy ?? "campaign";
  const passThrough = num(input.passThrough);
  const method = contract?.billing_method ?? "";
  const rate = contract
    ? contractBillRate(contract, DEFAULT_BILL_RATE_USD)
    : entries[0]?.estimated_rate || DEFAULT_BILL_RATE_USD;
  const markupPct = num(contract?.pass_through_markup_pct) || 0;
  const totalHours = entries.reduce((s, e) => s + num(e.hours), 0);
  const included = num(contract?.included_agency_hours);
  const retainer = num(contract?.monthly_retainer);
  const project = num(contract?.project_fee);

  const laborItems = buildLineItemsFromEntries(
    entries.map((e) => ({
      ...e,
      estimated_rate: e.estimated_rate || rate,
      estimated_amount:
        e.estimated_amount || estimateEntryAmount(e.hours, e.estimated_rate || rate),
    })),
    groupBy,
    rate,
  );

  const lineItems: LineItem[] = [];
  let invoiceType: InvoiceType = "hourly";
  let summary = "Hourly / time and materials from approved work";

  if (
    ["Monthly Retainer", "Hybrid", "Mixed"].includes(method) &&
    retainer > 0
  ) {
    invoiceType = method === "Monthly Retainer" ? "retainer" : "mixed";
    lineItems.push({
      id: "retainer",
      label: "Monthly retainer",
      qty: 1,
      rate: retainer,
      amount: retainer,
      kind: "retainer",
    });
    const overHrs = overageHours(included, totalHours);
    if (overHrs > 0 && rate > 0) {
      const overAmt = overageAmount(included, totalHours, rate);
      lineItems.push({
        id: "overage",
        label: `Overage hours (${overHrs.toFixed(1)}h)`,
        qty: Math.round(overHrs * 10) / 10,
        rate,
        amount: Math.round(overAmt * 100) / 100,
        kind: "labor",
      });
    }
    summary =
      overHrs > 0
        ? `Retainer ${retainer.toFixed(2)} + overage hours`
        : `Monthly retainer from contract`;
  } else if (
    ["Project Fee", "Campaign Billing"].includes(method) &&
    project > 0 &&
    !input.hasPriorSentInvoice
  ) {
    invoiceType = "fixed";
    lineItems.push({
      id: "project",
      label: method === "Campaign Billing" ? "Campaign fee" : "Project fee",
      qty: 1,
      rate: project,
      amount: project,
      kind: "fixed",
    });
    summary = `${method} from contract`;
  } else if (["Hybrid", "Mixed"].includes(method) && project > 0 && retainer <= 0) {
    invoiceType = "mixed";
    lineItems.push({
      id: "project",
      label: "Project fee",
      qty: 1,
      rate: project,
      amount: project,
      kind: "fixed",
    });
    lineItems.push(...laborItems);
    summary = "Hybrid fee + approved labor";
  } else if (method === "Pass-Through" || passThrough > 0) {
    invoiceType = passThrough > 0 ? "media" : "hourly";
    lineItems.push(...laborItems);
    summary =
      passThrough > 0
        ? "Labor plus pass-through / media"
        : "Approved billable hours";
  } else {
    // Hourly / T&M or fallback
    invoiceType = "hourly";
    lineItems.push(...laborItems);
    if (!lineItems.length && suggestedInvoiceSubtotal(contract ?? {}) > 0) {
      const base = suggestedInvoiceSubtotal(contract ?? {});
      lineItems.push({
        id: "contract",
        label: "Contract suggested amount",
        qty: 1,
        rate: base,
        amount: base,
        kind: "other",
      });
      invoiceType = retainer > 0 ? "retainer" : "fixed";
      summary = "Contract suggested amount";
    }
  }

  // If retainer path produced no overage and no entries, keep retainer-only.
  // If hourly path empty but we have entries mapped incorrectly, ensure labor.
  if (!lineItems.length && laborItems.length) {
    lineItems.push(...laborItems);
  }

  const subtotal = lineItemsSubtotal(lineItems);
  return {
    invoiceType,
    lineItems,
    subtotal,
    passThrough,
    markupPct,
    rate,
    summary,
  };
}

export function lineItemsSubtotal(items: LineItem[]) {
  return Math.round(items.reduce((s, i) => s + num(i.amount), 0) * 100) / 100;
}

export function encodeWorkEntryMeta(ids: string[], restNotes = "") {
  const meta = `${META_PREFIX}${ids.join(",")}`;
  const cleaned = restNotes.replace(new RegExp(`${META_PREFIX}[^\\n]*\\n?`, "g"), "").trim();
  return cleaned ? `${meta}\n${cleaned}` : meta;
}

export function parseWorkEntryIdsFromNotes(notes: string | null | undefined) {
  if (!notes) return [] as string[];
  const line = notes.split("\n").find((l) => l.startsWith(META_PREFIX));
  if (!line) return [];
  return line
    .slice(META_PREFIX.length)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function stripWorkEntryMeta(notes: string | null | undefined) {
  if (!notes) return "";
  return notes
    .split("\n")
    .filter((l) => !l.startsWith(META_PREFIX))
    .join("\n")
    .trim();
}

export function partitionInvoices<T extends InvoiceLike & { status: string; disputed?: boolean }>(
  invoices: T[],
) {
  const drafts: T[] = [];
  const active: T[] = [];
  const history: T[] = [];

  for (const inv of invoices) {
    if (inv.status === "Draft") {
      drafts.push(inv);
      continue;
    }
    if (inv.status === "Paid" || inv.status === "Canceled") {
      history.push(inv);
      continue;
    }
    const remaining = remainingBalance(inv);
    if (
      inv.status === "Disputed" ||
      inv.disputed ||
      remaining > 0 ||
      ["Sent", "Partially Paid", "Overdue"].includes(inv.status)
    ) {
      active.push(inv);
    } else {
      history.push(inv);
    }
  }

  return { drafts, active, history };
}

export function generateInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-8)}`;
}

export function defaultDueDate(from = new Date(), netDays = 30) {
  const d = new Date(from);
  d.setDate(d.getDate() + netDays);
  return d.toISOString().slice(0, 10);
}

export function singleClientId(entries: UnbilledEntry[]): string | null {
  if (!entries.length) return null;
  const id = entries[0].client_id;
  return entries.every((e) => e.client_id === id) ? id : null;
}

export function primaryCampaignId(entries: UnbilledEntry[]): string | null {
  const ids = [...new Set(entries.map((e) => e.campaign_id))];
  return ids.length === 1 ? ids[0] : null;
}

/** Stacked bar colors / bucket keys for invoice dollar mix. */
export const INVOICE_STATUS_STACK_KEYS = [
  "sent",
  "partial",
  "paid",
  "disputed",
  "draft",
  "overdue",
  "canceled",
] as const;

export type InvoiceStatusStackKey = (typeof INVOICE_STATUS_STACK_KEYS)[number];

export const INVOICE_STATUS_STACK_META: Record<
  InvoiceStatusStackKey,
  { label: string; color: string }
> = {
  sent: { label: "Sent", color: "#3b82f6" },
  partial: { label: "Partially Paid", color: "#eab308" },
  paid: { label: "Fully Paid", color: "#22c55e" },
  disputed: { label: "Disputed", color: "#f97316" },
  draft: { label: "Draft", color: "#94a3b8" },
  overdue: { label: "Overdue", color: "#ef4444" },
  canceled: { label: "Canceled", color: "#cbd5e1" },
};

export type InvoiceStatusStack = {
  amounts: Record<InvoiceStatusStackKey, number>;
  total: number;
  count: number;
};

function statusBucket(
  inv: { status: string; disputed?: boolean },
): InvoiceStatusStackKey {
  if (inv.status === "Disputed" || inv.disputed) return "disputed";
  if (inv.status === "Partially Paid") return "partial";
  if (inv.status === "Paid") return "paid";
  if (inv.status === "Draft") return "draft";
  if (inv.status === "Overdue") return "overdue";
  if (inv.status === "Canceled") return "canceled";
  if (inv.status === "Sent") return "sent";
  // fallback for any other status
  return "sent";
}

/** Sum invoice total_amount by status bucket for the stacked bar. */
export function invoiceStatusAmountStack(
  invoices: { total_amount: number | string; status: string; disputed?: boolean }[],
): InvoiceStatusStack {
  const amounts = {
    sent: 0,
    partial: 0,
    paid: 0,
    disputed: 0,
    draft: 0,
    overdue: 0,
    canceled: 0,
  } satisfies Record<InvoiceStatusStackKey, number>;

  for (const inv of invoices) {
    const key = statusBucket(inv);
    amounts[key] += num(inv.total_amount);
  }

  for (const k of INVOICE_STATUS_STACK_KEYS) {
    amounts[k] = Math.round(amounts[k] * 100) / 100;
  }

  const total = Math.round(
    INVOICE_STATUS_STACK_KEYS.reduce((s, k) => s + amounts[k], 0) * 100,
  ) / 100;

  return { amounts, total, count: invoices.length };
}

export type InvoiceStatusChartSlice = {
  key: InvoiceStatusStackKey;
  name: string;
  value: number;
  count: number;
  share: number;
  average: number | null;
};

/** Donut slices for invoice mix by status (amount > 0 only). */
export function buildInvoiceStatusSlices(
  invoices: {
    total_amount: number | string;
    status: string;
    disputed?: boolean;
  }[],
): { slices: InvoiceStatusChartSlice[]; total: number; count: number } {
  const amounts = {
    sent: 0,
    partial: 0,
    paid: 0,
    disputed: 0,
    draft: 0,
    overdue: 0,
    canceled: 0,
  } satisfies Record<InvoiceStatusStackKey, number>;
  const counts = {
    sent: 0,
    partial: 0,
    paid: 0,
    disputed: 0,
    draft: 0,
    overdue: 0,
    canceled: 0,
  } satisfies Record<InvoiceStatusStackKey, number>;

  for (const inv of invoices) {
    const key = statusBucket(inv);
    amounts[key] += num(inv.total_amount);
    counts[key] += 1;
  }

  for (const k of INVOICE_STATUS_STACK_KEYS) {
    amounts[k] = Math.round(amounts[k] * 100) / 100;
  }

  const total =
    Math.round(
      INVOICE_STATUS_STACK_KEYS.reduce((s, k) => s + amounts[k], 0) * 100,
    ) / 100;

  const slices: InvoiceStatusChartSlice[] = INVOICE_STATUS_STACK_KEYS.filter(
    (k) => amounts[k] > 0,
  ).map((key) => {
    const value = amounts[key];
    const count = counts[key];
    return {
      key,
      name: INVOICE_STATUS_STACK_META[key].label,
      value,
      count,
      share: total > 0 ? (value / total) * 100 : 0,
      average: count > 0 ? Math.round((value / count) * 100) / 100 : null,
    };
  });

  return { slices, total, count: invoices.length };
}

