"use client";

import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FileWarning,
  Percent,
  Receipt,
  Scale,
} from "lucide-react";
import type { ArKpis } from "@/lib/ar/calculations";
import { money, pct } from "@/lib/format";

type CardDef = {
  key: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  hints: string[];
  onClick?: () => void;
};

function deltaHintText(
  delta: { amount: number; pct: number | null },
  format: "money" | "pct" | "number" | "days",
): string {
  if (delta.amount === 0) return "vs prior: no change";
  const up = delta.amount > 0;
  const sign = up ? "+" : "−";
  if (format === "money") {
    return `vs prior: ${sign}${money(Math.abs(delta.amount))}${
      delta.pct != null ? ` (${sign}${Math.abs(delta.pct).toFixed(0)}%)` : ""
    }`;
  }
  if (format === "pct") {
    return delta.pct == null
      ? "vs prior: n/a"
      : `vs prior: ${sign}${Math.abs(delta.pct).toFixed(1)} pts`;
  }
  if (format === "days") {
    return `vs prior: ${sign}${Math.abs(delta.amount).toFixed(1)} days`;
  }
  return `vs prior: ${sign}${Math.abs(Math.round(delta.amount))}`;
}

export function ArSummaryCards({
  kpis,
  loading = false,
  empty = false,
  onSelectOverdue,
  onSelectDisputed,
  onSelectPartial,
  onSelectNinetyPlus,
}: {
  kpis: ArKpis | null;
  loading?: boolean;
  empty?: boolean;
  onSelectOverdue?: () => void;
  onSelectDisputed?: () => void;
  onSelectPartial?: () => void;
  onSelectNinetyPlus?: () => void;
}) {
  if (loading) {
    return (
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-28 w-full rounded-box" />
        ))}
      </div>
    );
  }

  if (empty || !kpis) {
    return (
      <div className="mb-6 rounded-box border border-base-300 bg-base-200/40 p-8 text-center">
        <h3 className="font-semibold">No receivable metrics</h3>
        <p className="mt-1 text-sm opacity-70">
          Adjust filters or add invoices to see KPI cards.
        </p>
      </div>
    );
  }

  const cards: CardDef[] = [
    {
      key: "open",
      label: "Open Accounts Receivable",
      value: money(kpis.openAr),
      icon: <CircleDollarSign className="h-4 w-4 opacity-70" />,
      hints: [
        deltaHintText(kpis.openArDelta, "money"),
        "Outstanding balance across open invoices",
      ],
    },
    {
      key: "overdue",
      label: "Overdue Accounts Receivable",
      value: money(kpis.overdueAr),
      icon: <AlertTriangle className="h-4 w-4 opacity-70" />,
      hints: [
        deltaHintText(kpis.overdueArDelta, "money"),
        "Past due and still unpaid",
      ],
      onClick: onSelectOverdue,
    },
    {
      key: "count",
      label: "Open Invoice Count",
      value: String(kpis.openInvoiceCount),
      icon: <Receipt className="h-4 w-4 opacity-70" />,
      hints: [
        deltaHintText(kpis.openCountDelta, "number"),
        "Invoices with remaining balance",
      ],
    },
    {
      key: "collection",
      label: "Collection Rate",
      value: pct(kpis.collectionRate),
      icon: <Percent className="h-4 w-4 opacity-70" />,
      hints: [
        deltaHintText(kpis.collectionRateDelta, "pct"),
        "Collected ÷ billed in range",
      ],
    },
    {
      key: "avgDays",
      label: "Average Days to Pay",
      value:
        kpis.avgDaysToPay == null ? "—" : kpis.avgDaysToPay.toFixed(1),
      icon: <Clock3 className="h-4 w-4 opacity-70" />,
      hints: [
        deltaHintText(kpis.avgDaysToPayDelta, "days"),
        "Invoice date to final payment",
      ],
    },
    {
      key: "disputed",
      label: "Disputed Balance",
      value: money(kpis.disputedBalance),
      icon: <Scale className="h-4 w-4 opacity-70" />,
      hints: [
        deltaHintText(kpis.disputedDelta, "money"),
        "Open invoices marked disputed",
      ],
      onClick: onSelectDisputed,
    },
    {
      key: "partial",
      label: "Partial Payment Balance",
      value: money(kpis.partialPaymentBalance),
      icon: <FileWarning className="h-4 w-4 opacity-70" />,
      hints: [
        deltaHintText(kpis.partialDelta, "money"),
        "Partially paid with remaining balance",
      ],
      onClick: onSelectPartial,
    },
    {
      key: "ninety",
      label: "90+ Day Balance",
      value: money(kpis.ninetyPlusBalance),
      icon: <CalendarClock className="h-4 w-4 opacity-70" />,
      hints: [
        deltaHintText(kpis.ninetyPlusDelta, "money"),
        "Open AR aged 90+ days",
      ],
      onClick: onSelectNinetyPlus,
    },
  ];

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={card.onClick}
          disabled={!card.onClick}
          className={`rounded-box border border-base-300 bg-base-100 p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            card.onClick
              ? "cursor-pointer hover:border-base-content/30"
              : "cursor-default"
          }`}
          aria-label={`${card.label}: ${card.value}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-wide opacity-60">
              {card.label}
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-base-300">
              {card.icon}
            </span>
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{card.value}</div>
          <div className="mt-2 space-y-0.5 text-xs opacity-60">
            {card.hints.map((h) => (
              <div key={h}>{h}</div>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
