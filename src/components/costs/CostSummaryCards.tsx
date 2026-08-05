"use client";

import {
  Briefcase,
  DollarSign,
  Megaphone,
  Receipt,
  Users,
} from "lucide-react";
import {
  COST_CATEGORY_COLORS,
  COST_CATEGORY_LABELS,
  type CostCategory,
} from "@/lib/costs/categories";
import { money, pct } from "@/lib/format";
import { percentOfTotal, type CategoryTotals } from "@/lib/costs/calculations";

type Delta = { amount: number; pct: number | null };

export function CostSummaryCards({
  totals,
  total,
  advertisingDelta,
  vendorDelta,
  laborDelta,
  passThroughApproved,
  passThroughNotYetBilled,
  onSelectCategory,
}: {
  totals: CategoryTotals;
  total: number;
  advertisingDelta: Delta;
  vendorDelta: Delta;
  laborDelta: Delta;
  passThroughApproved: number;
  passThroughNotYetBilled: number;
  onSelectCategory: (category: CostCategory | null) => void;
}) {
  const empty = total === 0;

  function deltaText(d: Delta) {
    if (d.pct == null && d.amount !== 0) return "vs prior: Not available";
    if (d.amount === 0) return "vs prior: no change";
    const sign = d.amount > 0 ? "+" : "";
    return `vs prior: ${sign}${money(d.amount)}${d.pct != null ? ` (${sign}${d.pct.toFixed(0)}%)` : ""}`;
  }

  const cards: {
    key: CostCategory | "total";
    label: string;
    value: string;
    hints: string[];
    color?: string;
    icon: React.ReactNode;
    onClick: () => void;
  }[] = [
    {
      key: "total",
      label: "Total Costs",
      value: empty ? "Not available" : money(total),
      hints: [
        empty
          ? "No cost records match the selected filters."
          : "Advertising + Vendor/Freelancer + Labor + Pass-through",
      ],
      icon: <DollarSign className="h-4 w-4 opacity-70" />,
      onClick: () => onSelectCategory(null),
    },
    {
      key: "advertising",
      label: COST_CATEGORY_LABELS.advertising,
      value: money(totals.advertising.amount),
      hints: [
        `${pct(percentOfTotal(totals.advertising.amount, total))} of total`,
        deltaText(advertisingDelta),
        `${totals.advertising.count} record${totals.advertising.count === 1 ? "" : "s"}`,
      ],
      color: COST_CATEGORY_COLORS.advertising,
      icon: <Megaphone className="h-4 w-4 opacity-70" />,
      onClick: () => onSelectCategory("advertising"),
    },
    {
      key: "vendor_freelancer",
      label: COST_CATEGORY_LABELS.vendor_freelancer,
      value: money(totals.vendor_freelancer.amount),
      hints: [
        `${pct(percentOfTotal(totals.vendor_freelancer.amount, total))} of total`,
        deltaText(vendorDelta),
        `${totals.vendor_freelancer.count} expense${totals.vendor_freelancer.count === 1 ? "" : "s"}`,
      ],
      color: COST_CATEGORY_COLORS.vendor_freelancer,
      icon: <Briefcase className="h-4 w-4 opacity-70" />,
      onClick: () => onSelectCategory("vendor_freelancer"),
    },
    {
      key: "employee_labor",
      label: COST_CATEGORY_LABELS.employee_labor,
      value: money(totals.employee_labor.amount),
      hints: [
        `${pct(percentOfTotal(totals.employee_labor.amount, total))} of total`,
        deltaText(laborDelta),
        `${totals.employee_labor.count} labor cost record${totals.employee_labor.count === 1 ? "" : "s"}`,
      ],
      color: COST_CATEGORY_COLORS.employee_labor,
      icon: <Users className="h-4 w-4 opacity-70" />,
      onClick: () => onSelectCategory("employee_labor"),
    },
    {
      key: "pass_through",
      label: COST_CATEGORY_LABELS.pass_through,
      value: money(totals.pass_through.amount),
      hints: [
        `${pct(percentOfTotal(totals.pass_through.amount, total))} of total`,
        `Approved: ${money(passThroughApproved)}`,
        `Not yet billed (approx.): ${money(passThroughNotYetBilled)}`,
      ],
      color: COST_CATEGORY_COLORS.pass_through,
      icon: <Receipt className="h-4 w-4 opacity-70" />,
      onClick: () => onSelectCategory("pass_through"),
    },
  ];

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={card.onClick}
          className="rounded-box border border-base-300 bg-base-100 p-4 text-left shadow-sm transition hover:border-base-content/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-wide opacity-60">
              {card.label}
            </div>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full border border-base-300"
              style={card.color ? { borderColor: card.color } : undefined}
            >
              {card.icon}
            </span>
          </div>
          <div className="mt-1 text-2xl font-bold">{card.value}</div>
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
