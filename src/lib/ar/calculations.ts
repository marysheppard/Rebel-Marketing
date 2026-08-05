import {
  addMonths,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";
import {
  arAgingBucket,
  paidAmount,
  remainingBalance,
} from "@/lib/finance";
import { daysBetween, num } from "@/lib/format";
import {
  AR_AGING_BUCKETS,
  inDateRange,
  previousArPeriodRange,
  resolveArDateRange,
  type ArAgingBucket,
  type ArFilterState,
  type ArTrendGroupBy,
} from "@/lib/ar/filters";

export type ArPayment = {
  amount: number | string;
  payment_date?: string | null;
};

export type ArInvoiceRow = {
  id: string;
  client_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number | string;
  status: string;
  disputed: boolean;
  notes?: string | null;
  clients?: {
    client_name?: string;
    account_manager_id?: string | null;
  } | null;
  payments?: ArPayment[] | null;
};

export type ArEnrichedInvoice = ArInvoiceRow & {
  clientName: string;
  accountManagerId: string | null;
  paid: number;
  remaining: number;
  daysOut: number | null;
  agingBucket: ArAgingBucket;
  isOpen: boolean;
  isOverdue: boolean;
  paymentStatus: PaymentStatusKey;
};

export type PaymentStatusKey =
  | "paid"
  | "partial"
  | "unpaid"
  | "overdue"
  | "disputed";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusKey, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
  overdue: "Overdue",
  disputed: "Disputed",
};

export type ArKpiDelta = { amount: number; pct: number | null };

export type ArKpis = {
  openAr: number;
  overdueAr: number;
  openInvoiceCount: number;
  collectionRate: number | null;
  avgDaysToPay: number | null;
  disputedBalance: number;
  partialPaymentBalance: number;
  ninetyPlusBalance: number;
  openArDelta: ArKpiDelta;
  overdueArDelta: ArKpiDelta;
  openCountDelta: ArKpiDelta;
  collectionRateDelta: ArKpiDelta;
  avgDaysToPayDelta: ArKpiDelta;
  disputedDelta: ArKpiDelta;
  partialDelta: ArKpiDelta;
  ninetyPlusDelta: ArKpiDelta;
};

export type AgingPoint = { bucket: ArAgingBucket; amount: number; count: number };

export type TrendPoint = {
  period: string;
  label: string;
  openAr: number;
  overdueAr: number;
  cashCollected: number;
  newInvoices: number;
};

export type TopClientRow = {
  clientId: string;
  clientName: string;
  outstanding: number;
  oldestInvoiceDate: string | null;
  avgDaysLate: number | null;
};

export type PaymentStatusSlice = {
  key: PaymentStatusKey;
  name: string;
  amount: number;
  count: number;
  percent: number | null;
  average: number | null;
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatusKey, string> = {
  paid: "oklch(68% 0.12 160)",
  partial: "oklch(70% 0.12 85)",
  unpaid: "oklch(65% 0.08 250)",
  overdue: "oklch(60% 0.16 25)",
  disputed: "oklch(65% 0.14 300)",
};

export type RiskReason =
  | "90+ days overdue"
  | "High balance"
  | "Repeated late payer"
  | "Dispute";

export type CollectionRiskRow = {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  remaining: number;
  daysPastDue: number;
  reasons: RiskReason[];
  score: number;
};

function clientNameOf(inv: ArInvoiceRow): string {
  return inv.clients?.client_name ?? "—";
}

function accountManagerOf(inv: ArInvoiceRow): string | null {
  return inv.clients?.account_manager_id ?? null;
}

export function isOpenInvoice(inv: ArInvoiceRow): boolean {
  const remaining = remainingBalance(inv);
  return remaining > 0 && !["Draft", "Canceled", "Paid"].includes(inv.status);
}

export function classifyPaymentStatus(
  inv: ArInvoiceRow,
  asOf: Date = new Date(),
): PaymentStatusKey {
  const paid = paidAmount(inv);
  const remaining = remainingBalance(inv);
  if (inv.disputed && remaining > 0) return "disputed";
  if (remaining <= 0 || inv.status === "Paid") return "paid";
  if (paid > 0 && remaining > 0) return "partial";
  if (remaining > 0 && new Date(inv.due_date) < asOf) return "overdue";
  return "unpaid";
}

export function enrichInvoice(
  inv: ArInvoiceRow,
  asOf: Date = new Date(),
): ArEnrichedInvoice {
  const paid = paidAmount(inv);
  const remaining = remainingBalance(inv);
  const open = isOpenInvoice(inv);
  const overdue = open && new Date(inv.due_date) < asOf;
  return {
    ...inv,
    clientName: clientNameOf(inv),
    accountManagerId: accountManagerOf(inv),
    paid,
    remaining,
    daysOut: open ? daysBetween(inv.invoice_date, asOf) : null,
    agingBucket: arAgingBucket(inv.due_date, asOf) as ArAgingBucket,
    isOpen: open,
    isOverdue: overdue,
    paymentStatus: classifyPaymentStatus(inv, asOf),
  };
}

export function enrichInvoices(
  invoices: ArInvoiceRow[],
  asOf: Date = new Date(),
): ArEnrichedInvoice[] {
  return invoices.map((i) => enrichInvoice(i, asOf));
}

export function earliestInvoiceDate(invoices: ArInvoiceRow[]): string | null {
  let min: string | null = null;
  for (const i of invoices) {
    if (!i.invoice_date) continue;
    if (!min || i.invoice_date < min) min = i.invoice_date;
  }
  return min;
}

export function filterArInvoices(
  invoices: ArEnrichedInvoice[],
  filters: ArFilterState,
  range: { start: string; end: string },
): ArEnrichedInvoice[] {
  const q = filters.search.trim().toLowerCase();
  return invoices.filter((i) => {
    if (!inDateRange(i.invoice_date, range.start, range.end)) return false;
    if (filters.clientId && i.client_id !== filters.clientId) return false;
    if (
      filters.accountManagerId &&
      i.accountManagerId !== filters.accountManagerId
    ) {
      return false;
    }
    if (filters.status !== "all") {
      // Overdue / Partially Paid / Paid KPIs and charts use computed payment state;
      // match those rather than only the DB status label.
      if (filters.status === "Overdue") {
        if (!i.isOverdue) return false;
      } else if (filters.status === "Partially Paid") {
        if (i.paymentStatus !== "partial" && i.status !== "Partially Paid") {
          return false;
        }
      } else if (filters.status === "Paid") {
        if (i.paymentStatus !== "paid" && i.status !== "Paid") {
          return false;
        }
      } else if (i.status !== filters.status) {
        return false;
      }
    }
    if (filters.aging && i.agingBucket !== filters.aging) return false;
    if (filters.dispute === "disputed" && !i.disputed) return false;
    if (filters.dispute === "not_disputed" && i.disputed) return false;
    if (q) {
      const hay = [
        i.invoice_number,
        i.clientName,
        i.status,
        i.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function periodDelta(current: number, previous: number): ArKpiDelta {
  const amount = current - previous;
  if (previous === 0) {
    return { amount, pct: current === 0 ? 0 : null };
  }
  return { amount, pct: (amount / previous) * 100 };
}

function kpiSnapshot(rows: ArEnrichedInvoice[], asOf: Date): Omit<
  ArKpis,
  | "openArDelta"
  | "overdueArDelta"
  | "openCountDelta"
  | "collectionRateDelta"
  | "avgDaysToPayDelta"
  | "disputedDelta"
  | "partialDelta"
  | "ninetyPlusDelta"
> {
  let openAr = 0;
  let overdueAr = 0;
  let openInvoiceCount = 0;
  let disputedBalance = 0;
  let partialPaymentBalance = 0;
  let ninetyPlusBalance = 0;
  let billed = 0;
  let collected = 0;
  const daysToPay: number[] = [];

  for (const i of rows) {
    billed += num(i.total_amount);
    collected += i.paid;
    if (i.isOpen) {
      openAr += i.remaining;
      openInvoiceCount += 1;
      if (i.isOverdue) overdueAr += i.remaining;
      if (i.disputed) disputedBalance += i.remaining;
      if (i.paymentStatus === "partial") partialPaymentBalance += i.remaining;
      if (i.agingBucket === "90+") ninetyPlusBalance += i.remaining;
    }
    if (i.remaining <= 0 && i.payments?.length) {
      const lastPay = [...i.payments]
        .map((p) => p.payment_date)
        .filter(Boolean)
        .sort()
        .at(-1);
      if (lastPay) {
        daysToPay.push(daysBetween(i.invoice_date, lastPay));
      }
    }
  }

  const collectionRate = billed > 0 ? (collected / billed) * 100 : null;
  const avgDaysToPay =
    daysToPay.length > 0
      ? daysToPay.reduce((s, d) => s + d, 0) / daysToPay.length
      : null;

  void asOf;
  return {
    openAr,
    overdueAr,
    openInvoiceCount,
    collectionRate,
    avgDaysToPay,
    disputedBalance,
    partialPaymentBalance,
    ninetyPlusBalance,
  };
}

export function buildArKpis(
  currentRows: ArEnrichedInvoice[],
  previousRows: ArEnrichedInvoice[],
  asOf: Date = new Date(),
): ArKpis {
  const cur = kpiSnapshot(currentRows, asOf);
  const prev = kpiSnapshot(previousRows, asOf);
  return {
    ...cur,
    openArDelta: periodDelta(cur.openAr, prev.openAr),
    overdueArDelta: periodDelta(cur.overdueAr, prev.overdueAr),
    openCountDelta: periodDelta(cur.openInvoiceCount, prev.openInvoiceCount),
    collectionRateDelta: periodDelta(
      cur.collectionRate ?? 0,
      prev.collectionRate ?? 0,
    ),
    avgDaysToPayDelta: periodDelta(
      cur.avgDaysToPay ?? 0,
      prev.avgDaysToPay ?? 0,
    ),
    disputedDelta: periodDelta(cur.disputedBalance, prev.disputedBalance),
    partialDelta: periodDelta(
      cur.partialPaymentBalance,
      prev.partialPaymentBalance,
    ),
    ninetyPlusDelta: periodDelta(cur.ninetyPlusBalance, prev.ninetyPlusBalance),
  };
}

export function buildAgingSeries(rows: ArEnrichedInvoice[]): AgingPoint[] {
  const map = Object.fromEntries(
    AR_AGING_BUCKETS.map((b) => [b, { amount: 0, count: 0 }]),
  ) as Record<ArAgingBucket, { amount: number; count: number }>;

  for (const i of rows) {
    if (!i.isOpen) continue;
    map[i.agingBucket].amount += i.remaining;
    map[i.agingBucket].count += 1;
  }

  return AR_AGING_BUCKETS.map((bucket) => ({
    bucket,
    amount: map[bucket].amount,
    count: map[bucket].count,
  }));
}

export function buildTrendSeries(
  allEnriched: ArEnrichedInvoice[],
  range: { start: string; end: string },
  asOf: Date = new Date(),
  groupBy: ArTrendGroupBy = "month",
): TrendPoint[] {
  const periods = enumerateArTrendPeriods(range.start, range.end, groupBy);
  if (!periods.length) return [];

  return periods.map(({ key, label, periodEnd }) => {
    const asOfPeriod = parseISO(periodEnd) > asOf ? asOf : parseISO(periodEnd);

    let openAr = 0;
    let overdueAr = 0;
    let cashCollected = 0;
    let newInvoices = 0;

    for (const i of allEnriched) {
      if (invoiceInPeriod(i.invoice_date, key, groupBy)) {
        newInvoices += num(i.total_amount);
      }
      for (const p of i.payments ?? []) {
        if (p.payment_date && invoiceInPeriod(p.payment_date, key, groupBy)) {
          cashCollected += num(p.amount);
        }
      }
      // Snapshot open AR as of period end: issued on/before period end, still open then
      if (
        i.invoice_date <= periodEnd &&
        !["Draft", "Canceled"].includes(i.status)
      ) {
        const paidByThen = (i.payments ?? [])
          .filter((p) => !p.payment_date || p.payment_date <= periodEnd)
          .reduce((s, p) => s + num(p.amount), 0);
        const rem = Math.max(0, num(i.total_amount) - paidByThen);
        if (rem > 0 && i.status !== "Paid") {
          openAr += rem;
          if (new Date(i.due_date) < asOfPeriod) overdueAr += rem;
        }
      }
    }

    return { period: key, label, openAr, overdueAr, cashCollected, newInvoices };
  });
}

function enumerateArTrendPeriods(
  start: string,
  end: string,
  groupBy: ArTrendGroupBy,
): { key: string; label: string; periodEnd: string }[] {
  const periods: { key: string; label: string; periodEnd: string }[] = [];
  const seen = new Set<string>();
  let cursor = parseISO(start);
  const endDate = parseISO(end);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(endDate.getTime())) {
    return periods;
  }

  for (let i = 0; i < 500; i++) {
    if (cursor > endDate) break;

    let key: string;
    let label: string;
    let periodEndDate: Date;

    if (groupBy === "quarter") {
      const qStart = startOfQuarter(cursor);
      const q = Math.floor(qStart.getMonth() / 3) + 1;
      key = `${format(qStart, "yyyy")}-Q${q}`;
      label = `Q${q} ${format(qStart, "yyyy")}`;
      periodEndDate = endOfQuarter(cursor);
      cursor = addMonths(qStart, 3);
    } else if (groupBy === "year") {
      key = format(cursor, "yyyy");
      label = format(cursor, "yyyy");
      periodEndDate = endOfYear(cursor);
      cursor = addMonths(startOfYear(cursor), 12);
    } else {
      const monthStart = startOfMonth(cursor);
      key = format(monthStart, "yyyy-MM");
      label = format(monthStart, "MMM yyyy");
      periodEndDate = endOfMonth(cursor);
      cursor = addMonths(monthStart, 1);
    }

    if (!seen.has(key)) {
      seen.add(key);
      const cappedEnd =
        periodEndDate > endDate ? endDate : periodEndDate;
      periods.push({
        key,
        label,
        periodEnd: format(cappedEnd, "yyyy-MM-dd"),
      });
    }
  }

  return periods;
}

function invoiceInPeriod(
  dateStr: string,
  periodKey: string,
  groupBy: ArTrendGroupBy,
): boolean {
  if (groupBy === "quarter") {
    const d = parseISO(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    const qStart = startOfQuarter(d);
    const q = Math.floor(qStart.getMonth() / 3) + 1;
    return `${format(qStart, "yyyy")}-Q${q}` === periodKey;
  }
  if (groupBy === "year") {
    return dateStr.startsWith(periodKey);
  }
  return dateStr.startsWith(periodKey);
}

export function buildTopClients(
  rows: ArEnrichedInvoice[],
  limit: number | null = null,
  asOf: Date = new Date(),
): TopClientRow[] {
  const map = new Map<
    string,
    {
      clientName: string;
      outstanding: number;
      oldest: string | null;
      lateDays: number[];
    }
  >();

  for (const i of rows) {
    if (!i.isOpen) continue;
    const existing = map.get(i.client_id) ?? {
      clientName: i.clientName,
      outstanding: 0,
      oldest: null,
      lateDays: [],
    };
    existing.outstanding += i.remaining;
    if (!existing.oldest || i.invoice_date < existing.oldest) {
      existing.oldest = i.invoice_date;
    }
    if (i.isOverdue) {
      existing.lateDays.push(
        Math.max(0, daysBetween(i.due_date, asOf)),
      );
    }
    map.set(i.client_id, existing);
  }

  const sorted = [...map.entries()]
    .map(([clientId, v]) => ({
      clientId,
      clientName: v.clientName,
      outstanding: v.outstanding,
      oldestInvoiceDate: v.oldest,
      avgDaysLate:
        v.lateDays.length > 0
          ? v.lateDays.reduce((s, d) => s + d, 0) / v.lateDays.length
          : null,
    }))
    .sort((a, b) => b.outstanding - a.outstanding);

  return limit == null ? sorted : sorted.slice(0, limit);
}

export function buildPaymentStatusSlices(
  rows: ArEnrichedInvoice[],
): PaymentStatusSlice[] {
  const keys: PaymentStatusKey[] = [
    "paid",
    "partial",
    "unpaid",
    "overdue",
    "disputed",
  ];
  const map = Object.fromEntries(
    keys.map((k) => [k, { amount: 0, count: 0 }]),
  ) as Record<PaymentStatusKey, { amount: number; count: number }>;

  for (const i of rows) {
    const key = i.paymentStatus;
    const amt =
      key === "paid" ? i.paid : i.remaining > 0 ? i.remaining : i.paid;
    map[key].amount += amt;
    map[key].count += 1;
  }

  const total = keys.reduce((s, k) => s + map[k].amount, 0);
  return keys
    .map((key) => ({
      key,
      name: PAYMENT_STATUS_LABELS[key],
      amount: map[key].amount,
      count: map[key].count,
      percent: total > 0 ? (map[key].amount / total) * 100 : null,
      average:
        map[key].count > 0 ? map[key].amount / map[key].count : null,
    }))
    .filter((s) => s.count > 0 || s.amount > 0);
}

export function buildCollectionRisk(
  rows: ArEnrichedInvoice[],
  asOf: Date = new Date(),
  limit = 10,
): CollectionRiskRow[] {
  const open = rows.filter((i) => i.isOpen);
  const balances = open.map((i) => i.remaining).sort((a, b) => a - b);
  const highThreshold =
    balances.length > 0
      ? balances[Math.floor(balances.length * 0.75)] ?? balances[balances.length - 1]
      : Infinity;

  const lateClientCounts = new Map<string, number>();
  for (const i of rows) {
    if (i.isOverdue || (i.remaining <= 0 && i.payments?.length)) {
      const paidLate = (i.payments ?? []).some(
        (p) => p.payment_date && p.payment_date > i.due_date,
      );
      if (i.isOverdue || paidLate) {
        lateClientCounts.set(
          i.client_id,
          (lateClientCounts.get(i.client_id) ?? 0) + 1,
        );
      }
    }
  }

  const risks: CollectionRiskRow[] = [];
  for (const i of open) {
    const reasons: RiskReason[] = [];
    const daysPastDue = Math.max(0, daysBetween(i.due_date, asOf));
    if (i.agingBucket === "90+") reasons.push("90+ days overdue");
    if (i.remaining >= highThreshold && i.remaining > 0) {
      reasons.push("High balance");
    }
    if ((lateClientCounts.get(i.client_id) ?? 0) >= 2) {
      reasons.push("Repeated late payer");
    }
    if (i.disputed) reasons.push("Dispute");
    if (!reasons.length) continue;

    let score = 0;
    if (reasons.includes("90+ days overdue")) score += 40;
    if (reasons.includes("High balance")) score += 25;
    if (reasons.includes("Repeated late payer")) score += 20;
    if (reasons.includes("Dispute")) score += 30;
    score += Math.min(20, Math.floor(daysPastDue / 10));

    risks.push({
      invoiceId: i.id,
      invoiceNumber: i.invoice_number,
      clientName: i.clientName,
      remaining: i.remaining,
      daysPastDue,
      reasons,
      score,
    });
  }

  return risks.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function buildArDashboardModel(
  invoices: ArInvoiceRow[],
  filters: ArFilterState,
  asOf: Date = new Date(),
  options: { trendGroup?: ArTrendGroupBy } = {},
) {
  const enriched = enrichInvoices(invoices, asOf);
  const earliest = earliestInvoiceDate(invoices);
  const range = resolveArDateRange(filters, asOf, earliest);
  const prevRange = previousArPeriodRange(range.start, range.end);

  const filtered = filterArInvoices(enriched, filters, range);
  const previousFiltered = filterArInvoices(enriched, filters, prevRange);

  // Payment status viz stays unscoped by status/dispute so drill-down can compare slices.
  const paymentStatusFilters: ArFilterState = {
    ...filters,
    status: "all",
    dispute: "all",
  };
  const paymentStatusRows = filterArInvoices(
    enriched,
    paymentStatusFilters,
    range,
  );

  const kpis = buildArKpis(filtered, previousFiltered, asOf);
  const aging = buildAgingSeries(filtered);
  const trend = buildTrendSeries(
    enriched,
    range,
    asOf,
    options.trendGroup ?? "month",
  );
  const topClients = buildTopClients(filtered, null, asOf);
  const paymentStatus = buildPaymentStatusSlices(paymentStatusRows);
  const risks = buildCollectionRisk(filtered, asOf, 10);

  return {
    range,
    previousRange: prevRange,
    filtered,
    kpis,
    aging,
    trend,
    topClients,
    paymentStatus,
    risks,
  };
}
