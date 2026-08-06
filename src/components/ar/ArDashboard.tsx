"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ListExportButton } from "@/components/exports/ListExportButton";
import { ArFilterBar } from "@/components/ar/ArFilterBar";
import { ArSummaryCards } from "@/components/ar/ArSummaryCards";
import { ArCharts } from "@/components/ar/ArCharts";
import { ArDetailsTable } from "@/components/ar/ArDetailsTable";
import {
  buildArDashboardModel,
  PAYMENT_STATUS_LABELS,
  type ArInvoiceRow,
  type PaymentStatusKey,
} from "@/lib/ar/calculations";
import {
  AR_AGING_BUCKETS,
  AR_DATE_PRESET_LABELS,
  DEFAULT_AR_FILTERS,
  DEFAULT_AR_TREND_GROUP,
  parseArTrendSeries,
  serializeArTrendSeries,
  type ArAgingBucket,
  type ArDatePreset,
  type ArDisputeFilter,
  type ArFilterState,
  type ArInvoiceStatusFilter,
  type ArTrendGroupBy,
  type ArTrendSeriesSelection,
} from "@/lib/ar/filters";
import { format, parseISO } from "date-fns";

const PRESET_VALUES: ArDatePreset[] = [
  "current_month",
  "previous_month",
  "ytd",
  "last_12_months",
  "last_24_months",
  "all_time",
  "custom",
];

const STATUS_VALUES: ArInvoiceStatusFilter[] = [
  "all",
  "Draft",
  "Sent",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Disputed",
  "Canceled",
];

const TREND_GROUP_VALUES: ArTrendGroupBy[] = ["month", "quarter", "year"];

function parseFilters(params: URLSearchParams): ArFilterState {
  const preset = (params.get("preset") as ArDatePreset) || DEFAULT_AR_FILTERS.preset;
  const status =
    (params.get("status") as ArInvoiceStatusFilter) || DEFAULT_AR_FILTERS.status;
  const aging = params.get("aging") as ArAgingBucket | null;
  const dispute =
    (params.get("dispute") as ArDisputeFilter) || DEFAULT_AR_FILTERS.dispute;

  return {
    preset: PRESET_VALUES.includes(preset) ? preset : DEFAULT_AR_FILTERS.preset,
    startDate: params.get("start") || null,
    endDate: params.get("end") || null,
    clientId: params.get("client") || null,
    status: STATUS_VALUES.includes(status) ? status : "all",
    aging:
      aging && (AR_AGING_BUCKETS as readonly string[]).includes(aging)
        ? aging
        : null,
    dispute: ["all", "disputed", "not_disputed"].includes(dispute)
      ? dispute
      : "all",
    accountManagerId: params.get("manager") || null,
    search: params.get("q") || "",
  };
}

function filtersToParams(filters: ArFilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.preset !== DEFAULT_AR_FILTERS.preset) p.set("preset", filters.preset);
  if (filters.startDate) p.set("start", filters.startDate);
  if (filters.endDate) p.set("end", filters.endDate);
  if (filters.clientId) p.set("client", filters.clientId);
  if (filters.status !== "all") p.set("status", filters.status);
  if (filters.aging) p.set("aging", filters.aging);
  if (filters.dispute !== "all") p.set("dispute", filters.dispute);
  if (filters.accountManagerId) p.set("manager", filters.accountManagerId);
  if (filters.search.trim()) p.set("q", filters.search.trim());
  return p;
}

function formatRangeLabel(start: string, end: string) {
  try {
    return `${format(parseISO(start), "MMM d, yyyy")} – ${format(parseISO(end), "MMM d, yyyy")}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function paymentStatusFromFilters(
  filters: ArFilterState,
): PaymentStatusKey | null {
  if (filters.dispute === "disputed") return "disputed";
  if (filters.status === "Overdue") return "overdue";
  if (filters.status === "Partially Paid") return "partial";
  if (filters.status === "Paid") return "paid";
  if (filters.status === "Sent") return "unpaid";
  return null;
}

export function ArDashboard({
  invoices,
  clients,
  accountManagers,
  showRecordPayment = false,
}: {
  invoices: ArInvoiceRow[];
  clients: { id: string; label: string }[];
  accountManagers: { id: string; label: string }[];
  showRecordPayment?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const searchKey = searchParams.toString();

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchKey)),
    [searchKey],
  );

  const trendGroupParam = new URLSearchParams(searchKey).get(
    "trendGroup",
  ) as ArTrendGroupBy | null;
  const trendGroup: ArTrendGroupBy =
    trendGroupParam && TREND_GROUP_VALUES.includes(trendGroupParam)
      ? trendGroupParam
      : DEFAULT_AR_TREND_GROUP;
  const trendSeries = useMemo(
    () =>
      parseArTrendSeries(new URLSearchParams(searchKey).get("trendSeries")),
    [searchKey],
  );

  function withExtras(params: URLSearchParams) {
    if (trendGroup !== DEFAULT_AR_TREND_GROUP) {
      params.set("trendGroup", trendGroup);
    }
    const series = serializeArTrendSeries(trendSeries);
    if (series) params.set("trendSeries", series);
    return params;
  }

  const setFilters = useCallback(
    (patch: Partial<ArFilterState>) => {
      const next = { ...filters, ...patch };
      const params = withExtras(filtersToParams(next));
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- withExtras closes over current URL extras
    [filters, trendGroup, trendSeries, pathname, router],
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [pathname, router]);

  const setTrendGroup = useCallback(
    (group: ArTrendGroupBy) => {
      const params = filtersToParams(filters);
      if (group !== DEFAULT_AR_TREND_GROUP) params.set("trendGroup", group);
      const series = serializeArTrendSeries(trendSeries);
      if (series) params.set("trendSeries", series);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [filters, trendSeries, pathname, router],
  );

  const setTrendSeries = useCallback(
    (series: ArTrendSeriesSelection) => {
      const params = filtersToParams(filters);
      if (trendGroup !== DEFAULT_AR_TREND_GROUP) {
        params.set("trendGroup", trendGroup);
      }
      const serialized = serializeArTrendSeries(series);
      if (serialized) params.set("trendSeries", serialized);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [filters, trendGroup, pathname, router],
  );

  const model = useMemo(
    () =>
      buildArDashboardModel(invoices, filters, new Date(), {
        trendGroup,
      }),
    [invoices, filters, trendGroup],
  );

  const empty = invoices.length === 0;
  const selectedPaymentStatus = paymentStatusFromFilters(filters);
  const rangeLabel = `${formatRangeLabel(model.range.start, model.range.end)} (${AR_DATE_PRESET_LABELS[filters.preset]})`;

  function selectPaymentStatus(key: PaymentStatusKey) {
    if (key === "disputed") setFilters({ dispute: "disputed", status: "all" });
    else if (key === "overdue")
      setFilters({ status: "Overdue", dispute: "all" });
    else if (key === "partial")
      setFilters({ status: "Partially Paid", dispute: "all" });
    else if (key === "paid") setFilters({ status: "Paid", dispute: "all" });
    else setFilters({ status: "Sent", dispute: "all" });
  }

  function clearPaymentStatus() {
    setFilters({ status: "all", dispute: "all" });
  }

  return (
    <div className={pending ? "opacity-80 transition-opacity" : undefined}>
      <PageHeader
        title="Accounts Receivable"
        subtitle="Collections, aging, and payment recording"
        actions={
          <div className="flex flex-wrap gap-2">
            <ListExportButton
              className="btn btn-outline btn-sm gap-1"
              title="Export AR invoices"
              description="Downloads the invoices matching your current AR filters."
              filenameBase="accounts-receivable"
              matchLabel="invoices"
              headers={[
                "Invoice #",
                "Client",
                "Invoice Date",
                "Due Date",
                "Total",
                "Paid",
                "Remaining",
                "Status",
                "Payment Status",
                "Aging",
                "Days Out",
                "Disputed",
              ]}
              items={model.filtered.map((r) => ({
                "Invoice #": r.invoice_number,
                Client: r.clientName,
                "Invoice Date": r.invoice_date,
                "Due Date": r.due_date,
                Total: Number(r.total_amount).toFixed(2),
                Paid: r.paid.toFixed(2),
                Remaining: r.remaining.toFixed(2),
                Status: r.status,
                "Payment Status":
                  PAYMENT_STATUS_LABELS[r.paymentStatus] ?? r.paymentStatus,
                Aging: r.agingBucket,
                "Days Out": r.daysOut == null ? "—" : String(r.daysOut),
                Disputed: r.disputed ? "Yes" : "No",
              }))}
              filterConfig={{ showDates: false }}
            />
            {showRecordPayment ? (
              <a href="#record-payment" className="btn btn-primary btn-sm">
                Record Payment
              </a>
            ) : null}
          </div>
        }
      />

      <ArFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        clients={clients}
        accountManagers={accountManagers}
        rangeLabel={`${formatRangeLabel(model.range.start, model.range.end)} · ${AR_DATE_PRESET_LABELS[filters.preset]}`}
      />

      <ArSummaryCards
        kpis={empty ? null : model.kpis}
        loading={false}
        empty={empty}
        onSelectOverdue={() =>
          setFilters({ status: "Overdue", aging: null })
        }
        onSelectDisputed={() => setFilters({ dispute: "disputed" })}
        onSelectPartial={() =>
          setFilters({ status: "Partially Paid", dispute: "all" })
        }
        onSelectNinetyPlus={() => setFilters({ aging: "90+" })}
      />

      {!empty ? (
        <ArCharts
          aging={model.aging}
          trend={model.trend}
          topClients={model.topClients}
          paymentStatus={model.paymentStatus}
          risks={model.risks}
          rangeStart={model.range.start}
          rangeEnd={model.range.end}
          presetLabel={AR_DATE_PRESET_LABELS[filters.preset]}
          rangeLabel={rangeLabel}
          trendGroup={trendGroup}
          onTrendGroupChange={setTrendGroup}
          trendSeries={trendSeries}
          onTrendSeriesChange={setTrendSeries}
          selectedPaymentStatus={selectedPaymentStatus}
          onSelectAging={(bucket) => setFilters({ aging: bucket })}
          onSelectClient={(clientId) => setFilters({ clientId })}
          onSelectPaymentStatus={selectPaymentStatus}
          onClearPaymentStatus={clearPaymentStatus}
        />
      ) : null}

      <ArDetailsTable rows={model.filtered} />
    </div>
  );
}
