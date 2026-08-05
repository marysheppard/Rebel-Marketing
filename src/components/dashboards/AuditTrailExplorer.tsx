"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, StatusBadge } from "@/components/ui";
import {
  AUDIT_CATEGORIES,
  type AuditCategory,
  type AuditEvent,
} from "@/lib/audit-trail";

export function AuditTrailExplorer({
  events,
  clients,
  employees,
}: {
  events: AuditEvent[];
  clients: { id: string; client_name: string }[];
  employees: { id: string; full_name: string }[];
}) {
  const [category, setCategory] = useState<AuditCategory | "all">("all");
  const [clientId, setClientId] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = events;
    if (category !== "all") {
      list = list.filter((e) => e.category === category);
    }
    if (clientId !== "all") {
      list = list.filter((e) => e.clientId === clientId);
    }
    if (employeeId !== "all") {
      list = list.filter((e) => e.actorId === employeeId);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.summary.toLowerCase().includes(q) ||
          (e.detail ?? "").toLowerCase().includes(q) ||
          (e.clientName ?? "").toLowerCase().includes(q) ||
          (e.campaignName ?? "").toLowerCase().includes(q) ||
          (e.actorName ?? "").toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [events, category, clientId, employeeId, query]);

  const categoryCounts = useMemo(() => {
    const map = new Map<AuditCategory | "all", number>();
    map.set("all", events.length);
    for (const c of AUDIT_CATEGORIES) map.set(c, 0);
    for (const e of events) {
      map.set(e.category, (map.get(e.category) ?? 0) + 1);
    }
    return map;
  }, [events]);

  if (!events.length) {
    return (
      <EmptyState
        title="No activity yet"
        description="Employee time, tasks, approvals, costs, invoices, payments, and control exceptions will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${category === "all" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setCategory("all")}
        >
          All
          <span className="badge badge-sm">{categoryCounts.get("all") ?? 0}</span>
        </button>
        {AUDIT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`btn btn-sm ${category === c ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setCategory(c)}
          >
            {c}
            <span className="badge badge-sm">{categoryCounts.get(c) ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 sm:grid-cols-3">
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Employee</span>
          <select
            className="select select-bordered select-sm w-full max-w-full"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="all">All employees</option>
            {employees.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Client</span>
          <select
            className="select select-bordered select-sm w-full max-w-full"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="all">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Search</span>
          <input
            className="input input-bordered input-sm w-full max-w-full"
            placeholder="Employee, action, client…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <p className="text-sm opacity-60">
        Showing {filtered.length} event{filtered.length === 1 ? "" : "s"}
        {employeeId !== "all" ? " for selected employee" : ""}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching events"
          description="Try another employee, category, client, or search term."
        />
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table table-sm">
            <thead className="sticky top-0 z-10 bg-base-100">
              <tr>
                <th>When</th>
                <th>Employee</th>
                <th>Action</th>
                <th>Category</th>
                <th>Client</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="hover">
                  <td className="whitespace-nowrap text-sm opacity-80">
                    {e.occurredAt.slice(0, 10)}
                    {e.occurredAt.length > 10 ? (
                      <div className="text-xs opacity-50">
                        {e.occurredAt.slice(11, 16)}
                      </div>
                    ) : null}
                  </td>
                  <td className="min-w-[8rem] font-medium">
                    {e.actorName ?? (
                      <span className="font-normal opacity-50">System</span>
                    )}
                  </td>
                  <td className="min-w-[16rem]">
                    <div className="font-medium">{e.summary}</div>
                    {e.detail ? (
                      <div className="max-w-md truncate text-xs opacity-60">
                        {e.detail}
                      </div>
                    ) : null}
                    {e.campaignName ? (
                      <div className="text-xs opacity-50">{e.campaignName}</div>
                    ) : null}
                  </td>
                  <td>
                    <StatusBadge status={e.category} />
                  </td>
                  <td>
                    {e.clientId ? (
                      <Link
                        href={`/app/clients/${e.clientId}`}
                        className="link link-hover"
                      >
                        {e.clientName ?? "—"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {e.href ? (
                      <Link href={e.href} className="btn btn-ghost btn-xs">
                        View
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
