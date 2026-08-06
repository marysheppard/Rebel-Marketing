import {
  downloadTableExport,
  type TableExportFormat,
} from "@/lib/exports/table-export";
import { formatEmail } from "@/lib/contact-format";
import { ROLE_LABELS } from "@/lib/types";

export type EmployeeExportRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  internal_cost_rate: number;
  hours_30d: number;
};

export type EmployeeExportFilters = {
  role?: string;
  department?: string;
};

const HEADERS = [
  "Name",
  "Email",
  "Role",
  "Department",
  "Internal Rate",
  "Hours (30d)",
] as const;

export function filterEmployeesForExport(
  rows: EmployeeExportRow[],
  filters: EmployeeExportFilters,
): EmployeeExportRow[] {
  return rows.filter((r) => {
    if (filters.role && r.role !== filters.role) return false;
    if (filters.department && r.department !== filters.department) return false;
    return true;
  });
}

export function downloadEmployeeSummaryExport(
  rows: EmployeeExportRow[],
  filters: EmployeeExportFilters,
  format: TableExportFormat,
) {
  const filtered = filterEmployeesForExport(rows, filters);
  const mapped = filtered.map((r) => ({
    Name: r.full_name,
    Email: formatEmail(r.email),
    Role: ROLE_LABELS[r.role as keyof typeof ROLE_LABELS] ?? r.role,
    Department: r.department || "—",
    "Internal Rate": r.internal_cost_rate.toFixed(2),
    "Hours (30d)": r.hours_30d.toFixed(1),
  }));
  return downloadTableExport(
    "Employee Summary",
    [...HEADERS],
    mapped,
    "employee-summary",
    format,
  );
}
