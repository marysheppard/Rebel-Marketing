"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import {
  COST_CATEGORY_COLORS,
  COST_CATEGORY_LABELS,
  type CostCategory,
} from "@/lib/costs/categories";
import {
  buildCategoryChartSlices,
  type CategoryChartSlice,
  type CategoryTotals,
  type CostRow,
} from "@/lib/costs/calculations";
import { money, pct } from "@/lib/format";
import { format, parseISO } from "date-fns";

const OUTER_RADIUS = 120;
const INNER_RADIUS = 70;

function formatRangeLabel(start: string, end: string) {
  try {
    return `${format(parseISO(start), "MMM d, yyyy")} – ${format(parseISO(end), "MMM d, yyyy")}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function CategoryDetailsCard({
  slice,
  className = "",
}: {
  slice: CategoryChartSlice;
  className?: string;
}) {
  const color = COST_CATEGORY_COLORS[slice.key];

  return (
    <div
      className={`min-w-[220px] rounded-2xl border border-base-300 bg-base-300 px-5 py-4 text-sm text-base-content shadow-xl ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="font-semibold">{slice.name}</span>
      </div>
      <dl className="space-y-2 text-xs">
        <div className="flex justify-between gap-6">
          <dt className="opacity-70">Total Amount</dt>
          <dd className="text-base font-bold">{money(slice.value)}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="opacity-70">Share of Total Costs</dt>
          <dd className="font-semibold">{pct(slice.share)}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="opacity-70">Number of Transactions</dt>
          <dd className="font-semibold">{slice.count}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="opacity-70">Average Transaction</dt>
          <dd className="font-semibold">
            {slice.average == null ? "Not available" : money(slice.average)}
          </dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="opacity-70">Largest Campaign</dt>
          <dd
            className="max-w-[9rem] truncate text-right font-semibold"
            title={slice.largestCampaign ?? undefined}
          >
            {slice.largestCampaign ?? "Not available"}
          </dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="opacity-70">Budget Status</dt>
          <dd className="font-semibold">
            {slice.budgetStatusLabel ?? "Not available"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

const MemoCategoryDetailsCard = memo(CategoryDetailsCard);

type SectorShapeProps = {
  index?: number;
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
  payload?: CategoryChartSlice;
};

const CategoryDonut = memo(function CategoryDonut({
  slices,
  focusIndex,
  animate,
  total,
  transactionCount,
  onActivate,
  onDeactivate,
  onSelect,
}: {
  slices: CategoryChartSlice[];
  focusIndex: number | null;
  animate: boolean;
  total: number;
  transactionCount: number;
  onActivate: (index: number) => void;
  onDeactivate: () => void;
  onSelect: (category: CostCategory) => void;
}) {
  const renderShape = useCallback(
    (props: SectorShapeProps) => {
      const idx = props.index ?? 0;
      const slice = props.payload ?? slices[idx];
      const isActive = focusIndex === idx;
      const faded = focusIndex != null && focusIndex !== idx;
      const r = props.outerRadius ?? OUTER_RADIUS;
      const cx = props.cx ?? 0;
      const cy = props.cy ?? 0;
      const label = slice
        ? `${slice.name}: ${money(slice.value)}, ${pct(slice.share)}, ${slice.count} transactions`
        : "Category slice";

      const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (slice) onSelect(slice.key);
        }
      };

      return (
        <g
          tabIndex={0}
          role="button"
          aria-label={`${label}. Press Enter to view details and filter the cost table.`}
          style={{
            cursor: "pointer",
            outline: "none",
            opacity: faded ? 0.35 : 1,
            transform: isActive ? "scale(1.09)" : "scale(1)",
            transformOrigin: `${cx}px ${cy}px`,
            transition: "transform 220ms ease, opacity 220ms ease",
          }}
          onFocus={() => onActivate(idx)}
          onBlur={onDeactivate}
          onKeyDown={onKeyDown}
        >
          <Sector
            cx={props.cx}
            cy={props.cy}
            innerRadius={props.innerRadius}
            outerRadius={r}
            startAngle={props.startAngle}
            endAngle={props.endAngle}
            fill={props.fill}
          />
          {isActive ? (
            <Sector
              cx={props.cx}
              cy={props.cy}
              innerRadius={r}
              outerRadius={r * 1.03}
              startAngle={props.startAngle}
              endAngle={props.endAngle}
              fill={props.fill}
              opacity={0.35}
            />
          ) : null}
        </g>
      );
    },
    [focusIndex, onActivate, onDeactivate, onSelect, slices],
  );

  return (
    <div
      className="mx-auto h-[420px] w-full max-w-[560px]"
      role="img"
      aria-label={`Costs by category donut chart. Total ${money(total)} across ${transactionCount} transactions.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={INNER_RADIUS}
            outerRadius={OUTER_RADIUS}
            paddingAngle={2}
            label={false}
            isAnimationActive={animate}
            animationDuration={250}
            animationEasing="ease-out"
            onMouseEnter={(_, index) => onActivate(index)}
            onClick={(_, index) => {
              const row = slices[index];
              if (row) onSelect(row.key);
            }}
            style={{ cursor: "pointer", outline: "none" }}
            shape={renderShape}
          >
            {slices.map((d) => (
              <Cell
                key={d.key}
                fill={COST_CATEGORY_COLORS[d.key]}
                stroke="transparent"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

export function CostsByCategoryChart({
  costs,
  totals,
  total,
  rangeStart,
  rangeEnd,
  presetLabel,
  selectedCategory,
  onSelectCategory,
  onClearCategory,
}: {
  costs: CostRow[];
  totals: CategoryTotals;
  total: number;
  rangeStart: string;
  rangeEnd: string;
  presetLabel: string;
  selectedCategory: CostCategory | null;
  onSelectCategory: (category: CostCategory) => void;
  onClearCategory: () => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [animate, setAnimate] = useState(true);
  // Show details immediately on click; URL/filter update can lag behind via startTransition.
  const [optimisticCategory, setOptimisticCategory] = useState<CostCategory | null>(
    selectedCategory,
  );

  const slices = useMemo(
    () => buildCategoryChartSlices(costs, totals, total),
    [costs, totals, total],
  );

  const slicesByKey = useMemo(() => {
    const map = new Map<CostCategory, CategoryChartSlice>();
    for (const slice of slices) map.set(slice.key, slice);
    return map;
  }, [slices]);

  const slicesSignature = useMemo(
    () => slices.map((s) => `${s.key}:${s.value}:${s.count}`).join("|"),
    [slices],
  );

  // Animate only when underlying slice values change — not on hover/selection.
  useEffect(() => {
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 280);
    return () => clearTimeout(t);
  }, [slicesSignature]);

  // Stay in sync when filters change from outside (URL, Clear Filter, filter bar).
  useEffect(() => {
    setOptimisticCategory(selectedCategory);
  }, [selectedCategory]);

  const transactionCount = useMemo(
    () => slices.reduce((s, d) => s + d.count, 0),
    [slices],
  );

  const viewingCategory = optimisticCategory;
  const selectedSlice = viewingCategory
    ? (slicesByKey.get(viewingCategory) ?? null)
    : null;
  const hoveredSlice =
    hoverIndex != null && slices[hoverIndex] ? slices[hoverIndex] : null;
  // Side panel: hover takes priority; fall back to clicked selection.
  const detailsSlice = hoveredSlice ?? selectedSlice;

  const clearHover = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const activate = useCallback((index: number) => {
    setHoverIndex((prev) => (prev === index ? prev : index));
  }, []);

  const handleSelect = useCallback(
    (category: CostCategory) => {
      setHoverIndex(null);
      setOptimisticCategory(category);
      onSelectCategory(category);
    },
    [onSelectCategory],
  );

  const handleClear = useCallback(() => {
    setOptimisticCategory(null);
    onClearCategory();
  }, [onClearCategory]);

  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Costs by Category</h3>
          <p className="mt-1 text-sm opacity-70">
            {formatRangeLabel(rangeStart, rangeEnd)}
          </p>
          <p className="text-xs uppercase tracking-wide opacity-50">
            {presetLabel}
          </p>
        </div>
        {viewingCategory ? (
          <div className="flex flex-wrap items-center gap-2 rounded-box border border-base-300 bg-base-200/50 px-3 py-2 text-sm">
            <span className="opacity-70">Currently Viewing</span>
            <span
              className="font-semibold"
              style={{ color: COST_CATEGORY_COLORS[viewingCategory] }}
            >
              {COST_CATEGORY_LABELS[viewingCategory]}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={handleClear}
            >
              Clear Filter
            </button>
          </div>
        ) : null}
      </div>

      {total <= 0 ? (
        <div className="flex h-64 items-center justify-center text-sm opacity-60">
          No cost records match the selected filters.
        </div>
      ) : (
        <>
          <div
            className="flex flex-col items-center gap-8 lg:flex-row lg:items-stretch lg:justify-center"
            onMouseLeave={clearHover}
          >
            <div className="relative mx-auto w-full max-w-[560px] shrink-0">
              <CategoryDonut
                slices={slices}
                focusIndex={hoverIndex}
                animate={animate}
                total={total}
                transactionCount={transactionCount}
                onActivate={activate}
                onDeactivate={clearHover}
                onSelect={handleSelect}
              />

              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                aria-live="polite"
              >
                <div className="max-w-[140px] text-center transition-opacity duration-300">
                  {selectedSlice ? (
                    <>
                      <div className="text-[11px] font-medium leading-tight opacity-70">
                        {selectedSlice.name}
                      </div>
                      <div className="mt-1 text-xl font-bold tracking-tight">
                        {money(selectedSlice.value)}
                      </div>
                      <div className="mt-0.5 text-xs opacity-70">
                        {pct(selectedSlice.share)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[11px] font-medium uppercase tracking-wide opacity-60">
                        Total Costs
                      </div>
                      <div className="mt-1 text-xl font-bold tracking-tight">
                        {money(total)}
                      </div>
                      <div className="mt-0.5 text-xs opacity-70">
                        {transactionCount} Transaction
                        {transactionCount === 1 ? "" : "s"}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex w-full min-w-0 flex-1 flex-col gap-4 lg:max-w-md">
              <ul className="space-y-1" role="list">
                {slices.map((slice, index) => {
                  const hovered = hoverIndex === index;
                  const selected = viewingCategory === slice.key;
                  return (
                    <li key={slice.key}>
                      <button
                        type="button"
                        className={`grid w-full grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-box px-3 py-2.5 text-left text-sm transition ${
                          hovered || selected
                            ? "bg-base-200"
                            : "hover:bg-base-200/60"
                        }`}
                        style={{
                          borderLeft: `3px solid ${COST_CATEGORY_COLORS[slice.key]}`,
                        }}
                        aria-label={`${slice.name}: ${money(slice.value)}, ${pct(slice.share)}, ${slice.count} transactions. Activate to view details and filter table.`}
                        aria-pressed={selected}
                        onMouseEnter={() => activate(index)}
                        onFocus={() => activate(index)}
                        onBlur={clearHover}
                        onClick={() => handleSelect(slice.key)}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: COST_CATEGORY_COLORS[slice.key],
                          }}
                          aria-hidden
                        />
                        <span className="min-w-0 truncate font-medium">
                          {slice.name}
                        </span>
                        <span className="text-right font-semibold tabular-nums">
                          {money(slice.value)}
                        </span>
                        <span className="w-14 text-right tabular-nums opacity-70">
                          {pct(slice.share)}
                        </span>
                        <span className="w-10 text-right tabular-nums opacity-70">
                          {slice.count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-3 text-[10px] uppercase tracking-wide opacity-50">
                <span />
                <span>Category</span>
                <span className="text-right">Total</span>
                <span className="w-14 text-right">%</span>
                <span className="w-10 text-right">Txns</span>
              </div>

              {detailsSlice ? (
                <div aria-live="polite">
                  <MemoCategoryDetailsCard
                    slice={detailsSlice}
                    className="w-full"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
