import { redirect } from "next/navigation";
import { AddTaskForm } from "@/components/tasks/AddTaskForm";
import { TaskStatusChart } from "@/components/tasks/TaskStatusChart";
import { TaskTable } from "@/components/tasks/TaskTable";
import { PageHeader } from "@/components/ui";
import {
  canAssignTasks,
  getProfile,
  isClientRole,
} from "@/lib/page-auth";
import { toDateStr } from "@/lib/time";
import type { Task } from "@/lib/types";

export default async function TasksPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;
  if (isClientRole(profile.role)) redirect("/app");

  const canAssign = canAssignTasks(profile.role);
  const todayStr = toDateStr(new Date());

  const taskQuery = supabase
    .from("tasks")
    .select(
      "*, campaigns(campaign_name, client_id, clients(client_name)), profiles:assignee_id(full_name)",
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  if (!canAssign) {
    taskQuery.eq("assignee_id", userId);
  } else {
    taskQuery.or(`assignee_id.eq.${userId},created_by.eq.${userId}`);
  }

  const [{ data: taskRows }, { data: campaignsData }, { data: staffData }] =
    await Promise.all([
      taskQuery,
      canAssign
        ? supabase
            .from("campaigns")
            .select("id, campaign_name, clients(client_name)")
            .in("campaign_status", ["Active", "Late", "On Hold", "Completed"])
            .order("campaign_name")
            .limit(80)
        : Promise.resolve({
            data: [] as {
              id: string;
              campaign_name: string;
              clients?: unknown;
            }[],
          }),
      canAssign
        ? supabase
            .from("profiles")
            .select("id, full_name, role")
            .neq("role", "client")
            .order("full_name")
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    ]);

  let tasks = (taskRows ?? []) as Task[];

  if (canAssign && profile.role === "agency_manager") {
    const { data: allTasks } = await supabase
      .from("tasks")
      .select(
        "*, campaigns(campaign_name, client_id, clients(client_name)), profiles:assignee_id(full_name)",
      )
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(200);
    tasks = (allTasks ?? []) as Task[];
  }

  const campaignOptions = (campaignsData ?? []).map((c) => {
    const clientsRaw = (c as { clients?: unknown }).clients;
    const clientObj = Array.isArray(clientsRaw)
      ? (clientsRaw[0] as { client_name?: string } | undefined)
      : (clientsRaw as { client_name?: string } | null | undefined);
    return {
      id: c.id,
      label: `${c.campaign_name}${
        clientObj?.client_name ? ` — ${clientObj.client_name}` : ""
      }`,
    };
  });

  const employeeOptions = (staffData ?? []).map((e) => ({
    id: e.id,
    label: e.full_name,
  }));

  const openTasks = tasks.filter((t) => t.status !== "Completed");
  const overdue = openTasks.filter(
    (t) => t.due_date && t.due_date < todayStr,
  ).length;
  const overdueIds = new Set(
    openTasks
      .filter((t) => t.due_date && t.due_date < todayStr)
      .map((t) => t.id),
  );
  const taskMix = [
    {
      name: "Not Started",
      value: openTasks.filter(
        (t) => t.status === "Not Started" && !overdueIds.has(t.id),
      ).length,
    },
    {
      name: "In Progress",
      value: openTasks.filter(
        (t) => t.status === "In Progress" && !overdueIds.has(t.id),
      ).length,
    },
    {
      name: "Completed",
      value: tasks.filter((t) => t.status === "Completed").length,
    },
    { name: "Overdue", value: overdue },
  ];

  return (
    <div>
      <PageHeader
        title="My Tasks"
        subtitle="Filter, update status, add notes, and mark work complete."
        actions={
          canAssign ? (
            <AddTaskForm
              campaigns={campaignOptions}
              employees={employeeOptions}
              createdBy={userId}
            />
          ) : undefined
        }
      />
      <div className="mb-8 max-w-xl">
        <TaskStatusChart data={taskMix} title="Task mix" />
      </div>
      <TaskTable tasks={tasks} todayStr={todayStr} canEdit />
    </div>
  );
}
