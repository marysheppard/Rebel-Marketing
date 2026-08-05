import { TimePtoBoard } from "@/components/TimePtoBoard";
import { num } from "@/lib/format";
import {
  canLogWork,
  getProfile,
  isClientRole,
  isMarketingRole,
} from "@/lib/page-auth";
import type { PtoRequest } from "@/lib/types";
import { redirect } from "next/navigation";

function startOfWeekMonday(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy.toISOString().slice(0, 10);
}

export default async function WorkPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;

  if (!isMarketingRole(profile.role) && !isClientRole(profile.role)) {
    redirect("/app");
  }

  const isEmployee = canLogWork(profile.role) && !isClientRole(profile.role);
  const today = new Date();
  const weekStart = startOfWeekMonday(today);
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const [
    { data: work },
    { data: campaigns },
    { data: myTasks },
    { data: assignments },
    { data: workRows },
    { data: ptoRows },
  ] = await Promise.all([
    supabase
      .from("work_entries")
      .select(
        "*, campaigns(campaign_name, client_id), profiles(full_name), tasks(title)",
      )
      .order("work_date", { ascending: false }),
    isEmployee
      ? supabase
          .from("campaigns")
          .select("id, campaign_name, campaign_status, clients(client_name)")
          .in("campaign_status", ["Active", "Late", "On Hold"])
          .order("campaign_name")
      : Promise.resolve({ data: [] as { id: string; campaign_name: string }[] }),
    isEmployee
      ? supabase
          .from("tasks")
          .select("id, title, campaign_id, status")
          .eq("assignee_id", userId)
          .neq("status", "Approved")
          .order("due_date", { ascending: true, nullsFirst: false })
      : Promise.resolve({
          data: [] as { id: string; title: string; campaign_id: string }[],
        }),
    isEmployee
      ? supabase
          .from("campaign_assignments")
          .select("campaign_id")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] as { campaign_id: string }[] }),
    isEmployee
      ? supabase
          .from("work_entries")
          .select("hours, work_date, approval_status")
          .eq("user_id", userId)
          .gte("work_date", monthStart)
      : Promise.resolve({
          data: [] as {
            hours: number;
            work_date: string;
            approval_status: string;
          }[],
        }),
    isEmployee
      ? supabase
          .from("pto_requests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as PtoRequest[] }),
  ]);

  const assignedIds = new Set((assignments ?? []).map((a) => a.campaign_id));
  const list = (work ?? []).filter((w) => {
    if (
      profile.role === "agency_manager" ||
      profile.role === "account_manager"
    ) {
      return true;
    }
    if (profile.role === "marketing") {
      return w.user_id === userId;
    }
    return true;
  });

  const campaignOptions = (campaigns ?? [])
    .filter((c) => {
      if (profile.role === "marketing") {
        return assignedIds.size === 0 || assignedIds.has(c.id);
      }
      return true;
    })
    .map((c) => {
      const clientsRaw = (c as { clients?: unknown }).clients;
      const clientObj = Array.isArray(clientsRaw)
        ? (clientsRaw[0] as { client_name?: string } | undefined)
        : (clientsRaw as { client_name?: string } | null | undefined);
      const clientName = clientObj?.client_name;
      return {
        id: c.id,
        label: clientName
          ? `${c.campaign_name} — ${clientName}`
          : c.campaign_name,
      };
    });

  const taskOptions = (myTasks ?? []).map((t) => ({
    id: t.id,
    label: t.title,
    campaign_id: t.campaign_id,
  }));

  const weekHours = (workRows ?? [])
    .filter((w) => String(w.work_date) >= weekStart)
    .reduce((s, w) => s + num(w.hours), 0);
  const monthHours = (workRows ?? []).reduce((s, w) => s + num(w.hours), 0);
  const pendingApprovalHours = list
    .filter(
      (w) =>
        w.user_id === userId && String(w.approval_status) === "Pending",
    )
    .reduce((s, w) => s + num(w.hours), 0);

  const weekTarget = profile.weekly_hour_target;
  const monthTarget = profile.monthly_hour_target;
  const pto = (ptoRows ?? []) as PtoRequest[];
  const pendingPto = pto.filter((r) => r.status === "Pending").length;

  const entries = list.map((w) => {
    const camps = w.campaigns as
      | { campaign_name?: string }
      | { campaign_name?: string }[]
      | null;
    const campObj = Array.isArray(camps) ? camps[0] : camps;
    const tasksRel = w.tasks as
      | { title?: string }
      | { title?: string }[]
      | null;
    const taskObj = Array.isArray(tasksRel) ? tasksRel[0] : tasksRel;
    const profilesRel = w.profiles as
      | { full_name?: string }
      | { full_name?: string }[]
      | null;
    const profileObj = Array.isArray(profilesRel) ? profilesRel[0] : profilesRel;

    return {
      id: String(w.id),
      work_date: String(w.work_date),
      campaign_id: String(w.campaign_id),
      campaign_name: campObj?.campaign_name ?? "—",
      task_id: w.task_id ? String(w.task_id) : null,
      task_title: taskObj?.title ?? null,
      work_type: String(w.work_type ?? ""),
      description: String(w.description ?? ""),
      hours: num(w.hours),
      billable: Boolean(w.billable),
      retainer_bucket: w.retainer_bucket ? String(w.retainer_bucket) : null,
      out_of_scope: Boolean(w.out_of_scope),
      approval_status: String(w.approval_status ?? "Pending"),
      logged_by: profileObj?.full_name ?? "—",
    };
  });

  const ptoItems = pto.map((r) => ({
    id: String(r.id),
    start_date: String(r.start_date),
    end_date: String(r.end_date),
    hours: num(r.hours),
    status: String(r.status),
    reason: String(r.reason ?? ""),
  }));

  return (
    <TimePtoBoard
      isEmployee={isEmployee}
      userId={userId}
      entries={entries}
      pto={ptoItems}
      campaigns={campaignOptions}
      tasks={taskOptions}
      weekStart={weekStart}
      monthStart={monthStart}
      weekHours={weekHours}
      monthHours={monthHours}
      weekTarget={weekTarget}
      monthTarget={monthTarget}
      pendingApprovalHours={pendingApprovalHours}
      pendingPto={pendingPto}
    />
  );
}
