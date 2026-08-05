import Link from "next/link";
import { redirect } from "next/navigation";
import { TimeEntryForm } from "@/components/tasks/TimeEntryForm";
import { TimeEntryTable } from "@/components/tasks/TimeEntryTable";
import { WeeklyHoursChart } from "@/components/tasks/WeeklyHoursChart";
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
    campaignRows = (data ?? []) as typeof campaignRows;
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

  return (
    <div>
      <PageHeader
        title="Time Entry"
        subtitle="Log hours with start, end, and break. Totals sync to campaign work entries."
        actions={
          <Link href="/app/work" className="btn btn-ghost btn-sm">
            Campaign work log
          </Link>
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
