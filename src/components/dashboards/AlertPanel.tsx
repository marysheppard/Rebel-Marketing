import Link from "next/link";
import { SEVERITY_LABELS, type ControlAlert } from "@/lib/controls";
import { EmptyState, FitBadge } from "@/components/ui";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";

export function SeverityBadge({
  severity,
}: {
  severity: ControlAlert["severity"];
}) {
  const label = SEVERITY_LABELS[severity];
  const cls =
    severity === "error"
      ? "badge-error"
      : severity === "warning"
        ? "badge-warning"
        : "badge-info";
  return <FitBadge className={cls}>{label}</FitBadge>;
}

export function RoleAlertList({
  alerts,
  emptyTitle = "No alerts",
  emptyDescription = "Nothing needs attention right now.",
}: {
  alerts: ControlAlert[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!alerts.length) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
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
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{a.title}</span>
                <SeverityBadge severity={a.severity} />
              </div>
              <div className="text-sm opacity-80">{a.detail}</div>
            </div>
            {a.href ? (
              <Link href={a.href} className="btn btn-sm btn-ghost">
                View
              </Link>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
