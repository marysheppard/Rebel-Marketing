"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EmptyState, StatusBadge } from "@/components/ui";
import {
  approxBillingStatus,
  clientNameFromCost,
  type CostRow,
  type InvoicePassThroughRow,
} from "@/lib/costs/calculations";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  categoryLabel,
  normalizeCostCategory,
  type CostCategory,
} from "@/lib/costs/categories";
import { budgetVariance } from "@/lib/finance";
import { money, num } from "@/lib/format";

const PAGE_SIZE = 15;

type SortKey =
  | "cost_date"
  | "amount"
  | "campaign"
  | "category"
  | "client";

type ApprovalValue = "approved" | "pending";
type PassThroughValue = "yes" | "no";
type BillingValue =
  | "awaiting_approval"
  | "ready_to_bill"
  | "draft_invoice"
  | "invoiced"
  | "paid"
  | "not_billable";

const APPROVAL_OPTIONS: { value: ApprovalValue; label: string }[] = [
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
];

const PASS_THROUGH_OPTIONS: { value: PassThroughValue; label: string }[] = [
  { value: "yes", label: "Pass-through" },
  { value: "no", label: "Agency absorbed" },
];

const BILLING_OPTIONS: { value: BillingValue; label: string }[] = [
  { value: "awaiting_approval", label: "Awaiting approval" },
  { value: "ready_to_bill", label: "Ready to bill" },
  { value: "draft_invoice", label: "Draft invoice" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
  { value: "not_billable", label: "Not billable" },
];

const BILLING_LABELS: Record<string, string> = Object.fromEntries(
  BILLING_OPTIONS.map((o) => [o.value, o.label]),
);

function SortTh({
  label,
  column,
  className,
  sortKey,
  sortDir,
  onToggle,
}: {
  label: string;
  column: SortKey;
  className?: string;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onToggle: (key: SortKey) => void;
}) {
  const active = sortKey === column;
  return (
    <th className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-semibold"
        onClick={() => onToggle(column)}
      >
        {label}
        {active ? (
          <span className="opacity-60">{sortDir === "asc" ? "↑" : "↓"}</span>
        ) : null}
      </button>
    </th>
  );
}

function CheckboxFilterDropdown<T extends string>({
  id,
  open,
  onOpenChange,
  label,
  summary,
  options,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  search,
  onSearchChange,
  searchPlaceholder,
}: {
  id: string;
  open: boolean;
  onOpenChange: (id: string | null) => void;
  label: string;
  summary: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  onSelectAll: () => void;
  onClear: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        type="button"
        className="btn btn-ghost btn-sm h-auto min-h-10 w-full justify-between gap-2 border border-base-300 px-3 py-2 font-normal"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${summary}`}
        onClick={() => onOpenChange(open ? null : id)}
      >
        <span className="min-w-0 truncate text-left text-sm">{summary}</span>
        <span className="shrink-0 text-[10px] opacity-50" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-[min(20rem,calc(100vw-2rem))] rounded-box border border-base-300 bg-base-100 p-3 shadow-xl"
          role="listbox"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
        >
          {onSearchChange ? (
            <label className="mb-3 block">
              <span className="sr-only">{searchPlaceholder ?? "Search"}</span>
              <input
                type="search"
                className="input input-bordered input-sm w-full"
                placeholder={searchPlaceholder ?? "Search…"}
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </label>
          ) : null}
          <div className="mb-3 flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              className="link link-hover opacity-70"
              onClick={onSelectAll}
            >
              Select all
            </button>
            <button
              type="button"
              className="link link-hover opacity-70"
              onClick={onClear}
            >
              Clear
            </button>
          </div>
          <div
            className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1"
            role="group"
            aria-label={label}
          >
            {options.length === 0 ? (
              <p className="px-1 py-2 text-sm opacity-60">No options found.</p>
            ) : (
              options.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2 py-2 text-sm leading-5 hover:border-base-300 hover:bg-base-200/70"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm mt-0.5 shrink-0"
                      checked={checked}
                      onChange={() => onToggle(opt.value)}
                      aria-label={opt.label}
                    />
                    <span className="min-w-0 break-words">{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function selectionSummary(selectedCount: number, totalCount: number, noun: string) {
  if (totalCount === 0) return `No ${noun}`;
  if (selectedCount === 0) return `No ${noun}`;
  if (selectedCount === totalCount) return `All ${noun}`;
  return `${selectedCount} of ${totalCount}`;
}

export function CostDetailsTable({
  rows,
  invoices,
  spentByCampaign,
}: {
  rows: CostRow[];
  invoices: InvoicePassThroughRow[];
  spentByCampaign: Map<string, number>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("cost_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const [categories, setCategories] = useState<CostCategory[]>([
    ...COST_CATEGORIES,
  ]);
  const [approvals, setApprovals] = useState<ApprovalValue[]>([
    "approved",
    "pending",
  ]);
  const [passThroughs, setPassThroughs] = useState<PassThroughValue[]>([
    "yes",
    "no",
  ]);
  const [billings, setBillings] = useState<BillingValue[]>(
    BILLING_OPTIONS.map((o) => o.value),
  );
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const campaignUserFiltered = useRef(false);

  const campaignOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of rows) {
      if (c.campaign_id) {
        map.set(
          c.campaign_id,
          c.campaigns?.campaign_name ?? c.campaign_id,
        );
      }
    }
    return [...map.entries()]
      .map(([id, label]) => ({ value: id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const allCampaignIds = useMemo(
    () => campaignOptions.map((c) => c.value),
    [campaignOptions],
  );

  useEffect(() => {
    setCampaignIds((prev) => {
      if (!campaignUserFiltered.current || prev.length === 0) {
        return allCampaignIds;
      }
      const kept = allCampaignIds.filter((id) => prev.includes(id));
      return kept.length > 0 ? kept : allCampaignIds;
    });
  }, [allCampaignIds]);

  const visibleCampaignOptions = useMemo(() => {
    const q = campaignSearch.trim().toLowerCase();
    if (!q) return campaignOptions;
    return campaignOptions.filter((c) => c.label.toLowerCase().includes(q));
  }, [campaignOptions, campaignSearch]);

  function resetPage() {
    setPage(0);
  }

  function toggleInList<T extends string>(
    list: T[],
    value: T,
    setList: (next: T[]) => void,
  ) {
    setList(
      list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value],
    );
    resetPage();
  }

  const tableFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => {
      const cat = normalizeCostCategory(c.cost_type);
      if (!cat || !categories.includes(cat)) return false;

      const approvalValue: ApprovalValue = c.approved ? "approved" : "pending";
      if (!approvals.includes(approvalValue)) return false;

      const ptValue: PassThroughValue = c.pass_through ? "yes" : "no";
      if (!passThroughs.includes(ptValue)) return false;

      if (allCampaignIds.length > 0) {
        if (!c.campaign_id || !campaignIds.includes(c.campaign_id)) {
          return false;
        }
      }

      const billingValue = approxBillingStatus(c, invoices) as BillingValue;
      if (!billings.includes(billingValue)) return false;

      if (q) {
        const hay = [
          c.description,
          c.vendor_name,
          c.cost_type,
          c.campaigns?.campaign_name ?? "",
          clientNameFromCost(c),
          categoryLabel(cat),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    rows,
    search,
    categories,
    approvals,
    passThroughs,
    campaignIds,
    allCampaignIds.length,
    billings,
    invoices,
  ]);

  const sorted = useMemo(() => {
    const copy = [...tableFiltered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "amount":
          cmp = num(a.amount) - num(b.amount);
          break;
        case "campaign":
          cmp = (a.campaigns?.campaign_name ?? "").localeCompare(
            b.campaigns?.campaign_name ?? "",
          );
          break;
        case "client":
          cmp = clientNameFromCost(a).localeCompare(clientNameFromCost(b));
          break;
        case "category":
          cmp = (normalizeCostCategory(a.cost_type) ?? "").localeCompare(
            normalizeCostCategory(b.cost_type) ?? "",
          );
          break;
        case "cost_date":
        default:
          cmp = a.cost_date.localeCompare(b.cost_date);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [tableFiltered, sortKey, sortDir]);

  const totals = useMemo(() => {
    let amount = 0;
    let budget = 0;
    let variance = 0;
    let budgetCount = 0;
    let varianceCount = 0;
    const seenCampaigns = new Set<string>();

    for (const c of tableFiltered) {
      amount += num(c.amount);
      if (!c.campaign_id || seenCampaigns.has(c.campaign_id)) continue;
      seenCampaigns.add(c.campaign_id);
      const campBudget = num(c.campaigns?.campaign_budget);
      if (campBudget > 0) {
        budget += campBudget;
        budgetCount += 1;
        const spent = spentByCampaign.get(c.campaign_id) ?? 0;
        variance += budgetVariance(campBudget, spent);
        varianceCount += 1;
      }
    }

    return { amount, budget, variance, budgetCount, varianceCount };
  }, [tableFiltered, spentByCampaign]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const hasTableFilters =
    search.trim() !== "" ||
    categories.length !== COST_CATEGORIES.length ||
    approvals.length !== APPROVAL_OPTIONS.length ||
    passThroughs.length !== PASS_THROUGH_OPTIONS.length ||
    billings.length !== BILLING_OPTIONS.length ||
    (allCampaignIds.length > 0 &&
      campaignIds.length !== allCampaignIds.length);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "cost_date" || key === "amount" ? "desc" : "asc");
    }
    setPage(0);
  }

  function clearTableFilters() {
    setSearch("");
    setCampaignSearch("");
    setCategories([...COST_CATEGORIES]);
    setApprovals(["approved", "pending"]);
    setPassThroughs(["yes", "no"]);
    setBillings(BILLING_OPTIONS.map((o) => o.value));
    campaignUserFiltered.current = false;
    setCampaignIds(allCampaignIds);
    setPage(0);
  }

  if (!rows.length) {
    return (
      <section>
        <div className="mb-3">
          <h2 className="text-xl font-bold">Cost Details</h2>
          <p className="mt-1 text-sm">
            <span className="font-semibold tabular-nums">0</span>
            <span className="opacity-70"> records match the current filters</span>
          </p>
        </div>
        <EmptyState
          title="No cost records match the selected filters."
          description="Adjust the date range, category, or other filters to see cost details."
        />
      </section>
    );
  }

  const recordCount = sorted.length;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Cost Details</h2>
          <p className="mt-1 text-sm" aria-live="polite">
            <span className="font-semibold tabular-nums">{recordCount}</span>
            <span className="opacity-70">
              {" "}
              record{recordCount === 1 ? "" : "s"} match the current filters
            </span>
          </p>
        </div>
        {hasTableFilters ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={clearTableFilters}
          >
            Clear table filters
          </button>
        ) : null}
      </div>

      <div className="mb-4 overflow-visible rounded-box border border-base-300 bg-base-100 p-4">
        <div className="flex flex-col gap-4">
          <label className="form-control w-full">
            <span className="mb-1.5 text-xs font-medium opacity-70">Search</span>
            <input
              type="search"
              className="input input-bordered input-sm w-full"
              placeholder="Campaign, description, vendor, client…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="form-control min-w-0">
              <span className="mb-1.5 text-xs font-medium opacity-70">
                Category
              </span>
              <CheckboxFilterDropdown
                id="category"
                open={openFilter === "category"}
                onOpenChange={setOpenFilter}
                label="Category"
                summary={selectionSummary(
                  categories.length,
                  COST_CATEGORIES.length,
                  "categories",
                )}
                options={COST_CATEGORIES.map((cat) => ({
                  value: cat,
                  label: COST_CATEGORY_LABELS[cat],
                }))}
                selected={categories}
                onToggle={(value) =>
                  toggleInList(categories, value, setCategories)
                }
                onSelectAll={() => {
                  setCategories([...COST_CATEGORIES]);
                  resetPage();
                }}
                onClear={() => {
                  setCategories([]);
                  resetPage();
                }}
              />
            </div>

            <div className="form-control min-w-0">
              <span className="mb-1.5 text-xs font-medium opacity-70">
                Campaign
              </span>
              <CheckboxFilterDropdown
                id="campaign"
                open={openFilter === "campaign"}
                onOpenChange={setOpenFilter}
                label="Campaign"
                summary={selectionSummary(
                  campaignIds.length,
                  allCampaignIds.length,
                  "campaigns",
                )}
                options={visibleCampaignOptions}
                selected={campaignIds}
                onToggle={(value) => {
                  campaignUserFiltered.current = true;
                  toggleInList(campaignIds, value, setCampaignIds);
                }}
                onSelectAll={() => {
                  campaignUserFiltered.current = true;
                  const visible = visibleCampaignOptions.map((o) => o.value);
                  setCampaignIds((prev) => {
                    const set = new Set(prev);
                    for (const id of visible) set.add(id);
                    return allCampaignIds.filter((id) => set.has(id));
                  });
                  resetPage();
                }}
                onClear={() => {
                  campaignUserFiltered.current = true;
                  if (campaignSearch.trim()) {
                    const visible = new Set(
                      visibleCampaignOptions.map((o) => o.value),
                    );
                    setCampaignIds((prev) =>
                      prev.filter((id) => !visible.has(id)),
                    );
                  } else {
                    setCampaignIds([]);
                  }
                  resetPage();
                }}
                search={campaignSearch}
                onSearchChange={setCampaignSearch}
                searchPlaceholder="Search campaigns…"
              />
            </div>

            <div className="form-control min-w-0">
              <span className="mb-1.5 text-xs font-medium opacity-70">
                Approval
              </span>
              <CheckboxFilterDropdown
                id="approval"
                open={openFilter === "approval"}
                onOpenChange={setOpenFilter}
                label="Approval"
                summary={selectionSummary(
                  approvals.length,
                  APPROVAL_OPTIONS.length,
                  "statuses",
                )}
                options={APPROVAL_OPTIONS}
                selected={approvals}
                onToggle={(value) =>
                  toggleInList(approvals, value, setApprovals)
                }
                onSelectAll={() => {
                  setApprovals(["approved", "pending"]);
                  resetPage();
                }}
                onClear={() => {
                  setApprovals([]);
                  resetPage();
                }}
              />
            </div>

            <div className="form-control min-w-0">
              <span className="mb-1.5 text-xs font-medium opacity-70">
                Pass-through
              </span>
              <CheckboxFilterDropdown
                id="passThrough"
                open={openFilter === "passThrough"}
                onOpenChange={setOpenFilter}
                label="Pass-through"
                summary={selectionSummary(
                  passThroughs.length,
                  PASS_THROUGH_OPTIONS.length,
                  "types",
                )}
                options={PASS_THROUGH_OPTIONS}
                selected={passThroughs}
                onToggle={(value) =>
                  toggleInList(passThroughs, value, setPassThroughs)
                }
                onSelectAll={() => {
                  setPassThroughs(["yes", "no"]);
                  resetPage();
                }}
                onClear={() => {
                  setPassThroughs([]);
                  resetPage();
                }}
              />
            </div>

            <div className="form-control min-w-0 sm:col-span-2 lg:col-span-1 xl:col-span-1">
              <span className="mb-1.5 text-xs font-medium opacity-70">
                Billing
              </span>
              <CheckboxFilterDropdown
                id="billing"
                open={openFilter === "billing"}
                onOpenChange={setOpenFilter}
                label="Billing"
                summary={selectionSummary(
                  billings.length,
                  BILLING_OPTIONS.length,
                  "statuses",
                )}
                options={BILLING_OPTIONS}
                selected={billings}
                onToggle={(value) => toggleInList(billings, value, setBillings)}
                onSelectAll={() => {
                  setBillings(BILLING_OPTIONS.map((o) => o.value));
                  resetPage();
                }}
                onClear={() => {
                  setBillings([]);
                  resetPage();
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <div className="text-xs opacity-60">Total Amount</div>
          <div className="mt-1 text-lg font-bold tabular-nums">
            {money(totals.amount)}
          </div>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <div className="text-xs opacity-60">
            Total Budget
            {totals.budgetCount > 0 ? (
              <span className="opacity-50">
                {" "}
                · {totals.budgetCount} campaign
                {totals.budgetCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums">
            {totals.budgetCount > 0 ? money(totals.budget) : "Not available"}
          </div>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <div className="text-xs opacity-60">Total Variance</div>
          <div
            className={`mt-1 text-lg font-bold tabular-nums ${
              totals.varianceCount > 0 && totals.variance < 0 ? "text-error" : ""
            }`}
          >
            {totals.varianceCount > 0 ? money(totals.variance) : "Not available"}
          </div>
        </div>
      </div>

      {!sorted.length ? (
        <EmptyState
          title="No cost records match the table search or filters."
          description="Clear table filters or broaden your search to see more rows."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-box border border-base-300">
            <table className="table table-sm">
              <thead className="sticky top-0 z-10 bg-base-200">
                <tr>
                  <SortTh
                    label="Date"
                    column="cost_date"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortTh
                    label="Client"
                    column="client"
                    className="min-w-[8rem]"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortTh
                    label="Campaign"
                    column="campaign"
                    className="min-w-[12rem]"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortTh
                    label="Category"
                    column="category"
                    className="min-w-[9rem]"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <th className="min-w-[12rem]">Description</th>
                  <th className="min-w-[8rem]">Vendor / Platform</th>
                  <SortTh
                    label="Amount"
                    column="amount"
                    className="text-right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <th className="text-right">Budget</th>
                  <th className="text-right">Variance</th>
                  <th>Approval</th>
                  <th>Pass-through</th>
                  <th>Billing</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => {
                  const cat = normalizeCostCategory(c.cost_type);
                  const budget = num(c.campaigns?.campaign_budget);
                  const spent = c.campaign_id
                    ? (spentByCampaign.get(c.campaign_id) ?? 0)
                    : 0;
                  const variance =
                    budget > 0 ? budgetVariance(budget, spent) : null;
                  const rowBilling = approxBillingStatus(c, invoices);
                  const desc = c.description || "—";
                  return (
                    <tr key={c.id}>
                      <td className="whitespace-nowrap">{c.cost_date}</td>
                      <td
                        className="max-w-[8rem] truncate"
                        title={clientNameFromCost(c)}
                      >
                        {clientNameFromCost(c)}
                      </td>
                      <td className="max-w-[14rem]">
                        {c.campaign_id ? (
                          <Link
                            href={`/app/campaigns/${c.campaign_id}`}
                            className="link link-hover line-clamp-2"
                            title={c.campaigns?.campaign_name ?? undefined}
                          >
                            {c.campaigns?.campaign_name ?? "—"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span
                          className="badge badge-ghost badge-sm whitespace-nowrap"
                          title={c.cost_type}
                        >
                          {categoryLabel(cat)}
                        </span>
                      </td>
                      <td className="max-w-[16rem] truncate" title={desc}>
                        {desc}
                      </td>
                      <td
                        className="max-w-[10rem] truncate"
                        title={c.vendor_name || undefined}
                      >
                        {c.vendor_name || "—"}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        {money(num(c.amount))}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        {budget > 0 ? money(budget) : "Not available"}
                      </td>
                      <td
                        className={`whitespace-nowrap text-right ${variance != null && variance < 0 ? "text-error" : ""}`}
                      >
                        {variance != null ? money(variance) : "Not available"}
                      </td>
                      <td>
                        <StatusBadge
                          status={c.approved ? "Approved" : "Pending"}
                        />
                      </td>
                      <td>
                        <span className="badge badge-sm badge-ghost">
                          {c.pass_through
                            ? "Pass-through"
                            : "Agency absorbed"}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-sm badge-outline whitespace-nowrap">
                          {BILLING_LABELS[rowBilling] ?? rowBilling}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-base-200 font-semibold">
                <tr>
                  <td colSpan={6}>Totals (filtered)</td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {money(totals.amount)}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {totals.budgetCount > 0
                      ? money(totals.budget)
                      : "Not available"}
                  </td>
                  <td
                    className={`whitespace-nowrap text-right tabular-nums ${
                      totals.varianceCount > 0 && totals.variance < 0
                        ? "text-error"
                        : ""
                    }`}
                  >
                    {totals.varianceCount > 0
                      ? money(totals.variance)
                      : "Not available"}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="opacity-60">
              Page {safePage + 1} of {pageCount}
            </span>
            <div className="join">
              <button
                type="button"
                className="btn btn-sm join-item"
                disabled={safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-sm join-item"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
