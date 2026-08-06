"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

export type CalendarTaskEvent = {
  id: string;
  title: string;
  date: string;
  overdue?: boolean;
  clientId?: string;
};

export type CalendarCampaignEvent = {
  id: string;
  title: string;
  date: string;
  clientId?: string;
};

export type CalendarPersonalEvent = {
  id: string;
  title: string;
  date: string;
  client_name?: string | null;
};

type FocusedItem = { kind: "task" | "event" | "campaign"; id: string };

function shortLabel(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
  if (!words) return "…";
  if (words.length <= 14) return words;
  return `${words.slice(0, 13)}…`;
}

export function DashboardCalendar({
  tasks,
  campaigns,
  events = [],
  todayStr,
}: {
  tasks: CalendarTaskEvent[];
  campaigns: CalendarCampaignEvent[];
  events?: CalendarPersonalEvent[];
  todayStr: string;
}) {
  const today = parseISO(todayStr);
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(todayStr);
  const [focused, setFocused] = useState<FocusedItem | null>(null);

  useEffect(() => {
    if (!focused) return;
    const el = document.getElementById(
      `dash-cal-item-${focused.kind}-${focused.id}`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focused, selected]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTaskEvent[]>();
    for (const t of tasks) {
      if (!t.date) continue;
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return map;
  }, [tasks]);

  const campsByDate = useMemo(() => {
    const map = new Map<string, CalendarCampaignEvent[]>();
    for (const c of campaigns) {
      if (!c.date) continue;
      const list = map.get(c.date) ?? [];
      list.push(c);
      map.set(c.date, list);
    }
    return map;
  }, [campaigns]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarPersonalEvent[]>();
    for (const ev of events) {
      if (!ev.date) continue;
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const selectedTasks = tasksByDate.get(selected) ?? [];
  const selectedCamps = campsByDate.get(selected) ?? [];
  const selectedEvents = eventsByDate.get(selected) ?? [];

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
    <div className="rounded-box border border-base-300 bg-base-100 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[#0b1f3a]">Calendar</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="min-w-[8rem] text-center text-sm font-medium">
            {format(cursor, "MMMM yyyy")}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
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
            ...dayTasks.map((t) => ({
              key: `task-${t.id}`,
              label: shortLabel(t.title),
              className: t.overdue
                ? "bg-error/20 text-error"
                : "bg-info/20 text-info",
              item: { kind: "task" as const, id: t.id },
            })),
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
              className={[
                "flex min-h-20 flex-col items-stretch rounded-md border p-1 text-xs transition",
                inMonth ? "border-transparent" : "border-transparent opacity-40",
                isSelected ? "border-primary bg-primary/10" : "hover:bg-base-200",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => selectDayOnly(key)}
                aria-label={`Select ${format(day, "MMMM d")}`}
                className={[
                  "inline-flex h-6 w-6 items-center justify-center self-start leading-none hover:underline",
                  isToday
                    ? "rounded-full bg-red-400 font-bold text-black"
                    : "px-0.5 font-medium",
                ].join(" ")}
              >
                {format(day, "d")}
              </button>
              <div className="mt-0.5 flex w-full flex-col gap-0.5">
                {visible.map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    title={pill.label}
                    onClick={() => selectPill(key, pill.item)}
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
                  <button
                    type="button"
                    onClick={() => selectDayOnly(key)}
                    className="rounded px-1 py-0.5 text-left text-[0.6rem] font-medium opacity-60 hover:opacity-100"
                  >
                    +{extra}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-base-300 pt-3">
        <p className="mb-2 text-xs font-medium opacity-70">
          {format(parseISO(selected), "EEE, MMM d")}
        </p>
        {selectedTasks.length === 0 &&
        selectedCamps.length === 0 &&
        selectedEvents.length === 0 ? (
          <p className="text-sm opacity-60">No due work on this day.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {selectedEvents.map((ev) => (
              <li
                key={ev.id}
                id={`dash-cal-item-event-${ev.id}`}
                className={[
                  "rounded-md px-2 py-1 transition",
                  focused?.kind === "event" && focused.id === ev.id
                    ? "bg-primary/10 ring-1 ring-primary/40"
                    : "",
                ].join(" ")}
              >
                <span className="font-medium">{ev.title}</span>
                <span className="ml-2 text-xs text-success">Event</span>
                {ev.client_name ? (
                  <span className="ml-1 text-xs opacity-60">
                    · {ev.client_name}
                  </span>
                ) : null}
              </li>
            ))}
            {selectedTasks.map((t) => (
              <li
                key={t.id}
                id={`dash-cal-item-task-${t.id}`}
                className={[
                  "rounded-md px-2 py-1 transition",
                  focused?.kind === "task" && focused.id === t.id
                    ? "bg-primary/10 ring-1 ring-primary/40"
                    : "",
                ].join(" ")}
              >
                <Link
                  href={`/app/tasks/${t.id}`}
                  className="link link-hover font-medium"
                >
                  {t.title}
                </Link>
                <span
                  className={`ml-2 text-xs ${
                    t.overdue ? "text-error" : "opacity-60"
                  }`}
                >
                  {t.overdue ? "Overdue task" : "Task due"}
                </span>
              </li>
            ))}
            {selectedCamps.map((c) => (
              <li
                key={c.id}
                id={`dash-cal-item-campaign-${c.id}`}
                className={[
                  "rounded-md px-2 py-1 transition",
                  focused?.kind === "campaign" && focused.id === c.id
                    ? "bg-primary/10 ring-1 ring-primary/40"
                    : "",
                ].join(" ")}
              >
                <Link
                  href={`/app/campaigns/${c.id}`}
                  className="link link-hover"
                >
                  {c.title}
                </Link>
                <span className="ml-2 text-xs opacity-60">Campaign ends</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[0.65rem] opacity-50">
          Click a pill for details · Blue = task · Green = event · Purple =
          campaign end · Red = overdue
        </p>
      </div>
    </div>
  );
}
