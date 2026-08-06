"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/notifications";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const rows = await listNotifications(15);
    setItems(rows);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await refresh();
  }

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="relative">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        aria-label={
          loaded && unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        onClick={() => void toggle()}
      >
        <Bell className="h-4 w-4" />
        {loaded && unread > 0 ? (
          <span
            className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-base-100"
            aria-hidden
          />
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 ? (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={async () => {
                  await markAllNotificationsRead();
                  await refresh();
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="px-2 py-4 text-sm opacity-60">No notifications yet.</p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href || "/app"}
                    className={`block rounded-lg px-2 py-2 text-sm hover:bg-base-200 ${
                      n.read_at ? "opacity-70" : "bg-base-200/60"
                    }`}
                    onClick={async () => {
                      await markNotificationRead(n.id);
                      setOpen(false);
                    }}
                  >
                    <div className="font-medium">{n.title}</div>
                    {n.body ? (
                      <div className="text-xs opacity-70">{n.body}</div>
                    ) : null}
                    <div className="mt-1 text-[10px] opacity-50">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
