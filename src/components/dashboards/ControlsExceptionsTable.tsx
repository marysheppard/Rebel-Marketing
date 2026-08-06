"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExceptionStatusForm } from "@/components/dashboards/ExceptionStatusForm";
import { SeverityBadge } from "@/components/dashboards/AlertPanel";
import { EmptyState, StatusBadge } from "@/components/ui";
import { SEVERITY_LABELS } from "@/lib/controls";
import type { ControlException } from "@/lib/types";

type SeverityFilter = "" | ControlException["severity"];

const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
  { value: "", label: "All severities" },
  { value: "info", label: SEVERITY_LABELS.info },
  { value: "warning", label: SEVERITY_LABELS.warning },
  { value: "error", label: SEVERITY_LABELS.error },
];

export function ControlsExceptionsTable({
  exceptions,
  reviewers,
}: {
  exceptions: ControlException[];
  reviewers: { id: string; full_name: string }[];
}) {
  const [severity, setSeverity] = useState<SeverityFilter>("");

  const filtered = useMemo(() => {
    if (!severity) return exceptions;
    return exceptions.filter((ex) => ex.severity === severity);
  }, [exceptions, severity]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="form-control w-full max-w-[14rem]">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
            Severity
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
            aria-label="Filter by severity"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <p className="pb-1 text-xs opacity-60">
          Showing {filtered.length} of {exceptions.length}
        </p>
      </div>

      {!filtered.length ? (
        <EmptyState
          title="No matching exceptions"
          description={
            severity
              ? `No ${SEVERITY_LABELS[severity].toLowerCase()} exceptions in this list.`
              : "Control checks did not find open issues."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Type</th>
                <th>Client</th>
                <th>Detected</th>
                <th>Severity</th>
                <th>Description</th>
                <th>Status</th>
                <th>Reviewer</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ex) => (
                <tr key={ex.id}>
                  <td className="font-medium whitespace-nowrap">
                    {ex.exception_type}
                    {ex.href ? (
                      <div>
                        <Link
                          href={ex.href}
                          className="link link-primary text-xs"
                        >
                          Open
                        </Link>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {(ex.clients as { client_name?: string } | null)
                      ?.client_name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    {new Date(ex.detected_at).toLocaleDateString()}
                  </td>
                  <td>
                    <SeverityBadge severity={ex.severity} />
                  </td>
                  <td className="max-w-xs text-sm">{ex.description}</td>
                  <td>
                    <StatusBadge status={ex.status} />
                  </td>
                  <td>
                    {(ex.profiles as { full_name?: string } | null)
                      ?.full_name ?? "—"}
                  </td>
                  <td>
                    <ExceptionStatusForm
                      exceptionId={ex.id}
                      currentStatus={ex.status}
                      reviewers={reviewers}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
