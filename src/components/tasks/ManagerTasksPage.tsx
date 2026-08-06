import { redirect } from "next/navigation";
import { AddTaskForm } from "@/components/tasks/AddTaskForm";
import { ManagerTasksClient } from "@/components/tasks/ManagerTasksClient";
import { ListExportButton } from "@/components/exports/ListExportButton";
import { PageHeader } from "@/components/ui";
import {
  canAssignTasks,
  getProfile,
  isClientRole,
} from "@/lib/page-auth";
import { toDateStr } from "@/lib/time";
import type { Task } from "@/lib/types";

export async function ManagerTasksPage() {
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

  type ExportTask = {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string | null;
    client_name: string;
    campaign_name: string;
    assignee: string;
    estimated_hours: number;
    actual_hours: number;
  };

  const exportTasks: ExportTask[] = tasks.map((t) => {
    const camps = t.campaigns as
      | {
          campaign_name?: string;
          clients?: { client_name?: string } | { client_name?: string }[] | null;
        }
      | {
          campaign_name?: string;
          clients?: { client_name?: string } | { client_name?: string }[] | null;
        }[]
      | null;
    const camp = Array.isArray(camps) ? camps[0] : camps;
    const clientsRel = camp?.clients;
    const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;
    const assignee = t.profiles as
      | { full_name?: string }
      | { full_name?: string }[]
      | null;
    const assigneeObj = Array.isArray(assignee) ? assignee[0] : assignee;
    return {
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      client_name: clientObj?.client_name ?? "—",
      campaign_name: camp?.campaign_name ?? "—",
      assignee: assigneeObj?.full_name ?? "—",
      estimated_hours: Number(t.estimated_hours ?? 0),
      actual_hours: Number(t.actual_hours ?? 0),
    };
  });

  return (
    <div>
      <PageHeader
        title="My Tasks"
        subtitle="Filter, update status, add notes, and mark work complete."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ListExportButton
              title="Export tasks"
              description="Filter by status, priority, and due date, then download CSV or PDF."
              filenameBase="tasks"
              matchLabel="tasks"
              headers={[
                "Title",
                "Client",
                "Campaign",
                "Assignee",
                "Status",
                "Priority",
                "Due Date",
                "Est. Hours",
                "Actual Hours",
                "Description",
              ]}
              items={exportTasks.map((r) => ({
                _status: r.status,
                _type: r.priority,
                _date: r.due_date ?? "",
                Title: r.title,
                Client: r.client_name,
                Campaign: r.campaign_name,
                Assignee: r.assignee,
                Status: r.status,
                Priority: r.priority,
                "Due Date": r.due_date ?? "—",
                "Est. Hours": r.estimated_hours.toFixed(1),
                "Actual Hours": r.actual_hours.toFixed(1),
                Description: r.description || "—",
              }))}
              filterConfig={{
                statusKey: "_status",
                statuses: [...new Set(exportTasks.map((t) => t.status))].sort(),
                typeKey: "_type",
                types: [...new Set(exportTasks.map((t) => t.priority))].sort(),
                typeLabel: "Priority",
                dateKey: "_date",
                showDates: true,
              }}
            />
            {canAssign ? (
              <AddTaskForm
                campaigns={campaignOptions}
                employees={employeeOptions}
                createdBy={userId}
              />
            ) : null}
          </div>
        }
      />
      <ManagerTasksClient tasks={tasks} todayStr={todayStr} canEdit />
    </div>
  );
}
