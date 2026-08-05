"use client";

import {
  AR_AGING_BUCKETS,
  AR_DATE_PRESET_LABELS,
  type ArAgingBucket,
  type ArDatePreset,
  type ArDisputeFilter,
  type ArFilterState,
  type ArInvoiceStatusFilter,
} from "@/lib/ar/filters";

const STATUS_OPTIONS: ArInvoiceStatusFilter[] = [
  "all",
  "Draft",
  "Sent",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Disputed",
  "Canceled",
];

const DISPUTE_LABELS: Record<ArDisputeFilter, string> = {
  all: "All",
  disputed: "Disputed",
  not_disputed: "Not disputed",
};

export function ArFilterBar({
  filters,
  onChange,
  onClear,
  clients,
  accountManagers,
  rangeLabel,
}: {
  filters: ArFilterState;
  onChange: (patch: Partial<ArFilterState>) => void;
  onClear: () => void;
  clients: { id: string; label: string }[];
  accountManagers: { id: string; label: string }[];
  rangeLabel?: string;
}) {
  const active: string[] = [];
  if (filters.preset !== "last_12_months" || filters.startDate || filters.endDate) {
    active.push(`Date: ${AR_DATE_PRESET_LABELS[filters.preset]}`);
  }
  if (filters.clientId) {
    active.push(
      `Client: ${clients.find((c) => c.id === filters.clientId)?.label ?? filters.clientId}`,
    );
  }
  if (filters.status !== "all") {
    active.push(`Status: ${filters.status}`);
  }
  if (filters.aging) {
    active.push(`Aging: ${filters.aging}`);
  }
  if (filters.dispute !== "all") {
    active.push(`Dispute: ${DISPUTE_LABELS[filters.dispute]}`);
  }
  if (filters.accountManagerId) {
    active.push(
      `Manager: ${
        accountManagers.find((m) => m.id === filters.accountManagerId)?.label ??
        filters.accountManagerId
      }`,
    );
  }
  if (filters.search.trim()) {
    active.push(`Search: “${filters.search.trim()}”`);
  }

  return (
    <section className="mb-6 rounded-box border border-base-300 bg-base-100 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Filters</h2>
          {rangeLabel ? (
            <p className="text-xs opacity-60">{rangeLabel}</p>
          ) : null}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          Clear filters
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <label className="form-control">
          <span className="mb-1 text-xs font-medium opacity-70">Date range</span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.preset}
            onChange={(e) =>
              onChange({ preset: e.target.value as ArDatePreset })
            }
            aria-label="Accounts receivable date range"
          >
            {(Object.keys(AR_DATE_PRESET_LABELS) as ArDatePreset[]).map(
              (key) => (
                <option key={key} value={key}>
                  {AR_DATE_PRESET_LABELS[key]}
                </option>
              ),
            )}
          </select>
        </label>

        {filters.preset === "custom" ? (
          <>
            <label className="form-control">
              <span className="mb-1 text-xs font-medium opacity-70">Start</span>
              <input
                type="date"
                className="input input-bordered input-sm w-full"
                value={filters.startDate ?? ""}
                onChange={(e) =>
                  onChange({ startDate: e.target.value || null })
                }
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-xs font-medium opacity-70">End</span>
              <input
                type="date"
                className="input input-bordered input-sm w-full"
                value={filters.endDate ?? ""}
                onChange={(e) => onChange({ endDate: e.target.value || null })}
              />
            </label>
          </>
        ) : null}

        <label className="form-control">
          <span className="mb-1 text-xs font-medium opacity-70">Client</span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.clientId ?? ""}
            onChange={(e) =>
              onChange({ clientId: e.target.value || null })
            }
            aria-label="Filter by client"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="mb-1 text-xs font-medium opacity-70">
            Invoice status
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.status}
            onChange={(e) =>
              onChange({ status: e.target.value as ArInvoiceStatusFilter })
            }
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="mb-1 text-xs font-medium opacity-70">
            Aging bucket
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.aging ?? ""}
            onChange={(e) =>
              onChange({
                aging: (e.target.value || null) as ArAgingBucket | null,
              })
            }
          >
            <option value="">All buckets</option>
            {AR_AGING_BUCKETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="mb-1 text-xs font-medium opacity-70">
            Dispute status
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.dispute}
            onChange={(e) =>
              onChange({ dispute: e.target.value as ArDisputeFilter })
            }
          >
            <option value="all">All</option>
            <option value="disputed">Disputed</option>
            <option value="not_disputed">Not disputed</option>
          </select>
        </label>

        <label className="form-control">
          <span className="mb-1 text-xs font-medium opacity-70">
            Account manager
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.accountManagerId ?? ""}
            onChange={(e) =>
              onChange({ accountManagerId: e.target.value || null })
            }
          >
            <option value="">All managers</option>
            {accountManagers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control sm:col-span-2 xl:col-span-2">
          <span className="mb-1 text-xs font-medium opacity-70">Search</span>
          <input
            type="search"
            className="input input-bordered input-sm w-full"
            placeholder="Invoice #, client, notes…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </label>
      </div>

      {active.length > 0 ? (
        <p className="mt-3 text-xs opacity-70">
          <span className="font-medium">Active:</span> {active.join(" · ")}
        </p>
      ) : (
        <p className="mt-3 text-xs opacity-60">
          No extra filters applied (last 12 months).
        </p>
      )}
    </section>
  );
}
