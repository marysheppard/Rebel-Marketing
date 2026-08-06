"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Info,
  OctagonAlert,
} from "lucide-react";
import type { ControlAlert } from "@/lib/controls";
import { SEVERITY_LABELS } from "@/lib/controls";
import { alertCategory } from "@/components/reports/types";
import { CollapsibleSection } from "@/components/reports/CollapsibleSection";

type SeverityFilter = "all" | "error" | "warning" | "info";

export function ControlTower({ alerts }: { alerts: ControlAlert[] }) {
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      error: alerts.filter((a) => a.severity === "error").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
    };
  }, [alerts]);

  const categories = useMemo(() => {
    const set = new Set(alerts.map(alertCategory));
    return ["all", ...Array.from(set).sort()];
  }, [alerts]);

  const grouped = useMemo(() => {
    const list = alerts.filter((a) => {
      if (severity !== "all" && a.severity !== severity) return false;
      if (category !== "all" && alertCategory(a) !== category) return false;
      return true;
    });
    const map = new Map<string, ControlAlert[]>();
    for (const a of list) {
      const key = alertCategory(a);
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [alerts, severity, category]);

  if (!alerts.length) {
    return (
      <section className="rounded-box border border-success/30 bg-success/5 p-5 shadow-sm">
        <h2 className="text-lg font-bold tracking-tight text-[#0b1f3a]">Control tower</h2>
        <p className="mt-1 text-sm opacity-70">
          No active exceptions. Budgets, approvals, and cash controls look clear.
        </p>
      </section>
    );
  }

  return (
    <CollapsibleSection
      title="Control tower"
      subtitle="Exceptions that need a billing or operations decision."
      summary={
        <span className="flex flex-wrap items-center gap-2">
          <span className="badge badge-ghost badge-sm">
            {alerts.length} flag{alerts.length === 1 ? "" : "s"}
          </span>
          {counts.error > 0 ? (
            <span className="badge badge-error badge-sm">{counts.error} critical</span>
          ) : null}
          {counts.warning > 0 ? (
            <span className="badge badge-warning badge-sm">
              {counts.warning} warning
            </span>
          ) : null}
        </span>
      }
      headerClassName="bg-base-200/40"
    >
      <div className="border-b border-base-300 bg-base-200/20 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All", alerts.length],
              ["error", "Critical", counts.error],
              ["warning", "Warning", counts.warning],
              ["info", "Info", counts.info],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSeverity(key)}
              className={`btn btn-xs ${
                severity === key
                  ? key === "error"
                    ? "btn-error"
                    : key === "warning"
                      ? "btn-warning"
                      : key === "info"
                        ? "btn-info"
                        : "btn-primary"
                  : "btn-ghost border border-base-300"
              }`}
            >
              {label}
              <span className="opacity-70">{count}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`badge cursor-pointer ${
                category === c
                  ? "badge-primary"
                  : "badge-ghost border border-base-300"
              }`}
            >
              {c === "all" ? "All types" : c}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-base-300">
        {grouped.map(([group, rows]) => (
          <div key={group} className="px-4 py-3 sm:px-5">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60">
                {group}
              </h3>
              <span className="badge badge-ghost badge-sm">{rows.length}</span>
            </div>
            <ul className="space-y-2">
              {rows.map((a) => (
                <ControlRow
                  key={a.id}
                  alert={a}
                  expanded={expandedId === a.id}
                  onToggle={() =>
                    setExpandedId((prev) => (prev === a.id ? null : a.id))
                  }
                />
              ))}
            </ul>
          </div>
        ))}
        {!grouped.length ? (
          <p className="px-5 py-8 text-center text-sm opacity-60">
            No exceptions match these filters.
          </p>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

function ControlRow({
  alert,
  expanded,
  onToggle,
}: {
  alert: ControlAlert;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon =
    alert.severity === "error"
      ? OctagonAlert
      : alert.severity === "warning"
        ? AlertTriangle
        : Info;
  const rail =
    alert.severity === "error"
      ? "bg-error"
      : alert.severity === "warning"
        ? "bg-warning"
        : "bg-info";
  const iconTone =
    alert.severity === "error"
      ? "text-error"
      : alert.severity === "warning"
        ? "text-warning"
        : "text-info";

  return (
    <li className="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <div className="flex">
        <div className={`w-1 shrink-0 ${rail}`} />
        <div className="min-w-0 flex-1 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconTone}`} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold leading-snug">{alert.title}</p>
                  <span className="badge badge-ghost badge-xs">
                    {SEVERITY_LABELS[alert.severity]}
                  </span>
                  {alert.exceptionType ? (
                    <span className="badge badge-outline badge-xs">
                      {alert.exceptionType}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm opacity-70">{alert.detail}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-xs gap-1"
                onClick={onToggle}
                aria-expanded={expanded}
              >
                Why
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>
              {alert.href ? (
                <Link href={alert.href} className="btn btn-primary btn-xs">
                  Review
                </Link>
              ) : null}
            </div>
          </div>
          {expanded ? (
            <div className="mt-3 rounded-box border border-base-300 bg-base-200/50 px-3 py-2 text-xs leading-relaxed opacity-80">
              <p>
                <span className="font-semibold">Risk: </span>
                {alert.risk}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Control: </span>
                {alert.control}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
