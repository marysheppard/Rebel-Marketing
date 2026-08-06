"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ClicksByCampaignChart,
  CtrByCampaignChart,
  ImpressionsClicksTrendChart,
  TaskPriorityBarChart,
} from "@/components/Charts";
import { ClientMapDynamic } from "@/components/ClientMapDynamic";
import type {
  CalendarCampaignEvent,
  CalendarPersonalEvent,
  CalendarTaskEvent,
} from "@/components/DashboardCalendar";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { TaskStatusChart } from "@/components/tasks/TaskStatusChart";
import { WeeklyHoursChart } from "@/components/tasks/WeeklyHoursChart";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { WelcomeMessage } from "@/components/WelcomeMessage";
import {
  DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT,
  EMPLOYEE_DASHBOARD_SECTIONS,
  readLayoutPrefs,
  visibleOrderedSections,
  writeLayoutPrefs,
  type EmployeeDashboardLayoutPrefs,
  type EmployeeDashboardSectionId,
} from "@/lib/employee-dashboard-layout";

export type EmployeeDashboardTaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  client_id?: string | null;
};

export type EmployeeDashboardMapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  openCount?: number;
  overdueCount?: number;
  activeCampaignCount?: number;
  nextDueDate?: string;
  campaignNames?: string[];
  health?: "risk" | "attention" | "ok";
};

export type EmployeeDashboardMapClient = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  hasCoords: boolean;
  openCount: number;
  overdueCount: number;
  health: "risk" | "attention" | "ok";
};

type EmployeeDashboardBodyProps = {
  userId: string;
  fullName: string;
  todayStr: string;
  overdueCount: number;
  awaitingApprovalCount: number;
  clientCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  tasks: EmployeeDashboardTaskRow[];
  mapMarkers: EmployeeDashboardMapMarker[];
  mapClients: EmployeeDashboardMapClient[];
  missingMapCount: number;
  clicksByCampaign: { name: string; clicks: number; clientId?: string }[];
  calendarTasks: CalendarTaskEvent[];
  calendarCampaigns: CalendarCampaignEvent[];
  calendarEvents: CalendarPersonalEvent[];
  taskMix: { name: string; value: number }[];
  taskPriority: { priority: string; count: number }[];
  weeklyHours: { day: string; hours: number }[];
  metricsTrend: { date: string; impressions: number; clicks: number }[];
  ctrByCampaign: { name: string; ctr: number; clientId?: string }[];
};

/**
 * Employee home body: fixed header/stats + customizable section order/visibility.
 * Prefs persist in localStorage per user.
 */
export function EmployeeDashboardBody(props: EmployeeDashboardBodyProps) {
  const [prefs, setPrefs] = useState<EmployeeDashboardLayoutPrefs>(
    DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT,
  );
  const [ready, setReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(readLayoutPrefs(props.userId));
    setReady(true);
  }, [props.userId]);

  function updatePrefs(next: EmployeeDashboardLayoutPrefs) {
    const normalized = {
      ...next,
      order: next.order,
      hidden: next.hidden,
    };
    setPrefs(normalized);
    writeLayoutPrefs(props.userId, normalized);
  }

  const visible = useMemo(
    () => (ready ? visibleOrderedSections(prefs) : visibleOrderedSections(DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT)),
    [prefs, ready],
  );

  const selectedClientName = useMemo(() => {
    if (!selectedClientId) return null;
    return (
      props.mapClients.find((c) => c.id === selectedClientId)?.name ??
      props.mapMarkers.find((c) => c.id === selectedClientId)?.name ??
      null
    );
  }, [selectedClientId, props.mapClients, props.mapMarkers]);

  const filteredTasks = useMemo(() => {
    if (!selectedClientId) return props.tasks;
    return props.tasks.filter((t) => t.client_id === selectedClientId);
  }, [props.tasks, selectedClientId]);

  const filteredCalendarTasks = useMemo(() => {
    if (!selectedClientId) return props.calendarTasks;
    return props.calendarTasks.filter((t) => t.clientId === selectedClientId);
  }, [props.calendarTasks, selectedClientId]);

  const filteredCalendarCampaigns = useMemo(() => {
    if (!selectedClientId) return props.calendarCampaigns;
    return props.calendarCampaigns.filter(
      (c) => c.clientId === selectedClientId,
    );
  }, [props.calendarCampaigns, selectedClientId]);

  const filteredClicks = useMemo(() => {
    if (!selectedClientId) return props.clicksByCampaign;
    return props.clicksByCampaign.filter(
      (r) => r.clientId === selectedClientId,
    );
  }, [props.clicksByCampaign, selectedClientId]);

  function toggleHidden(id: EmployeeDashboardSectionId) {
    const hidden = prefs.hidden.includes(id)
      ? prefs.hidden.filter((h) => h !== id)
      : [...prefs.hidden, id];
    updatePrefs({ ...prefs, hidden });
  }

  function move(id: EmployeeDashboardSectionId, dir: -1 | 1) {
    const idx = prefs.order.indexOf(id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= prefs.order.length) return;
    const order = [...prefs.order];
    [order[idx], order[swap]] = [order[swap]!, order[idx]!];
    updatePrefs({ ...prefs, order });
  }

  function restoreDefaults() {
    updatePrefs({
      order: [...DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT.order],
      hidden: [],
    });
  }

  /** Pair adjacent tasks+map into the original 2-column row when both visible. */
  const blocks = useMemo(() => {
    const out: (
      | { type: "pair"; left: "tasks" | "map"; right: "tasks" | "map" }
      | { type: "single"; id: EmployeeDashboardSectionId }
    )[] = [];
    let i = 0;
    while (i < visible.length) {
      const a = visible[i]!;
      const b = visible[i + 1];
      if (
        (a === "tasks" && b === "map") ||
        (a === "map" && b === "tasks")
      ) {
        out.push({ type: "pair", left: a, right: b });
        i += 2;
      } else {
        out.push({ type: "single", id: a });
        i += 1;
      }
    }
    return out;
  }, [visible]);

  const sectionProps: SectionCardProps = {
    ...props,
    selectedClientId,
    onSelectClient: setSelectedClientId,
    filteredTasks,
    filteredCalendarTasks,
    filteredCalendarCampaigns,
    filteredClicks,
  };

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${props.fullName}`}
        subtitle={<WelcomeMessage />}
        actions={
          <button
            type="button"
            className="btn btn-outline btn-sm gap-2"
            onClick={() => setPanelOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Customize layout
          </button>
        }
      />

      {(props.overdueCount > 0 || props.awaitingApprovalCount > 0) ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-base-300 pb-4 text-sm">
          <span className="font-medium opacity-70">Needs attention</span>
          {props.overdueCount > 0 ? (
            <Link
              href="/app/tasks"
              className="link link-hover text-error/90"
            >
              {props.overdueCount} overdue task
              {props.overdueCount === 1 ? "" : "s"}
            </Link>
          ) : null}
          {props.awaitingApprovalCount > 0 ? (
            <Link
              href="/app/tasks"
              className="link link-hover text-error/90"
            >
              {props.awaitingApprovalCount} awaiting approval
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="mb-4 border-b border-base-300 pb-4 text-sm opacity-60">
          Nothing urgent right now.
        </p>
      )}

      {selectedClientId && selectedClientName ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="badge badge-primary badge-outline gap-1">
            Showing: {selectedClientName}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setSelectedClientId(null)}
          >
            Clear filter
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Clients you're on"
          value={String(props.clientCount)}
        />
        <StatCard
          label="Open tasks"
          value={String(props.openTaskCount)}
          tone={props.overdueTaskCount ? "warn" : undefined}
        />
        <StatCard
          label="Overdue tasks"
          value={String(props.overdueTaskCount)}
          tone={props.overdueTaskCount ? "warn" : undefined}
        />
      </div>

      {blocks.length === 0 ? (
        <div className="mt-8 rounded-box border border-dashed border-base-300 bg-base-200/40 p-10 text-center">
          <p className="font-semibold">All sections are hidden</p>
          <p className="mt-1 text-sm opacity-60">
            Use Customize layout to show tasks, map, performance, schedule, or
            charts.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm mt-4"
            onClick={() => setPanelOpen(true)}
          >
            Customize layout
          </button>
        </div>
      ) : (
        blocks.map((block, idx) => {
          if (block.type === "pair") {
            return (
              <section
                key={`pair-${block.left}-${block.right}-${idx}`}
                className="mt-8 grid gap-4 lg:grid-cols-2"
              >
                <SectionCard id={block.left} props={sectionProps} />
                <SectionCard id={block.right} props={sectionProps} />
              </section>
            );
          }
          return (
            <section key={`${block.id}-${idx}`} className="mt-8">
              <SectionCard id={block.id} props={sectionProps} />
            </section>
          );
        })
      )}

      {panelOpen ? (
        <CustomizePanel
          prefs={prefs}
          onClose={() => setPanelOpen(false)}
          onToggle={toggleHidden}
          onMove={move}
          onRestore={restoreDefaults}
        />
      ) : null}
    </div>
  );
}

type SectionCardProps = EmployeeDashboardBodyProps & {
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  filteredTasks: EmployeeDashboardTaskRow[];
  filteredCalendarTasks: CalendarTaskEvent[];
  filteredCalendarCampaigns: CalendarCampaignEvent[];
  filteredClicks: { name: string; clicks: number; clientId?: string }[];
};

function SectionCard({
  id,
  props,
}: {
  id: EmployeeDashboardSectionId;
  props: SectionCardProps;
}) {
  switch (id) {
    case "tasks":
      return (
        <TasksSection tasks={props.filteredTasks} todayStr={props.todayStr} />
      );
    case "map":
      return (
        <ClientMapDynamic
          markers={props.mapMarkers}
          clients={props.mapClients}
          missingCount={props.missingMapCount}
          selectedClientId={props.selectedClientId}
          onSelectClient={props.onSelectClient}
        />
      );
    case "performance":
      return (
        <PerformanceSection clicksByCampaign={props.filteredClicks} />
      );
    case "schedule":
      return (
        <ScheduleSection
          tasks={props.filteredCalendarTasks}
          campaigns={props.filteredCalendarCampaigns}
          events={props.calendarEvents}
          todayStr={props.todayStr}
        />
      );
    case "task_mix":
      return (
        <ChartSection
          title="Task mix"
          href="/app/tasks"
          linkLabel="View tasks"
        >
          <TaskStatusChart data={props.taskMix} />
        </ChartSection>
      );
    case "task_priority":
      return (
        <ChartSection
          title="Tasks by priority"
          href="/app/tasks"
          linkLabel="View tasks"
        >
          <TaskPriorityBarChart data={props.taskPriority} />
        </ChartSection>
      );
    case "hours":
      return (
        <ChartSection
          title="Hours this week"
          href="/app/time"
          linkLabel="Time entry"
        >
          <WeeklyHoursChart data={props.weeklyHours} />
        </ChartSection>
      );
    case "metrics_trend":
      return (
        <ChartSection
          title="Impressions & clicks trend"
          href="/app/analytics"
          linkLabel="Analytics"
        >
          {props.metricsTrend.length === 0 ? (
            <EmptyState
              title="No metrics yet"
              description="Impressions and clicks for your assigned campaigns will appear here."
            />
          ) : (
            <ImpressionsClicksTrendChart data={props.metricsTrend} />
          )}
        </ChartSection>
      );
    case "ctr":
      return (
        <ChartSection
          title="CTR by campaign"
          href="/app/analytics"
          linkLabel="Analytics"
        >
          {props.ctrByCampaign.length === 0 ? (
            <EmptyState
              title="No CTR data yet"
              description="Click-through rates for your assigned campaigns will appear here."
            />
          ) : (
            <CtrByCampaignChart data={props.ctrByCampaign} />
          )}
        </ChartSection>
      );
    default:
      return null;
  }
}

function ChartSection({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-[#0b1f3a]">{title}</h2>
        <Link href={href} className="link link-hover text-sm">
          {linkLabel}
        </Link>
      </div>
      {children}
    </div>
  );
}

function TasksSection({
  tasks,
  todayStr,
}: {
  tasks: EmployeeDashboardTaskRow[];
  todayStr: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-[#0b1f3a]">Pressing tasks</h2>
        <Link href="/app/tasks" className="link link-hover text-sm">
          View all
        </Link>
      </div>
      {tasks.length === 0 ? (
        <EmptyState
          title="No open tasks"
          description="Your highest-priority work will show up here."
        />
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Task</th>
                <th>Due</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 3).map((t) => {
                const overdue =
                  t.due_date &&
                  t.due_date < todayStr &&
                  t.status !== "Submitted";
                return (
                  <tr key={t.id}>
                    <td>
                      <Link
                        href={`/app/tasks/${t.id}`}
                        className="link link-hover font-medium"
                      >
                        {t.title}
                      </Link>
                    </td>
                    <td
                      className={
                        overdue
                          ? "font-medium text-error"
                          : "whitespace-nowrap"
                      }
                    >
                      {t.due_date ?? "—"}
                    </td>
                    <td>
                      <StatusBadge status={t.priority} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PerformanceSection({
  clicksByCampaign,
}: {
  clicksByCampaign: { name: string; clicks: number; clientId?: string }[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-[#0b1f3a]">
          Campaign performance
        </h2>
        <Link href="/app/analytics" className="link link-hover text-sm">
          View client analytics
        </Link>
      </div>
      {clicksByCampaign.length === 0 ? (
        <EmptyState
          title="No performance data yet"
          description="Clicks for your assigned campaigns will appear here."
        />
      ) : (
        <ClicksByCampaignChart data={clicksByCampaign} />
      )}
    </div>
  );
}

function ScheduleSection({
  tasks,
  campaigns,
  events,
  todayStr,
}: {
  tasks: CalendarTaskEvent[];
  campaigns: CalendarCampaignEvent[];
  events: CalendarPersonalEvent[];
  todayStr: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-[#0b1f3a]">Schedule</h2>
        <Link href="/app/calendar" className="link link-hover text-sm">
          Open calendar
        </Link>
      </div>
      <DashboardCalendar
        tasks={tasks}
        campaigns={campaigns}
        events={events}
        todayStr={todayStr}
      />
    </div>
  );
}

function CustomizePanel({
  prefs,
  onClose,
  onToggle,
  onMove,
  onRestore,
}: {
  prefs: EmployeeDashboardLayoutPrefs;
  onClose: () => void;
  onToggle: (id: EmployeeDashboardSectionId) => void;
  onMove: (id: EmployeeDashboardSectionId, dir: -1 | 1) => void;
  onRestore: () => void;
}) {
  return (
    <>
      {/* Above Leaflet panes/controls (z-index ~400–1000) */}
      <button
        type="button"
        className="fixed inset-0 z-[1100] bg-black/30"
        aria-label="Close customize panel"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[1200] flex w-full max-w-sm flex-col border-l border-base-300 bg-base-100 shadow-2xl"
        role="dialog"
        aria-label="Customize dashboard layout"
      >
        <header className="flex items-start justify-between gap-3 border-b border-base-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Customize layout
            </h2>
            <p className="mt-0.5 text-sm opacity-60">
              Show, hide, or reorder dashboard sections. Changes save
              automatically.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <ul className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {prefs.order.map((id, index) => {
            const meta = EMPLOYEE_DASHBOARD_SECTIONS.find((s) => s.id === id)!;
            const hidden = prefs.hidden.includes(id);
            return (
              <li
                key={id}
                className={`rounded-xl border border-base-200 p-3 ${
                  hidden ? "opacity-55" : "bg-base-100"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{meta.label}</p>
                    <p className="text-xs opacity-55">{meta.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square"
                      aria-label={`Move ${meta.label} up`}
                      disabled={index === 0}
                      onClick={() => onMove(id, -1)}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square"
                      aria-label={`Move ${meta.label} down`}
                      disabled={index === prefs.order.length - 1}
                      onClick={() => onMove(id, 1)}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs mt-2 gap-1"
                  onClick={() => onToggle(id)}
                >
                  {hidden ? (
                    <>
                      <Eye className="h-3.5 w-3.5" /> Show
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Hide
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <footer className="border-t border-base-200 px-5 py-4">
          <button
            type="button"
            className="btn btn-ghost btn-sm w-full gap-2"
            onClick={onRestore}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore defaults
          </button>
        </footer>
      </aside>
    </>
  );
}
