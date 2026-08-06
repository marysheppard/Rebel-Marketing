import Link from "next/link";
import { money, pct } from "@/lib/format";
import type {
  ApprovalPerf,
  BillingPerf,
  BudgetRow,
  ProfitRow,
} from "@/components/reports/types";

function Kpi({
  label,
  value,
  hint,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "bad" | "warn";
  href?: string;
}) {
  const toneClass =
    tone === "good"
      ? "border-success/35"
      : tone === "bad"
        ? "border-error/35"
        : tone === "warn"
          ? "border-warning/35"
          : "border-base-300";
  const inner = (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-55">
        {label}
      </div>
      <div className="mt-1 truncate text-2xl font-bold tracking-tight text-[#0b1f3a]">
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs opacity-60">{hint}</div> : null}
    </>
  );
  const className = `rounded-box border bg-base-100/90 p-4 shadow-sm ${toneClass} ${
    href ? "transition hover:border-primary/40 hover:bg-base-100" : ""
  }`;
  if (href) {
    return (
      <Link href={href} className={`block ${className}`}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

export function ReportsKpiStrip({
  clientProfit,
  budgetPerf,
  billingPerf,
  approvalPerf,
  unbilledHours,
}: {
  clientProfit: ProfitRow[];
  budgetPerf: BudgetRow[];
  billingPerf: BillingPerf;
  approvalPerf: ApprovalPerf;
  unbilledHours: number;
}) {
  const agencyRevenue = clientProfit.reduce((s, r) => s + r.revenue, 0);
  const agencyCosts = clientProfit.reduce((s, r) => s + r.costs, 0);
  const agencyProfit = agencyRevenue - agencyCosts;
  const agencyMargin =
    agencyRevenue > 0 ? (agencyProfit / agencyRevenue) * 100 : null;
  const profitableClients = clientProfit.filter((r) => r.profit > 0).length;
  const underwater = clientProfit.filter((r) => r.profit < 0).length;
  const over = budgetPerf.filter((r) => r.health === "over").length;
  const near = budgetPerf.filter((r) => r.health === "near").length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <Kpi
        label="Agency margin"
        value={agencyMargin == null ? "—" : pct(agencyMargin)}
        hint={`${money(agencyProfit)} net`}
        tone={
          agencyMargin == null
            ? "neutral"
            : agencyMargin >= 20
              ? "good"
              : agencyMargin >= 0
                ? "warn"
                : "bad"
        }
      />
      <Kpi
        label="Client portfolio"
        value={`${profitableClients}↑ / ${underwater}↓`}
        hint={`${clientProfit.length} with activity`}
        tone={underwater > 0 ? "warn" : "good"}
        href="#client-profit"
      />
      <Kpi
        label="Budget health"
        value={`${over} over`}
        hint={`${near} near limit · ${budgetPerf.length} budgeted`}
        tone={over > 0 ? "bad" : near > 0 ? "warn" : "good"}
        href="#budget"
      />
      <Kpi
        label="Outstanding AR"
        value={money(billingPerf.outstanding)}
        hint={`${money(billingPerf.overdue)} overdue`}
        tone={billingPerf.overdue > 0 ? "bad" : billingPerf.outstanding > 0 ? "warn" : "good"}
        href="/app/ar"
      />
      <Kpi
        label="Unbilled hours"
        value={unbilledHours.toFixed(1)}
        hint="Approved & ready to invoice"
        tone={unbilledHours > 0 ? "warn" : "good"}
        href="/app/billing"
      />
      <Kpi
        label="Approval wait"
        value={
          approvalPerf.avgWaitDays == null
            ? "—"
            : `${approvalPerf.avgWaitDays.toFixed(1)}d`
        }
        hint={`${approvalPerf.pending} pending`}
        tone={
          approvalPerf.pending === 0
            ? "good"
            : (approvalPerf.avgWaitDays ?? 0) > 5
              ? "warn"
              : "neutral"
        }
        href="#approvals"
      />
    </div>
  );
}
