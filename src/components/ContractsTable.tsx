"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { contractLength, formatDate, money } from "@/lib/format";

export type ContractsTableRow = {
  id: string;
  contract_name: string;
  contract_number: string;
  client_id: string;
  client_name: string;
  contract_status: string;
  billing_method: string;
  monthly_retainer: number;
  project_fee: number;
  campaign_budget: number;
  start_date: string;
  end_date: string;
};

export function ContractsTable({ rows }: { rows: ContractsTableRow[] }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  const statuses = useMemo(() => {
    const set = new Set(rows.map((r) => r.contract_status).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.client_id) map.set(r.client_id, r.client_name || "—");
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && r.contract_status !== statusFilter) return false;
      if (clientFilter && r.client_id !== clientFilter) return false;
      return true;
    });
  }, [rows, statusFilter, clientFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="form-control w-full max-w-[12rem]">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
            Status
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control w-full max-w-[14rem]">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
            Client
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            aria-label="Filter by client"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {(statusFilter || clientFilter) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setStatusFilter("");
              setClientFilter("");
            }}
          >
            Clear filters
          </button>
        )}

        <p className="ml-auto text-xs opacity-60">
          {filtered.length} of {rows.length} contract{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-box border border-base-300 bg-base-100 px-4 py-10 text-center text-sm opacity-70">
          No contracts match the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm sm:table-md">
            <thead>
              <tr className="text-xs uppercase tracking-wide">
                <th>Contract</th>
                <th>Client</th>
                <th>Status</th>
                <th>Billing</th>
                <th className="text-right">Retainer</th>
                <th className="text-right">Project fee</th>
                <th className="text-right">Budget</th>
                <th>Contract length</th>
                <th>Start date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="hover">
                  <td>
                    <Link
                      href={`/app/contracts/${c.id}`}
                      className="link link-hover font-medium"
                    >
                      {c.contract_name}
                    </Link>
                    <div className="text-xs opacity-60">{c.contract_number}</div>
                  </td>
                  <td>
                    <Link
                      href={`/app/clients/${c.client_id}`}
                      className="link link-hover"
                    >
                      {c.client_name || "—"}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={c.contract_status} />
                  </td>
                  <td className="whitespace-nowrap">{c.billing_method}</td>
                  <td className="text-right whitespace-nowrap">
                    {money(c.monthly_retainer)}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {money(c.project_fee)}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {money(c.campaign_budget)}
                  </td>
                  <td className="whitespace-nowrap">
                    {contractLength(c.start_date, c.end_date)}
                  </td>
                  <td className="text-sm whitespace-nowrap opacity-80">
                    {formatDate(c.start_date)}
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
