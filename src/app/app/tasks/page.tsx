import { TasksBoard } from "@/components/TasksBoard";
import {
  getProfile,
  isClientRole,
  isEmployeeWorkRole,
} from "@/lib/page-auth";
import { redirect } from "next/navigation";

export default async function TasksPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;
  if (isClientRole(profile.role) || !isEmployeeWorkRole(profile.role)) {
    redirect("/app");
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekEndDate = new Date(`${todayStr}T12:00:00`);
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  const weekEnd = weekEndDate.toISOString().slice(0, 10);

  const { data: taskRows } = await supabase
    .from("tasks")
    .select(
      "id, title, description, due_date, status, priority, campaign_id, campaigns(campaign_name, clients(client_name))",
    )
    .eq("assignee_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false });

  const items = (taskRows ?? []).map((t) => {
    const campRaw = t.campaigns as unknown;
    const campObj = Array.isArray(campRaw)
      ? (campRaw[0] as Record<string, unknown> | undefined)
      : (campRaw as Record<string, unknown> | null | undefined);
    const clientsRaw = campObj?.clients as unknown;
    const clientObj = Array.isArray(clientsRaw)
      ? (clientsRaw[0] as { client_name?: string } | undefined)
      : (clientsRaw as { client_name?: string } | null | undefined);
    const status = String(t.status);
    const due_date = t.due_date ? String(t.due_date) : null;
    const overdue = Boolean(
      due_date &&
        due_date < todayStr &&
        status !== "Submitted" &&
        status !== "Approved",
    );
    return {
      id: String(t.id),
      title: String(t.title),
      description: String(t.description ?? ""),
      due_date,
      status,
      priority: String(t.priority ?? "Medium"),
      campaign_name: String(campObj?.campaign_name ?? "—"),
      client_name: clientObj?.client_name ?? "—",
      overdue,
    };
  });

  const openCount = items.filter(
    (t) => t.status !== "Submitted" && t.status !== "Approved",
  ).length;
  const overdueCount = items.filter((t) => t.overdue).length;
  const dueThisWeekCount = items.filter(
    (t) =>
      t.due_date &&
      t.due_date >= todayStr &&
      t.due_date <= weekEnd &&
      t.status !== "Submitted" &&
      t.status !== "Approved",
  ).length;
  const submittedCount = items.filter((t) => t.status === "Submitted").length;

  const statusNames = [
    "Not Started",
    "In Progress",
    "Submitted",
    "Needs Revision",
    "Approved",
  ];
  const statusPie: { name: string; value: number }[] = statusNames.map(
    (name) => ({
      name,
      value: items.filter((t) => t.status === name).length,
    }),
  );
  const known = new Set(statusNames);
  const other = items.filter((t) => !known.has(t.status)).length;
  if (other > 0) statusPie.push({ name: "Other", value: other });

  const priorityOrder = ["Urgent", "High", "Medium", "Low"];
  const priorityBars = priorityOrder.map((priority) => ({
    priority,
    count: items.filter((t) => t.priority === priority).length,
  }));

  return (
    <TasksBoard
      items={items}
      todayStr={todayStr}
      statusPie={statusPie}
      priorityBars={priorityBars}
      openCount={openCount}
      overdueCount={overdueCount}
      dueThisWeekCount={dueThisWeekCount}
      submittedCount={submittedCount}
    />
  );
}
