"use client";

import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  type CostCategory,
} from "@/lib/costs/categories";
import {
  DATE_PRESET_LABELS,
  type ApprovalFilter,
  type BillingFilter,
  type CostFilterState,
  type DatePreset,
  type PassThroughFilter,
} from "@/lib/costs/filters";

type Option = { id: string; label: string };

const BILLING_OPTIONS: { value: BillingFilter; label: string }[] = [
  { value: "all", label: "All billing statuses" },
  { value: "awaiting_approval", label: "Awaiting approval" },
  { value: "ready_to_bill", label: "Ready to bill" },
  { value: "draft_invoice", label: "Draft invoice (approx.)" },
  { value: "invoiced", label: "Invoiced (approx.)" },
  { value: "paid", label: "Paid (approx.)" },
  { value: "not_billable", label: "Not billable" },
];

export function CostFilterBar({
  filters,
  onChange,
  clients,
  campaigns,
  onClear,
}: {
  filters: CostFilterState;
  onChange: (next: Partial<CostFilterState>) => void;
  clients: Option[];
  campaigns: Option[];
  onClear: () => void;
}) {
  const active: string[] = [];
  if (filters.preset !== "last_24_months" || filters.startDate || filters.endDate) {
    active.push(`Date: ${DATE_PRESET_LABELS[filters.preset]}`);
  }
  if (filters.clientId) {
    active.push(
      `Client: ${clients.find((c) => c.id === filters.clientId)?.label ?? filters.clientId}`,
    );
  }
  if (filters.campaignId) {
    active.push(
      `Campaign: ${campaigns.find((c) => c.id === filters.campaignId)?.label ?? filters.campaignId}`,
    );
  }
  if (filters.category) {
    active.push(`Category: ${COST_CATEGORY_LABELS[filters.category]}`);
  }
  if (filters.approval !== "all") {
    active.push(`Approval: ${filters.approval}`);
  }
  if (filters.passThrough !== "all") {
    active.push(`Pass-through: ${filters.passThrough}`);
  }
  if (filters.billing !== "all") {
    active.push(
      `Billing: ${BILLING_OPTIONS.find((b) => b.value === filters.billing)?.label ?? filters.billing}`,
    );
  }
  if (filters.search.trim()) {
    active.push(`Search: “${filters.search.trim()}”`);
  }

  return (
    <section className="mb-6 rounded-box border border-base-300 bg-base-100 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Filters</h2>
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
              onChange({ preset: e.target.value as DatePreset })
            }
          >
            {(Object.keys(DATE_PRESET_LABELS) as DatePreset[]).map((key) => (
              <option key={key} value={key}>
                {DATE_PRESET_LABELS[key]}
              </option>
            ))}
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
                onChange={(e) => onChange({ startDate: e.target.value || null })}
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
            onChange={(e) => onChange({ clientId: e.target.value || null })}
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
          <span className="mb-1 text-xs font-medium opacity-70">Campaign</span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.campaignId ?? ""}
            onChange={(e) => onChange({ campaignId: e.target.value || null })}
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="mb-1 text-xs font-medium opacity-70">Cost category</span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.category ?? ""}
            onChange={(e) =>
              onChange({
                category: (e.target.value || null) as CostCategory | null,
              })
            }
          >
            <option value="">All categories</option>
            {COST_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {COST_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="mb-1 text-xs font-medium opacity-70">Approval</span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.approval}
            onChange={(e) =>
              onChange({ approval: e.target.value as ApprovalFilter })
            }
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </label>

        <label className="form-control">
          <span className="mb-1 text-xs font-medium opacity-70">Pass-through</span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.passThrough}
            onChange={(e) =>
              onChange({ passThrough: e.target.value as PassThroughFilter })
            }
          >
            <option value="all">All</option>
            <option value="yes">Pass-through</option>
            <option value="no">Agency absorbed</option>
          </select>
        </label>

        <label className="form-control">
          <span className="mb-1 text-xs font-medium opacity-70">Billing status</span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.billing}
            onChange={(e) =>
              onChange({ billing: e.target.value as BillingFilter })
            }
          >
            {BILLING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control sm:col-span-2">
          <span className="mb-1 text-xs font-medium opacity-70">
            Search campaign or description
          </span>
          <input
            type="search"
            className="input input-bordered input-sm w-full"
            placeholder="Search…"
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
        <p className="mt-3 text-xs opacity-60">No extra filters applied (last 24 months).</p>
      )}
    </section>
  );
}
