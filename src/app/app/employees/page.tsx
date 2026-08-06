import { EmployeeExportButton } from "@/components/employees/EmployeeExportButton";
import { PageHeader, StatusBadge } from "@/components/ui";
import { formatEmail, mailtoHref } from "@/lib/contact-format";
import { num } from "@/lib/format";
import { formatHours } from "@/lib/time";
import { requireRoles } from "@/lib/page-auth";
import { ROLE_LABELS } from "@/lib/types";

export default async function EmployeesPage() {
  const { supabase } = await requireRoles(["agency_manager"]);

  const [{ data: profiles }, { data: work }, { data: timeEntries }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, role, department, internal_cost_rate, created_at",
        )
        .neq("role", "client")
        .order("full_name"),
      supabase.from("work_entries").select("user_id, hours, work_date"),
      supabase.from("time_entries").select("employee_id, total_hours, work_date"),
    ]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  const hoursByUser = new Map<string, number>();
  for (const w of work ?? []) {
    if (w.work_date < cutoff) continue;
    hoursByUser.set(
      w.user_id,
      (hoursByUser.get(w.user_id) ?? 0) + num(w.hours),
    );
  }
  for (const t of timeEntries ?? []) {
    if (t.work_date < cutoff) continue;
    hoursByUser.set(
      t.employee_id,
      (hoursByUser.get(t.employee_id) ?? 0) + num(t.total_hours),
    );
  }

  const rows = (profiles ?? []).map((p) => ({
    id: p.id as string,
    full_name: p.full_name as string,
    email: (p.email as string) ?? "",
    role: p.role as string,
    department: (p.department as string) ?? "",
    internal_cost_rate: num(p.internal_cost_rate ?? 75),
    hours_30d: hoursByUser.get(p.id as string) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle="Staff roster, roles, and recent utilization (last 30 days)"
        actions={<EmployeeExportButton rows={rows} />}
      />

      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Internal rate</th>
              <th>Hours (30d)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="font-medium">{p.full_name}</div>
                  {mailtoHref(p.email) ? (
                    <a
                      href={mailtoHref(p.email)!}
                      className="link link-hover text-xs opacity-60"
                    >
                      {formatEmail(p.email)}
                    </a>
                  ) : (
                    <div className="text-xs opacity-60">
                      {formatEmail(p.email)}
                    </div>
                  )}
                </td>
                <td>
                  <StatusBadge
                    status={
                      ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] ?? p.role
                    }
                  />
                </td>
                <td>{p.department || "—"}</td>
                <td>${p.internal_cost_rate.toFixed(0)}/hr</td>
                <td>{formatHours(p.hours_30d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
