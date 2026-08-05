import Link from "next/link";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import type { ControlAlert } from "@/lib/controls";
import { budgetHealth } from "@/lib/finance";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-box border border-base-300 bg-base-200/40 p-10 text-center">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg opacity-70">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn btn-primary mt-6">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 opacity-70">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
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
      ? "border-success/30"
      : tone === "bad"
        ? "border-error/30"
        : tone === "warn"
          ? "border-warning/30"
          : "border-base-300/80";
  const inner = (
    <>
      <div className="text-xs uppercase leading-snug tracking-wide break-words opacity-60">
        {label}
      </div>
      <div className="mt-1 break-words text-xl font-bold leading-tight sm:text-2xl">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs leading-snug break-words opacity-60">
          {hint}
        </div>
      ) : null}
    </>
  );
  const className = `min-w-0 rounded-box border bg-base-100/80 p-4 ${toneClass} ${
    href
      ? "transition hover:border-primary/40 hover:bg-base-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      : ""
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

export function AlertList({ alerts }: { alerts: ControlAlert[] }) {
  if (!alerts.length) {
    return (
      <EmptyState
        title="No management alerts"
        description="Controls are clear right now. Keep monitoring budgets, approvals, and collections."
      />
    );
  }
  return (
    <div className="space-y-3">
      {alerts.map((a) => {
        const Icon =
          a.severity === "error"
            ? OctagonAlert
            : a.severity === "warning"
              ? AlertTriangle
              : Info;
        const color =
          a.severity === "error"
            ? "alert-error"
            : a.severity === "warning"
              ? "alert-warning"
              : "alert-info";
        return (
          <div key={a.id} className={`alert ${color} shadow-sm`}>
            <Icon className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold">{a.title}</div>
              <div className="text-sm opacity-90">{a.detail}</div>
              <div className="mt-1 text-xs opacity-70">
                <span className="font-medium">Risk:</span> {a.risk}{" "}
                <span className="font-medium">Control:</span> {a.control}
              </div>
            </div>
            {a.href ? (
              <Link href={a.href} className="btn btn-sm">
                Open
              </Link>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function FitBadge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`badge badge-sm inline-flex h-auto max-w-full items-center justify-center whitespace-normal px-2 py-1 text-center leading-snug ${className}`}
    >
      {children}
    </span>
  );
}

export function BudgetHealthBadge({
  budget,
  spent,
  showBar = false,
}: {
  budget: number;
  spent: number;
  showBar?: boolean;
}) {
  const health = budgetHealth(budget, spent);
  const cls =
    health === "over"
      ? "badge-error"
      : health === "near"
        ? "badge-warning"
        : health === "under"
          ? "badge-success"
          : "badge-ghost";
  const label =
    health === "over"
      ? "Over budget"
      : health === "near"
        ? "Near budget"
        : health === "under"
          ? "Under budget"
          : "No budget";
  const pctUsed =
    budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const barColor =
    health === "over"
      ? "bg-error"
      : health === "near"
        ? "bg-warning"
        : health === "under"
          ? "bg-success"
          : "bg-base-300";

  if (!showBar) {
    return <FitBadge className={cls}>{label}</FitBadge>;
  }

  return (
    <div className="flex min-w-28 flex-col gap-1">
      <FitBadge className={cls}>{label}</FitBadge>
      {budget > 0 ? (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-base-300"
          title={`${pctUsed}% of budget used`}
        >
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${Math.min(100, pctUsed)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function StatusBadge({
  status,
  map,
}: {
  status: string;
  map?: Record<string, string>;
}) {
  const defaults: Record<string, string> = {
    Active: "badge-success",
    Paid: "badge-success",
    Approved: "badge-success",
    Completed: "badge-success",
    Done: "badge-success",
    Pending: "badge-warning",
    "Partially Paid": "badge-warning",
    "In Progress": "badge-info",
    "Not Started": "badge-ghost",
    "To Do": "badge-ghost",
    Sent: "badge-info",
    Draft: "badge-ghost",
    Overdue: "badge-error",
    Disputed: "badge-error",
    Late: "badge-error",
    Rejected: "badge-error",
    Blocked: "badge-warning",
    Canceled: "badge-ghost",
    Expired: "badge-ghost",
    "On Hold": "badge-warning",
    "Changes Requested": "badge-warning",
    "Pending Renewal": "badge-warning",
    Finalized: "badge-info",
    "Awaiting Client Signature": "badge-warning",
    "Awaiting Agency Signature": "badge-warning",
    "Fully Executed": "badge-success",
    "Client Declined": "badge-error",
    "Ready for Signature": "badge-info",
    "Client Signed — Awaiting Agency Signature": "badge-warning",
  };
  const cls = map?.[status] ?? defaults[status] ?? "badge-neutral";
  return <FitBadge className={`${cls} badge-nowrap`}>{status}</FitBadge>;
}
