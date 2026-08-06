import Link from "next/link";
import { redirect } from "next/navigation";
import { TimeEntryForm } from "@/components/tasks/TimeEntryForm";
import { TimeEntryTable } from "@/components/tasks/TimeEntryTable";
import { WeeklyHoursChart } from "@/components/tasks/WeeklyHoursChart";
import { ListExportButton } from "@/components/exports/ListExportButton";
import { PageHeader } from "@/components/ui";
import { num } from "@/lib/format";
import { getProfile, isClientRole } from "@/lib/page-auth";
import { getManagedClientIds } from "@/lib/portfolio";
import {
  formatHours,
  startOfMonth,
  startOfWeek,
  toDateStr,
} from "@/lib/time";
import type { Task, TimeEntry } from "@/lib/types";

export default async function TimePage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;
  if (isClientRole(profile.role)) redirect("/app");

  const today = new Date();
  const todayStr = toDateStr(today);
  const weekStartStr = toDateStr(startOfWeek(today));
  const monthStartStr = toDateStr(startOfMonth(today));
  const weekEnd = new Date(startOfWeek(today));
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = toDateStr(weekEnd);

  const clientIds = await getManagedClientIds(
    supabase,
    userId,
    profile.role,
  );

  const [{ data: assignedCampaignRows }, { data: entryRows }] =
    await Promise.all([
      supabase
        .from("campaign_assignments")
        .select("campaign_id")
        .eq("user_id", userId),
      supabase
        .from("time_entries")
        .select(
          "*, tasks(id, title, campaign_id, status, campaigns(campaign_name, clients(client_name)))",
        )
        .eq("employee_id", userId)
        .order("work_date", { ascending: false })
        .limit(120),
    ]);

  const assignedIds = [
    ...new Set(
      (assignedCampaignRows ?? [])
        .map((r) => r.campaign_id)
        .filter(Boolean) as string[],
    ),
  ];

  let campaignRows: {
    id: string;
    campaign_name: string;
    client_id: string;
    clients: { client_name: string } | null;
  }[] = [];

  if (clientIds === "all" || clientIds.length > 0 || assignedIds.length > 0) {
    let campaignQuery = supabase
      .from("campaigns")
      .select("id, campaign_name, client_id, clients(client_name)")
      .in("campaign_status", ["Active", "Late", "On Hold"])
      .order("campaign_name");

    if (clientIds === "all") {
      // agency / billing — all active campaigns
    } else if (clientIds.length > 0) {
      campaignQuery = campaignQuery.in("client_id", clientIds);
    } else {
      campaignQuery = campaignQuery.in("id", assignedIds);
    }

    const { data } = await campaignQuery;
    campaignRows = (data ?? []) as unknown as typeof campaignRows;
  }

  const campaigns = campaignRows.map((c) => ({
    id: c.id,
    label: c.campaign_name,
    clientName: c.clients?.client_name ?? undefined,
  }));
  const campaignIdSet = new Set(campaigns.map((c) => c.id));

  const [{ data: myTaskRows }, { data: campaignTaskRows }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, campaigns(campaign_name, client_id, clients(client_name))")
      .eq("assignee_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    campaignIdSet.size
      ? supabase
          .from("tasks")
          .select("*, campaigns(campaign_name, client_id, clients(client_name))")
          .in("campaign_id", [...campaignIdSet])
          .order("due_date", { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] as Task[] }),
  ]);

  const taskById = new Map<string, Task>();
  for (const t of [...(myTaskRows ?? []), ...(campaignTaskRows ?? [])] as Task[]) {
    taskById.set(t.id, t);
  }
  const allTasks = [...taskById.values()];

  const entries = (entryRows ?? []) as TimeEntry[];

  const taskOptions = allTasks.filter(
    (t) =>
      t.status !== "Completed" ||
      (t.completed_at &&
        t.completed_at.slice(0, 10) >=
          toDateStr(new Date(Date.now() - 14 * 86400000))),
  );

  const hoursToday = entries
    .filter((e) => e.work_date === todayStr)
    .reduce((s, e) => s + num(e.total_hours), 0);
  const hoursWeek = entries
    .filter((e) => e.work_date >= weekStartStr && e.work_date <= weekEndStr)
    .reduce((s, e) => s + num(e.total_hours), 0);
  const hoursMonth = entries
    .filter((e) => e.work_date >= monthStartStr)
    .reduce((s, e) => s + num(e.total_hours), 0);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyChart = dayLabels.map((day, i) => {
    const d = new Date(startOfWeek(today));
    d.setDate(d.getDate() + i);
    const key = toDateStr(d);
    const hours = entries
      .filter((e) => e.work_date === key)
      .reduce((s, e) => s + num(e.total_hours), 0);
    return { day, hours: Math.round(hours * 100) / 100 };
  });

  const periodRows = [
    { label: "Today", hours: hoursToday },
    { label: "This week", hours: hoursWeek },
    { label: "This month", hours: hoursMonth },
  ];

  const exportEntries = entries.map((e) => {
    const task = e.tasks as
      | {
          title?: string;
          campaigns?:
            | {
                campaign_name?: string;
                clients?:
                  | { client_name?: string }
                  | { client_name?: string }[]
                  | null;
              }
            | {
                campaign_name?: string;
                clients?:
                  | { client_name?: string }
                  | { client_name?: string }[]
                  | null;
              }[]
            | null;
        }
      | null
      | undefined;
    const camps = task?.campaigns;
    const camp = Array.isArray(camps) ? camps[0] : camps;
    const clientsRel = camp?.clients;
    const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;
    return {
      id: e.id,
      work_date: e.work_date,
      task_title: task?.title ?? "—",
      campaign_name: camp?.campaign_name ?? "—",
      client_name: clientObj?.client_name ?? "—",
      start_time: e.start_time ?? "—",
      end_time: e.end_time ?? "—",
      break_minutes: Number(e.break_minutes ?? 0),
      total_hours: num(e.total_hours),
      description: e.description ?? "",
    };
  });

  return (
    <div>
      <PageHeader
        title="Time Entry"
        subtitle="Log hours with start, end, and break. Totals sync to campaign work entries."
        actions={
          <div className="flex flex-wrap gap-2">
            <ListExportButton
              title="Export time entries"
              description="Filter by date range, then download CSV or PDF."
              filenameBase="time-entries"
              matchLabel="entries"
              headers={[
                "Date",
                "Client",
                "Campaign",
                "Task",
                "Start",
                "End",
                "Break (min)",
                "Hours",
                "Description",
              ]}
              items={exportEntries.map((r) => ({
                _date: r.work_date,
                Date: r.work_date,
                Client: r.client_name,
                Campaign: r.campaign_name,
                Task: r.task_title,
                Start: r.start_time,
                End: r.end_time,
                "Break (min)": String(r.break_minutes),
                Hours: r.total_hours.toFixed(2),
                Description: r.description || "—",
              }))}
              filterConfig={{ dateKey: "_date", showDates: true }}
            />
            <Link href="/app/work" className="btn btn-ghost btn-sm">
              Campaign work log
            </Link>
          </div>
        }
      />

      <section className="mb-8 grid gap-6 xl:grid-cols-2">
        <WeeklyHoursChart data={weeklyChart} title="This week by day" />
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="mb-3 font-semibold">Period totals</h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                {periodRows.map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td className="text-right font-medium">
                      {formatHours(r.hours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mb-10 rounded-box border border-base-300 bg-base-100 p-5">
        <h2 className="mb-4 text-xl font-bold">+ Log Time</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm opacity-60">
            No active campaigns available to log against. Check your client
            portfolio or campaign assignments.
          </p>
        ) : (
          <TimeEntryForm
            employeeId={userId}
            tasks={taskOptions}
            campaigns={campaigns}
          />
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Your entries</h2>
        <TimeEntryTable
          entries={entries}
          tasks={allTasks}
          campaigns={campaigns}
          employeeId={userId}
        />
      </section>
    </div>
  );
}
