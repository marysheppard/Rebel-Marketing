"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EmptyState, StatusBadge } from "@/components/ui";
import type { ArEnrichedInvoice } from "@/lib/ar/calculations";
import {
  AR_AGING_BUCKETS,
  type ArAgingBucket,
} from "@/lib/ar/filters";
import { money } from "@/lib/format";

const PAGE_SIZE = 15;

type SortKey =
  | "invoice_number"
  | "client"
  | "invoice_date"
  | "due_date"
  | "amount"
  | "paid"
  | "remaining"
  | "daysOut"
  | "status";

type StatusValue =
  | "Draft"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Disputed"
  | "Canceled";

type DisputeValue = "yes" | "no";

const STATUS_OPTIONS: { value: StatusValue; label: string }[] = [
  { value: "Draft", label: "Draft" },
  { value: "Sent", label: "Sent" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Paid", label: "Paid" },
  { value: "Overdue", label: "Overdue" },
  { value: "Disputed", label: "Disputed" },
  { value: "Canceled", label: "Canceled" },
];

const DISPUTE_OPTIONS: { value: DisputeValue; label: string }[] = [
  { value: "yes", label: "Disputed" },
  { value: "no", label: "Not disputed" },
];

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

function selectionSummary(
  selectedCount: number,
  totalCount: number,
  noun: string,
) {
  if (totalCount === 0) return `No ${noun}`;
  if (selectedCount === 0) return `No ${noun}`;
  if (selectedCount === totalCount) return `All ${noun}`;
  return `${selectedCount} of ${totalCount}`;
}

export function ArDetailsTable({ rows }: { rows: ArEnrichedInvoice[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<StatusValue[]>(
    STATUS_OPTIONS.map((o) => o.value),
  );
  const [agingBuckets, setAgingBuckets] = useState<ArAgingBucket[]>([
    ...AR_AGING_BUCKETS,
  ]);
  const [disputes, setDisputes] = useState<DisputeValue[]>(["yes", "no"]);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const clientUserFiltered = useRef(false);

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of rows) {
      map.set(i.client_id, i.clientName);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ value: id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const allClientIds = useMemo(
    () => clientOptions.map((c) => c.value),
    [clientOptions],
  );

  useEffect(() => {
    setClientIds((prev) => {
      if (!clientUserFiltered.current || prev.length === 0) {
        return allClientIds;
      }
      const kept = allClientIds.filter((id) => prev.includes(id));
      return kept.length > 0 ? kept : allClientIds;
    });
  }, [allClientIds]);

  const visibleClientOptions = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clientOptions;
    return clientOptions.filter((c) => c.label.toLowerCase().includes(q));
  }, [clientOptions, clientSearch]);

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
    return rows.filter((i) => {
      if (allClientIds.length > 0 && !clientIds.includes(i.client_id)) {
        return false;
      }

      const statusMatches = statuses.some((s) => {
        if (s === "Overdue") return i.isOverdue;
        if (s === "Partially Paid") {
          return (
            i.paymentStatus === "partial" || i.status === "Partially Paid"
          );
        }
        if (s === "Paid") {
          return i.paymentStatus === "paid" || i.status === "Paid";
        }
        return i.status === s;
      });
      if (!statusMatches) return false;

      if (!agingBuckets.includes(i.agingBucket)) return false;

      const disputeValue: DisputeValue = i.disputed ? "yes" : "no";
      if (!disputes.includes(disputeValue)) return false;

      if (q) {
        const hay = [
          i.invoice_number,
          i.clientName,
          i.status,
          i.notes ?? "",
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
    clientIds,
    allClientIds.length,
    statuses,
    agingBuckets,
    disputes,
  ]);

  const sorted = useMemo(() => {
    const copy = [...tableFiltered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "invoice_number":
          cmp = a.invoice_number.localeCompare(b.invoice_number);
          break;
        case "client":
          cmp = a.clientName.localeCompare(b.clientName);
          break;
        case "invoice_date":
          cmp = a.invoice_date.localeCompare(b.invoice_date);
          break;
        case "amount":
          cmp = Number(a.total_amount) - Number(b.total_amount);
          break;
        case "paid":
          cmp = a.paid - b.paid;
          break;
        case "remaining":
          cmp = a.remaining - b.remaining;
          break;
        case "daysOut":
          cmp = (a.daysOut ?? -1) - (b.daysOut ?? -1);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "due_date":
        default:
          cmp = a.due_date.localeCompare(b.due_date);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [tableFiltered, sortKey, sortDir]);

  const totals = useMemo(() => {
    let amount = 0;
    let paid = 0;
    let remaining = 0;
    for (const i of tableFiltered) {
      amount += Number(i.total_amount);
      paid += i.paid;
      remaining += i.remaining;
    }
    return { amount, paid, remaining };
  }, [tableFiltered]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const hasTableFilters =
    search.trim() !== "" ||
    statuses.length !== STATUS_OPTIONS.length ||
    agingBuckets.length !== AR_AGING_BUCKETS.length ||
    disputes.length !== DISPUTE_OPTIONS.length ||
    (allClientIds.length > 0 && clientIds.length !== allClientIds.length);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "amount" ||
          key === "paid" ||
          key === "remaining" ||
          key === "daysOut"
          ? "desc"
          : "asc",
      );
    }
    setPage(0);
  }

  function clearTableFilters() {
    setSearch("");
    setClientSearch("");
    setStatuses(STATUS_OPTIONS.map((o) => o.value));
    setAgingBuckets([...AR_AGING_BUCKETS]);
    setDisputes(["yes", "no"]);
    clientUserFiltered.current = false;
    setClientIds(allClientIds);
    setPage(0);
  }

  if (!rows.length) {
    return (
      <section>
        <div className="mb-3">
          <h2 className="text-xl font-bold">Invoice details</h2>
          <p className="mt-1 text-sm">
            <span className="font-semibold tabular-nums">0</span>
            <span className="opacity-70">
              {" "}
              invoices match the current filters
            </span>
          </p>
        </div>
        <EmptyState
          title="No invoices match the selected filters."
          description="Clear filters or broaden the date range to see invoices."
        />
      </section>
    );
  }

  const recordCount = sorted.length;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Invoice details</h2>
          <p className="mt-1 text-sm" aria-live="polite">
            <span className="font-semibold tabular-nums">{recordCount}</span>
            <span className="opacity-70">
              {" "}
              invoice{recordCount === 1 ? "" : "s"} match the current filters
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
              placeholder="Invoice #, client, notes…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="form-control min-w-0">
              <span className="mb-1.5 text-xs font-medium opacity-70">
                Client
              </span>
              <CheckboxFilterDropdown
                id="client"
                open={openFilter === "client"}
                onOpenChange={setOpenFilter}
                label="Client"
                summary={selectionSummary(
                  clientIds.length,
                  allClientIds.length,
                  "clients",
                )}
                options={visibleClientOptions}
                selected={clientIds}
                onToggle={(value) => {
                  clientUserFiltered.current = true;
                  toggleInList(clientIds, value, setClientIds);
                }}
                onSelectAll={() => {
                  clientUserFiltered.current = true;
                  const visible = visibleClientOptions.map((o) => o.value);
                  setClientIds((prev) => {
                    const set = new Set(prev);
                    for (const id of visible) set.add(id);
                    return allClientIds.filter((id) => set.has(id));
                  });
                  resetPage();
                }}
                onClear={() => {
                  clientUserFiltered.current = true;
                  if (clientSearch.trim()) {
                    const visible = new Set(
                      visibleClientOptions.map((o) => o.value),
                    );
                    setClientIds((prev) =>
                      prev.filter((id) => !visible.has(id)),
                    );
                  } else {
                    setClientIds([]);
                  }
                  resetPage();
                }}
                search={clientSearch}
                onSearchChange={setClientSearch}
                searchPlaceholder="Search clients…"
              />
            </div>

            <div className="form-control min-w-0">
              <span className="mb-1.5 text-xs font-medium opacity-70">
                Status
              </span>
              <CheckboxFilterDropdown
                id="status"
                open={openFilter === "status"}
                onOpenChange={setOpenFilter}
                label="Status"
                summary={selectionSummary(
                  statuses.length,
                  STATUS_OPTIONS.length,
                  "statuses",
                )}
                options={STATUS_OPTIONS}
                selected={statuses}
                onToggle={(value) =>
                  toggleInList(statuses, value, setStatuses)
                }
                onSelectAll={() => {
                  setStatuses(STATUS_OPTIONS.map((o) => o.value));
                  resetPage();
                }}
                onClear={() => {
                  setStatuses([]);
                  resetPage();
                }}
              />
            </div>

            <div className="form-control min-w-0">
              <span className="mb-1.5 text-xs font-medium opacity-70">
                Aging
              </span>
              <CheckboxFilterDropdown
                id="aging"
                open={openFilter === "aging"}
                onOpenChange={setOpenFilter}
                label="Aging"
                summary={selectionSummary(
                  agingBuckets.length,
                  AR_AGING_BUCKETS.length,
                  "buckets",
                )}
                options={AR_AGING_BUCKETS.map((b) => ({
                  value: b,
                  label: b,
                }))}
                selected={agingBuckets}
                onToggle={(value) =>
                  toggleInList(agingBuckets, value, setAgingBuckets)
                }
                onSelectAll={() => {
                  setAgingBuckets([...AR_AGING_BUCKETS]);
                  resetPage();
                }}
                onClear={() => {
                  setAgingBuckets([]);
                  resetPage();
                }}
              />
            </div>

            <div className="form-control min-w-0">
              <span className="mb-1.5 text-xs font-medium opacity-70">
                Dispute
              </span>
              <CheckboxFilterDropdown
                id="dispute"
                open={openFilter === "dispute"}
                onOpenChange={setOpenFilter}
                label="Dispute"
                summary={selectionSummary(
                  disputes.length,
                  DISPUTE_OPTIONS.length,
                  "types",
                )}
                options={DISPUTE_OPTIONS}
                selected={disputes}
                onToggle={(value) =>
                  toggleInList(disputes, value, setDisputes)
                }
                onSelectAll={() => {
                  setDisputes(["yes", "no"]);
                  resetPage();
                }}
                onClear={() => {
                  setDisputes([]);
                  resetPage();
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <div className="text-xs opacity-60">Invoice amount</div>
          <div className="mt-1 text-lg font-bold tabular-nums">
            {money(totals.amount)}
          </div>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <div className="text-xs opacity-60">Paid</div>
          <div className="mt-1 text-lg font-bold tabular-nums">
            {money(totals.paid)}
          </div>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <div className="text-xs opacity-60">Remaining</div>
          <div className="mt-1 text-lg font-bold tabular-nums">
            {money(totals.remaining)}
          </div>
        </div>
      </div>

      {!sorted.length ? (
        <EmptyState
          title="No invoices match the table search or filters."
          description="Clear table filters or broaden your search to see more rows."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-box border border-base-300">
            <table className="table table-sm">
              <thead className="sticky top-0 z-10 bg-base-200">
                <tr>
                  <SortTh
                    label="Invoice #"
                    column="invoice_number"
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
                    label="Invoice date"
                    column="invoice_date"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortTh
                    label="Due date"
                    column="due_date"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortTh
                    label="Amount"
                    column="amount"
                    className="text-right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortTh
                    label="Paid"
                    column="paid"
                    className="text-right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortTh
                    label="Remaining"
                    column="remaining"
                    className="text-right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortTh
                    label="Days out"
                    column="daysOut"
                    className="text-right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortTh
                    label="Status"
                    column="status"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <th>Disputed</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((i) => (
                  <tr
                    key={i.id}
                    className={i.isOverdue ? "bg-error/5" : undefined}
                  >
                    <td className="font-medium whitespace-nowrap">
                      {i.invoice_number}
                    </td>
                    <td className="max-w-[10rem] truncate" title={i.clientName}>
                      <Link
                        href={`/app/clients/${i.client_id}`}
                        className="link link-hover"
                      >
                        {i.clientName}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{i.invoice_date}</td>
                    <td className="whitespace-nowrap">{i.due_date}</td>
                    <td className="text-right tabular-nums whitespace-nowrap">
                      {money(Number(i.total_amount))}
                    </td>
                    <td className="text-right tabular-nums whitespace-nowrap">
                      {money(i.paid)}
                    </td>
                    <td className="text-right tabular-nums whitespace-nowrap font-medium">
                      {money(i.remaining)}
                    </td>
                    <td className="text-right tabular-nums">
                      {i.daysOut ?? "—"}
                    </td>
                    <td>
                      <StatusBadge status={i.status} />
                    </td>
                    <td>
                      {i.disputed ? (
                        <span className="badge badge-warning badge-sm">
                          Yes
                        </span>
                      ) : (
                        <span className="badge badge-ghost badge-sm">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-base-200 font-semibold">
                <tr>
                  <td colSpan={4}>Totals (filtered)</td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {money(totals.amount)}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {money(totals.paid)}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {money(totals.remaining)}
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
