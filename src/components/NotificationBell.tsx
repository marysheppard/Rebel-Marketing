"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, href, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    setItems((data as NotificationRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .in("id", ids);
    if (error) return;
    setItems((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: now } : n)),
    );
  }

  async function markAllRead() {
    await markRead(items.filter((n) => !n.read_at).map((n) => n.id));
  }

  async function onItemActivate(n: NotificationRow) {
    if (!n.read_at) await markRead([n.id]);
  }

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        className="btn btn-ghost btn-sm btn-square relative"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span
            className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-base-100"
            aria-hidden
          />
        ) : null}
      </button>
      <div
        tabIndex={0}
        className="dropdown-content z-50 mt-2 w-80 rounded-box border border-base-300 bg-base-100 p-0 shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-base-300 px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => void markAllRead()}
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {loading ? (
            <li className="px-3 py-4 text-sm opacity-60">Loading…</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-4 text-sm opacity-60">No notifications.</li>
          ) : (
            items.map((n) => {
              const content = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm ${
                        n.read_at ? "font-medium opacity-70" : "font-semibold"
                      }`}
                    >
                      {n.title}
                    </p>
                    {!n.read_at ? (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    ) : null}
                  </div>
                  {n.body ? (
                    <p className="mt-0.5 line-clamp-2 text-xs opacity-60">
                      {n.body}
                    </p>
                  ) : null}
                </>
              );

              return (
                <li key={n.id} className="border-b border-base-200 last:border-0">
                  {n.href ? (
                    <Link
                      href={n.href}
                      className="block px-3 py-2.5 hover:bg-base-200"
                      onClick={() => void onItemActivate(n)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full px-3 py-2.5 text-left hover:bg-base-200"
                      onClick={() => void onItemActivate(n)}
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
