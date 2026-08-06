"use client";

import { useMemo, useState } from "react";
import {
  ExportDialogShell,
  ExportTriggerButton,
  useExportDialogState,
} from "@/components/exports/ExportDialogShell";
import {
  downloadEmployeeSummaryExport,
  filterEmployeesForExport,
  type EmployeeExportRow,
} from "@/lib/employees/employee-export";
import { ROLE_LABELS } from "@/lib/types";

export function EmployeeExportButton({
  rows,
  className = "btn btn-primary btn-sm gap-1",
}: {
  rows: EmployeeExportRow[];
  className?: string;
}) {
  const dlg = useExportDialogState();
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");

  const roles = useMemo(() => {
    const set = new Set(rows.map((r) => r.role).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const departments = useMemo(() => {
    const set = new Set(
      rows.map((r) => r.department).filter((d) => d && d.trim()),
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filters = {
    role: role || undefined,
    department: department || undefined,
  };

  const matchCount = useMemo(
    () => filterEmployeesForExport(rows, filters).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, role, department],
  );

  function onExport() {
    dlg.resetFeedback();
    dlg.setBusy(true);
    try {
      const result = downloadEmployeeSummaryExport(rows, filters, dlg.format);
      dlg.setMessage(
        result.count === 0
          ? "No employees matched — empty file downloaded."
          : `Downloaded ${result.filename} (${result.count} employee${result.count === 1 ? "" : "s"}).`,
      );
    } catch (e) {
      dlg.setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      dlg.setBusy(false);
    }
  }

  return (
    <>
      <ExportTriggerButton
        className={className}
        onClick={() => dlg.setOpen(true)}
      />
      <ExportDialogShell
        open={dlg.open}
        onClose={() => dlg.setOpen(false)}
        title="Export employee summary"
        description="Filter by role and department, then download CSV or PDF."
        matchCount={matchCount}
        matchLabel="employees"
        format={dlg.format}
        onFormatChange={(f) => {
          dlg.resetFeedback();
          dlg.setFormat(f);
        }}
        busy={dlg.busy}
        message={dlg.message}
        error={dlg.error}
        onExport={onExport}
      >
        <label className="form-control">
          <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
            Role
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={role}
            onChange={(e) => {
              dlg.resetFeedback();
              setRole(e.target.value);
            }}
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control">
          <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
            Department
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={department}
            onChange={(e) => {
              dlg.resetFeedback();
              setDepartment(e.target.value);
            }}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </ExportDialogShell>
    </>
  );
}
