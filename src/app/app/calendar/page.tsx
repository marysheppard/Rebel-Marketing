import { EditableCalendar } from "@/components/EditableCalendar";
import { PageHeader } from "@/components/ui";
import {
  getProfile,
  isClientRole,
  isEmployeeWorkRole,
} from "@/lib/page-auth";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;

  if (isClientRole(profile.role) || !isEmployeeWorkRole(profile.role)) {
    redirect("/app");
  }
  if (
    profile.role !== "agency_manager" &&
    profile.role !== "account_manager" &&
    profile.role !== "marketing"
  ) {
    redirect("/app");
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const [
    { data: taskRows },
    { data: assignments },
    { data: eventRows },
    { data: ownedClients },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, due_date, priority, status, campaigns(campaign_name)",
      )
      .eq("assignee_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("campaign_assignments")
      .select(
        "campaign_id, campaigns(id, campaign_name, end_date, client_id, clients(client_name))",
      )
      .eq("user_id", userId),
    supabase
      .from("calendar_events")
      .select("id, title, event_date, notes, client_id, clients(client_name)")
      .eq("user_id", userId)
      .order("event_date", { ascending: true }),
    supabase
      .from("clients")
      .select("id, client_name")
      .eq("account_manager_id", userId)
      .order("client_name"),
  ]);

  const tasks = (taskRows ?? []).map((t) => {
    const campRaw = t.campaigns as unknown;
    const camp = Array.isArray(campRaw)
      ? (campRaw[0] as { campaign_name?: string } | undefined)
      : (campRaw as { campaign_name?: string } | null | undefined);
    const due = t.due_date ? String(t.due_date) : null;
    return {
      id: String(t.id),
      title: String(t.title),
      due_date: due,
      priority: String(t.priority ?? "Medium"),
      status: String(t.status),
      campaign_name: camp?.campaign_name ?? "—",
      overdue: Boolean(
        due &&
          due < todayStr &&
          t.status !== "Submitted" &&
          t.status !== "Approved",
      ),
    };
  });

  const campaigns = (assignments ?? [])
    .map((row) => {
      const campRaw = row.campaigns as unknown;
      const camp = Array.isArray(campRaw)
        ? (campRaw[0] as {
            id?: string;
            campaign_name?: string;
            end_date?: string;
            client_id?: string;
            clients?: { client_name?: string } | { client_name?: string }[];
          } | undefined)
        : (campRaw as {
            id?: string;
            campaign_name?: string;
            end_date?: string;
            client_id?: string;
            clients?: { client_name?: string } | { client_name?: string }[];
          } | null | undefined);
      if (!camp?.id || !camp.end_date) return null;
      return {
        id: String(camp.id),
        title: String(camp.campaign_name ?? "Campaign"),
        date: String(camp.end_date),
        client_id: camp.client_id ? String(camp.client_id) : "",
        client_name: (() => {
          const cr = camp.clients as unknown;
          const co = Array.isArray(cr)
            ? (cr[0] as { client_name?: string } | undefined)
            : (cr as { client_name?: string } | null | undefined);
          return co?.client_name ?? "";
        })(),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c != null);

  const clientMap = new Map<string, string>();
  for (const c of ownedClients ?? []) {
    clientMap.set(c.id, c.client_name);
  }
  for (const c of campaigns) {
    if (c.client_id && c.client_name) {
      clientMap.set(c.client_id, c.client_name);
    }
  }

  const clientOptions = [...clientMap.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const events = (eventRows ?? []).map((ev) => {
    const clientsRaw = ev.clients as unknown;
    const clientObj = Array.isArray(clientsRaw)
      ? (clientsRaw[0] as { client_name?: string } | undefined)
      : (clientsRaw as { client_name?: string } | null | undefined);
    return {
      id: String(ev.id),
      title: String(ev.title),
      event_date: String(ev.event_date),
      notes: String(ev.notes ?? ""),
      client_id: ev.client_id ? String(ev.client_id) : null,
      client_name: clientObj?.client_name ?? null,
    };
  });

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Add personal events, reschedule tasks, and update status from your schedule"
      />
      <EditableCalendar
        tasks={tasks}
        campaigns={campaigns.map(({ id, title, date }) => ({ id, title, date }))}
        events={events}
        clients={clientOptions}
        userId={userId}
        todayStr={todayStr}
      />
    </div>
  );
}
