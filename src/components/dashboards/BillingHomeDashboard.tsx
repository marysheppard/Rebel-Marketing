"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  InvoiceStatusBar,
} from "@/components/billing/InvoiceStatusBar";
import { BillingStatusBadge } from "@/components/billing/BillingStatusBadge";
import { MonthlySeriesChart } from "@/components/Charts";
import { NamedBarChart } from "@/components/tasks/NamedBarChart";
import { EmptyState, StatCard } from "@/components/ui";
import {
  partitionInvoices,
  type BillingInvoiceRow,
  type UnbilledEntry,
} from "@/lib/billing";
import { money } from "@/lib/format";
import { isRecognizedRevenue } from "@/lib/metrics";
import {
  PERIOD_OPTIONS,
  inPeriod,
  resolvePeriod,
  type PeriodKey,
} from "@/lib/period";
import { usePeriodParam } from "@/lib/use-period-param";

const DASH_PERIODS = PERIOD_OPTIONS.filter((o) => o.value !== "custom");

export type BillingHomeSource = {
  fullName: string;
  invoices: BillingInvoiceRow[];
  unbilled: UnbilledEntry[];
};

export function BillingHomeDashboardClient({
  source,
}: {
  source: BillingHomeSource;
}) {
  const { period, setPeriod } = usePeriodParam("ytd");
  const range = useMemo(() => resolvePeriod(period, "", ""), [period]);

  const periodInvoices = useMemo(
    () =>
      source.invoices.filter((i) =>
        inPeriod(i.invoice_date, range.start, range.end),
      ),
    [source.invoices, range.start, range.end],
  );

  const { drafts, active, history } = useMemo(
    () => partitionInvoices(source.invoices),
    [source.invoices],
  );

  const billedRevenue = periodInvoices
    .filter((i) => isRecognizedRevenue(i.status))
    .reduce((s, i) => s + i.total_amount, 0);

  const openAr = source.invoices
    .filter((i) => i.status !== "Draft" && i.status !== "Canceled")
    .reduce((s, i) => s + i.remaining, 0);

  const overdue = source.invoices.filter(
    (i) =>
      i.remaining > 0.01 &&
      i.status !== "Draft" &&
      i.status !== "Canceled" &&
      i.status !== "Paid" &&
      i.due_date &&
      new Date(i.due_date) < new Date(),
  );

  const unbilledAmount = source.unbilled.reduce(
    (s, e) => s + e.estimated_amount,
    0,
  );

  const billedByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of periodInvoices) {
      if (!isRecognizedRevenue(i.status) || !i.invoice_date) continue;
      const key = i.invoice_date.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + i.total_amount);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));
  }, [periodInvoices]);

  const byClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of periodInvoices) {
      if (!isRecognizedRevenue(i.status)) continue;
      map.set(
        i.client_name,
        (map.get(i.client_name) ?? 0) + i.total_amount,
      );
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [periodInvoices]);

  const attention = [
    source.unbilled.length
      ? {
          label: `${source.unbilled.length} unbilled work entr${source.unbilled.length === 1 ? "y" : "ies"}`,
          href: "/app/billing",
        }
      : null,
    overdue.length
      ? { label: `${overdue.length} overdue invoice(s)`, href: "/app/ar" }
      : null,
  ].filter(Boolean) as { label: string; href: string }[];

  const recentDrafts = drafts.slice(0, 5);
  const recentActive = active.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Billing dashboard
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Invoices, unbilled work, and collections overview · {source.fullName}
          </p>
          <p className="text-xs opacity-50">
            Figures use {range.label}
            {range.start || range.end
              ? ` (${range.start ?? "…"} → ${range.end ?? "…"})`
              : ""}
            . Open AR is current balance.
          </p>
        </div>
        <label className="form-control w-full min-w-0 max-w-xs">
          <span className="label-text text-xs opacity-70">Time period</span>
          <select
            className="select select-bordered select-sm w-full max-w-full"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          >
            {DASH_PERIODS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {attention.length ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-base-300 pb-4 text-sm">
          <span className="font-medium opacity-70">Needs attention</span>
          {attention.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className="link link-hover text-error/90"
            >
              {a.label}
            </Link>
          ))}
        </div>
      ) : (
        <p className="border-b border-base-300 pb-4 text-sm opacity-60">
          Nothing urgent in billing right now.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
          Quick links
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              href: "/app/billing",
              label: "Billing",
              hint: "Create & send invoices",
            },
            {
              href: "/app/ar",
              label: "Accounts Receivable",
              hint: "Collections & payments",
            },
            {
              href: "/app/clients",
              label: "Clients",
              hint: "Client records",
            },
            {
              href: "/app/contracts",
              label: "Contracts",
              hint: "Engagement terms",
            },
          ].map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="rounded-box border border-base-300 bg-base-100 px-4 py-3 transition hover:border-primary/40 hover:bg-base-200/40"
            >
              <div className="font-semibold">{d.label}</div>
              <div className="text-sm opacity-60">{d.hint}</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Open AR"
          value={money(openAr)}
          hint="Unpaid invoice balance"
          tone={overdue.length > 0 ? "warn" : undefined}
          href="/app/ar"
        />
        <StatCard
          label="Billed revenue"
          value={money(billedRevenue)}
          hint={range.label}
          href="/app/billing"
        />
        <StatCard
          label="Draft invoices"
          value={String(drafts.length)}
          tone={drafts.length > 0 ? "warn" : "good"}
          href="/app/billing"
        />
        <StatCard
          label="Unbilled work"
          value={money(unbilledAmount)}
          hint={`${source.unbilled.length} approved entr${source.unbilled.length === 1 ? "y" : "ies"}`}
          tone={source.unbilled.length > 0 ? "warn" : "good"}
          href="/app/billing"
        />
        <StatCard
          label="Active invoices"
          value={String(active.length)}
          hint="Sent / open / disputed"
          href="/app/billing"
        />
        <StatCard
          label="Overdue invoices"
          value={String(overdue.length)}
          tone={overdue.length > 0 ? "bad" : "good"}
          href="/app/ar"
        />
      </div>

      <InvoiceStatusBar invoices={source.invoices} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MonthlySeriesChart
          title="Revenue billed by month"
          data={billedByMonth}
          dataKey="amount"
          color="#22c55e"
        />
        <NamedBarChart
          title="Billing by client"
          data={byClient}
          color="#4ade80"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-lg font-semibold">Draft invoices</h2>
            <Link href="/app/billing" className="link link-primary text-sm">
              Open billing
            </Link>
          </div>
          {!recentDrafts.length ? (
            <EmptyState
              title="No drafts"
              description="Draft invoices will show here before you send them."
            />
          ) : (
            <div className="overflow-x-auto rounded-box border border-base-300">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDrafts.map((r) => (
                    <tr key={r.id} className="hover">
                      <td className="font-mono text-xs">{r.invoice_number}</td>
                      <td>{r.client_name}</td>
                      <td>{r.invoice_date}</td>
                      <td className="text-right">{money(r.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-lg font-semibold">Active invoices</h2>
            <Link href="/app/ar" className="link link-primary text-sm">
              Open AR
            </Link>
          </div>
          {!recentActive.length ? (
            <EmptyState
              title="No active invoices"
              description="Sent and open invoices will appear here."
            />
          ) : (
            <div className="overflow-x-auto rounded-box border border-base-300">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th className="text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActive.map((r) => (
                    <tr key={r.id} className="hover">
                      <td className="font-mono text-xs">{r.invoice_number}</td>
                      <td>{r.client_name}</td>
                      <td>
                        <BillingStatusBadge status={r.status} />
                      </td>
                      <td className="text-right">{money(r.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <p className="text-xs opacity-50">
        {history.filter((h) => h.status === "Paid").length} paid in history |{" "}
        <Link href="/app/billing" className="link link-hover">
          Manage invoices
        </Link>
      </p>
    </div>
  );
}
