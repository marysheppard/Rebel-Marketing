"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";

const EMPLOYEE_TASK_STATUSES = [
  "Not Started",
  "In Progress",
  "Submitted",
  "Needs Revision",
] as const;

export type EditableCalendarTask = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  campaign_name: string;
  overdue?: boolean;
};

export type EditableCalendarCampaign = {
  id: string;
  title: string;
  date: string;
};

export type EditableCalendarEvent = {
  id: string;
  title: string;
  event_date: string;
  notes: string;
  client_id: string | null;
  client_name: string | null;
};

export type CalendarClientOption = { id: string; label: string };

type FocusedItem = { kind: "task" | "event" | "campaign"; id: string };

function shortLabel(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
  if (!words) return "…";
  if (words.length <= 14) return words;
  return `${words.slice(0, 13)}…`;
}

function TaskEditCard({
  task,
  todayStr,
  focused,
}: {
  task: EditableCalendarTask;
  todayStr: string;
  focused?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const locked = task.status === "Approved";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked) return;
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const status = String(fd.get("status"));
    if (
      status === "Approved" ||
      !(EMPLOYEE_TASK_STATUSES as readonly string[]).includes(status)
    ) {
      setError("That status is not allowed.");
      setLoading(false);
      return;
    }
    const due = String(fd.get("due_date") ?? "").trim();
    const patch: Record<string, string | null> = {
      due_date: due || null,
      priority: String(fd.get("priority")),
      status,
    };
    if (status === "Submitted") {
      patch.submitted_at = new Date().toISOString();
    }
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", task.id);
    setLoading(false);
    if (updateError) {
      setError(updateError.message || "Could not save changes.");
      return;
    }
    router.refresh();
  }

  const overdue =
    task.due_date &&
    task.due_date < todayStr &&
    task.status !== "Submitted" &&
    task.status !== "Approved";

  return (
    <div
      id={`cal-item-task-${task.id}`}
      className={[
        "rounded-box border bg-base-100 p-4 transition",
        focused
          ? "border-primary ring-2 ring-primary/40"
          : "border-base-300",
      ].join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            href={`/app/tasks/${task.id}`}
            className="link link-hover font-medium"
          >
            {task.title}
          </Link>
          <p className="text-xs opacity-60">{task.campaign_name}</p>
          {overdue ? (
            <p className="mt-1 text-xs font-medium text-error">Overdue</p>
          ) : null}
        </div>
        {locked ? (
          <span className="badge badge-success badge-outline">Approved</span>
        ) : null}
      </div>

      {locked ? (
        <p className="text-sm opacity-60">
          Approved tasks can’t be edited here.{" "}
          <Link href={`/app/tasks/${task.id}`} className="link">
            Open detail
          </Link>
        </p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
          {error ? (
            <div className="alert alert-error text-sm sm:col-span-3">{error}</div>
          ) : null}
          <label>
            <span className="text-xs font-medium opacity-70">Due date</span>
            <input
              name="due_date"
              type="date"
              className="input input-bordered input-sm w-full"
              defaultValue={task.due_date ?? ""}
            />
          </label>
          <label>
            <span className="text-xs font-medium opacity-70">Priority</span>
            <select
              name="priority"
              className="select select-bordered select-sm w-full"
              defaultValue={task.priority}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </label>
          <label>
            <span className="text-xs font-medium opacity-70">Status</span>
            <select
              name="status"
              className="select select-bordered select-sm w-full"
              defaultValue={
                (EMPLOYEE_TASK_STATUSES as readonly string[]).includes(
                  task.status,
                )
                  ? task.status
                  : "In Progress"
              }
            >
              {EMPLOYEE_TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-3">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading}
            >
              {loading ? "Saving…" : "Save"}
            </button>
            <Link href={`/app/tasks/${task.id}`} className="btn btn-ghost btn-sm">
              Open detail
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

function EventEditCard({
  event,
  clients,
  focused,
  onClose,
}: {
  event: EditableCalendarEvent;
  clients: CalendarClientOption[];
  focused?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) {
      setError("Title is required.");
      setLoading(false);
      return;
    }
    const clientId = String(fd.get("client_id") ?? "").trim();
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("calendar_events")
      .update({
        title,
        event_date: String(fd.get("event_date")),
        notes: String(fd.get("notes") ?? "").trim(),
        client_id: clientId || null,
      })
      .eq("id", event.id);
    setLoading(false);
    if (updateError) {
      setError(updateError.message || "Could not save event.");
      return;
    }
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("Delete this event?")) return;
    setError(null);
    setDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", event.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message || "Could not delete event.");
      return;
    }
    onClose?.();
    router.refresh();
  }

  return (
    <div
      id={`cal-item-event-${event.id}`}
      className={[
        "rounded-box border bg-base-100 p-4 transition",
        focused
          ? "border-primary ring-2 ring-primary/40"
          : "border-success/30",
      ].join(" ")}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-success">
        Personal event
      </p>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        {error ? (
          <div className="alert alert-error text-sm sm:col-span-2">{error}</div>
        ) : null}
        <label className="sm:col-span-2">
          <span className="text-xs font-medium opacity-70">Title</span>
          <input
            name="title"
            className="input input-bordered input-sm w-full"
            defaultValue={event.title}
            required
          />
        </label>
        <label>
          <span className="text-xs font-medium opacity-70">Date</span>
          <input
            name="event_date"
            type="date"
            className="input input-bordered input-sm w-full"
            defaultValue={event.event_date}
            required
          />
        </label>
        <label>
          <span className="text-xs font-medium opacity-70">Client (optional)</span>
          <select
            name="client_id"
            className="select select-bordered select-sm w-full"
            defaultValue={event.client_id ?? ""}
          >
            <option value="">None</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="text-xs font-medium opacity-70">Notes</span>
          <textarea
            name="notes"
            className="textarea textarea-bordered textarea-sm w-full"
            rows={2}
            defaultValue={event.notes}
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={loading || deleting}
          >
            {loading ? "Saving…" : "Save event"}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-error btn-sm"
            disabled={loading || deleting}
            onClick={onDelete}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddEventForm({
  userId,
  selectedDate,
  clients,
}: {
  userId: string;
  selectedDate: string;
  clients: CalendarClientOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateValue, setDateValue] = useState(selectedDate);

  useEffect(() => {
    setDateValue(selectedDate);
  }, [selectedDate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) {
      setError("Title is required.");
      setLoading(false);
      return;
    }
    const clientId = String(fd.get("client_id") ?? "").trim();
    const supabase = createClient();
    const { error: insertError } = await supabase.from("calendar_events").insert({
      user_id: userId,
      title,
      event_date: String(fd.get("event_date")),
      notes: String(fd.get("notes") ?? "").trim(),
      client_id: clientId || null,
    });
    setLoading(false);
    if (insertError) {
      setError(insertError.message || "Could not create event.");
      return;
    }
    form.reset();
    setDateValue(selectedDate);
    router.refresh();
  }

  return (
    <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-4">
      <h3 className="mb-3 text-sm font-bold">Add event</h3>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        {error ? (
          <div className="alert alert-error text-sm sm:col-span-2">{error}</div>
        ) : null}
        <label className="sm:col-span-2">
          <span className="text-xs font-medium opacity-70">Title *</span>
          <input
            name="title"
            className="input input-bordered input-sm w-full"
            placeholder="Client call, reminder…"
            required
          />
        </label>
        <label>
          <span className="text-xs font-medium opacity-70">Date *</span>
          <input
            name="event_date"
            type="date"
            className="input input-bordered input-sm w-full"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            required
          />
        </label>
        <label>
          <span className="text-xs font-medium opacity-70">Client (optional)</span>
          <select name="client_id" className="select select-bordered select-sm w-full">
            <option value="">None</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="text-xs font-medium opacity-70">Notes</span>
          <textarea
            name="notes"
            className="textarea textarea-bordered textarea-sm w-full"
            rows={2}
            placeholder="Optional details"
          />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>
            {loading ? "Adding…" : "Add event"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function EditableCalendar({
  tasks,
  campaigns,
  events,
  clients,
  userId,
  todayStr,
}: {
  tasks: EditableCalendarTask[];
  campaigns: EditableCalendarCampaign[];
  events: EditableCalendarEvent[];
  clients: CalendarClientOption[];
  userId: string;
  todayStr: string;
}) {
  const today = parseISO(todayStr);
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(todayStr);
  const [focused, setFocused] = useState<FocusedItem | null>(null);

  useEffect(() => {
    if (!focused) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFocused(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focused]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, EditableCalendarTask[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const list = map.get(t.due_date) ?? [];
      list.push(t);
      map.set(t.due_date, list);
    }
    return map;
  }, [tasks]);

  const campsByDate = useMemo(() => {
    const map = new Map<string, EditableCalendarCampaign[]>();
    for (const c of campaigns) {
      if (!c.date) continue;
      const list = map.get(c.date) ?? [];
      list.push(c);
      map.set(c.date, list);
    }
    return map;
  }, [campaigns]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EditableCalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.event_date) ?? [];
      list.push(ev);
      map.set(ev.event_date, list);
    }
    return map;
  }, [events]);

  const undated = tasks.filter((t) => !t.due_date);

  const focusedEvent =
    focused?.kind === "event"
      ? events.find((e) => e.id === focused.id)
      : undefined;
  const focusedTask =
    focused?.kind === "task"
      ? tasks.find((t) => t.id === focused.id)
      : undefined;
  const focusedCamp =
    focused?.kind === "campaign"
      ? campaigns.find((c) => c.id === focused.id)
      : undefined;

  const modalOpen = Boolean(
    focused && (focusedEvent || focusedTask || focusedCamp),
  );

  function closeModal() {
    setFocused(null);
  }

  function selectDayOnly(dateKey: string) {
    setSelected(dateKey);
    setFocused(null);
  }

  function selectPill(dateKey: string, item: FocusedItem) {
    setSelected(dateKey);
    setFocused(item);
  }

  function changeMonth(delta: number) {
    setCursor((d) => addMonths(d, delta));
    setFocused(null);
  }

  return (
    <div className="relative grid gap-6 lg:grid-cols-5">
      <div className="rounded-box border border-base-300 bg-base-100 p-5 lg:col-span-2">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#0b1f3a]">Month</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="min-w-[9rem] text-center text-sm font-medium">
              {format(cursor, "MMMM yyyy")}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-medium uppercase opacity-60">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, cursor);
            const isToday = isSameDay(day, today);
            const isSelected = key === selected;
            const dayTasks = tasksByDate.get(key) ?? [];
            const dayCamps = campsByDate.get(key) ?? [];
            const dayEvents = eventsByDate.get(key) ?? [];

            type DayPill = {
              key: string;
              label: string;
              className: string;
              item: FocusedItem;
            };

            const pills: DayPill[] = [
              ...dayEvents.map((ev) => ({
                key: `event-${ev.id}`,
                label: shortLabel(ev.title),
                className: "bg-success/20 text-success",
                item: { kind: "event" as const, id: ev.id },
              })),
              ...dayTasks.map((t) => {
                const overdue =
                  Boolean(t.due_date) &&
                  (t.due_date as string) < todayStr &&
                  t.status !== "Submitted" &&
                  t.status !== "Approved";
                return {
                  key: `task-${t.id}`,
                  label: shortLabel(t.title),
                  className: overdue
                    ? "bg-error/20 text-error"
                    : "bg-info/20 text-info",
                  item: { kind: "task" as const, id: t.id },
                };
              }),
              ...dayCamps.map((c) => ({
                key: `campaign-${c.id}`,
                label: shortLabel(c.title),
                className: "bg-secondary/20 text-secondary",
                item: { kind: "campaign" as const, id: c.id },
              })),
            ];
            const visible = pills.slice(0, 3);
            const extra = pills.length - visible.length;

            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => selectDayOnly(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectDayOnly(key);
                  }
                }}
                aria-label={`Select ${format(day, "MMMM d")}`}
                aria-pressed={isSelected}
                className={[
                  "flex min-h-24 cursor-pointer flex-col items-stretch rounded-md border-2 p-1 text-xs transition",
                  inMonth ? "" : "opacity-40",
                  isSelected
                    ? "border-primary bg-primary/15 shadow-sm"
                    : "border-transparent hover:bg-base-200",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-6 w-6 items-center justify-center self-start leading-none",
                    isToday
                      ? "rounded-full bg-red-400 font-bold text-black"
                      : isSelected
                        ? "px-0.5 font-bold text-primary"
                        : "px-0.5 font-medium",
                  ].join(" ")}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 flex w-full flex-col gap-0.5">
                  {visible.map((pill) => (
                    <button
                      key={pill.key}
                      type="button"
                      title={pill.label}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectPill(key, pill.item);
                      }}
                      className={[
                        "truncate rounded px-1 py-0.5 text-left text-[0.6rem] font-medium leading-tight",
                        pill.className,
                        focused?.kind === pill.item.kind &&
                        focused?.id === pill.item.id
                          ? "ring-1 ring-primary"
                          : "",
                      ].join(" ")}
                    >
                      {pill.label}
                    </button>
                  ))}
                  {extra > 0 ? (
                    <span className="rounded px-1 py-0.5 text-left text-[0.6rem] font-medium opacity-60">
                      +{extra}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[0.65rem] opacity-50">
          Click a day to select · Click a pill for details · Blue = task · Green
          = event · Purple = campaign end · Red = overdue
        </p>

        {undated.length > 0 ? (
          <div className="mt-4 border-t border-base-300 pt-3">
            <p className="mb-2 text-xs font-medium opacity-70">
              No due date ({undated.length})
            </p>
            <ul className="space-y-1 text-sm">
              {undated.map((t) => (
                <li key={t.id}>
                  <span className="font-medium">{t.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 lg:col-span-3">
        <h2 className="text-lg font-bold text-[#0b1f3a]">
          {format(parseISO(selected), "EEEE, MMM d")}
        </h2>

        <AddEventForm
          userId={userId}
          selectedDate={selected}
          clients={clients}
        />
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close detail"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-box border border-base-300 bg-base-100 p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#0b1f3a]">Details</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close"
                onClick={closeModal}
              >
                ✕
              </button>
            </div>
            {focusedEvent ? (
              <EventEditCard
                event={focusedEvent}
                clients={clients}
                focused
                onClose={closeModal}
              />
            ) : null}
            {focusedTask ? (
              <TaskEditCard task={focusedTask} todayStr={todayStr} focused />
            ) : null}
            {focusedCamp ? (
              <div
                id={`cal-item-campaign-${focusedCamp.id}`}
                className="rounded-box border border-base-300 bg-base-100 p-4"
              >
                <Link
                  href={`/app/campaigns/${focusedCamp.id}`}
                  className="link link-hover font-medium"
                >
                  {focusedCamp.title}
                </Link>
                <p className="mt-1 text-xs opacity-60">
                  Campaign end date (edit on the campaign page)
                </p>
                <Link
                  href={`/app/campaigns/${focusedCamp.id}`}
                  className="btn btn-ghost btn-sm mt-3"
                >
                  Open campaign
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
