"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import { money, pct } from "@/lib/format";

const OUTER_RADIUS = 120;
const INNER_RADIUS = 70;

export type DonutBreakdownSlice = {
  key: string;
  name: string;
  value: number;
  count: number;
  share: number | null;
  color: string;
  /** Extra detail-card rows (Costs-style insights). */
  insights?: { label: string; value: string }[];
};

export type DonutValueFormat = "count" | "money";

function formatValue(value: number, format: DonutValueFormat) {
  return format === "money" ? money(value) : String(value);
}

function DetailsCard({
  slice,
  valueFormat,
  valueLabel,
  countLabel,
  className = "",
}: {
  slice: DonutBreakdownSlice;
  valueFormat: DonutValueFormat;
  valueLabel: string;
  countLabel: string;
  className?: string;
}) {
  const average =
    slice.count > 0 ? slice.value / slice.count : null;
  const insights = slice.insights ?? [];

  return (
    <div
      className={`min-w-[220px] rounded-2xl border border-base-300 bg-base-300 px-5 py-4 text-sm text-base-content shadow-xl ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: slice.color }}
          aria-hidden
        />
        <span className="font-semibold">{slice.name}</span>
      </div>
      <dl className="space-y-2 text-xs">
        <div className="flex justify-between gap-6">
          <dt className="opacity-70">{valueLabel}</dt>
          <dd className="text-base font-bold">
            {formatValue(slice.value, valueFormat)}
          </dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="opacity-70">Share of Total</dt>
          <dd className="font-semibold">{pct(slice.share)}</dd>
        </div>
        {valueFormat === "money" ? (
          <>
            <div className="flex justify-between gap-6">
              <dt className="opacity-70">{countLabel}</dt>
              <dd className="font-semibold">{slice.count}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="opacity-70">Average</dt>
              <dd className="font-semibold">
                {average == null ? "Not available" : money(average)}
              </dd>
            </div>
          </>
        ) : null}
        {insights.map((row) => (
          <div key={row.label} className="flex justify-between gap-6">
            <dt className="opacity-70">{row.label}</dt>
            <dd
              className="max-w-[11rem] truncate text-right font-semibold"
              title={row.value}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const MemoDetailsCard = memo(DetailsCard);

type SectorShapeProps = {
  index?: number;
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
  payload?: DonutBreakdownSlice;
};

const BreakdownDonut = memo(function BreakdownDonut({
  slices,
  focusIndex,
  animate,
  total,
  itemCount,
  valueFormat,
  centerTotalLabel,
  itemNoun,
  onActivate,
  onDeactivate,
  onSelect,
}: {
  slices: DonutBreakdownSlice[];
  focusIndex: number | null;
  animate: boolean;
  total: number;
  itemCount: number;
  valueFormat: DonutValueFormat;
  centerTotalLabel: string;
  itemNoun: string;
  onActivate: (index: number) => void;
  onDeactivate: () => void;
  onSelect: (key: string) => void;
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
        ? `${slice.name}: ${formatValue(slice.value, valueFormat)}, ${pct(slice.share)}, ${slice.count} ${itemNoun}`
        : "Slice";

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
          aria-label={`${label}. Press Enter to view details.`}
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
    [
      focusIndex,
      itemNoun,
      onActivate,
      onDeactivate,
      onSelect,
      slices,
      valueFormat,
    ],
  );

  return (
    <div
      className="mx-auto h-[420px] w-full max-w-[560px]"
      role="img"
      aria-label={`${centerTotalLabel} donut chart. Total ${formatValue(total, valueFormat)} across ${itemCount} ${itemNoun}.`}
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
              <Cell key={d.key} fill={d.color} stroke="transparent" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

export function DonutBreakdownViz({
  title,
  subtitle,
  emptyMessage = "No data to display.",
  slices,
  valueFormat = "count",
  centerTotalLabel,
  valueColumnLabel = "Total",
  countColumnLabel = "Count",
  categoryColumnLabel = "Category",
  valueDetailLabel,
  countDetailLabel,
  itemNoun = "items",
  headerRight,
  selectedKey: controlledSelectedKey,
  onSelectKey,
  onClearSelection,
  clearFilterLabel = "Clear Filter",
  /** split = pie beside legend (default). stacked = pie with legend under it in one column. */
  layout = "split",
  /** Insight card under the legend; off for compact stacked report cards. */
  showDetailsCard = true,
}: {
  title: string;
  subtitle?: string;
  emptyMessage?: string;
  slices: DonutBreakdownSlice[];
  valueFormat?: DonutValueFormat;
  centerTotalLabel: string;
  valueColumnLabel?: string;
  countColumnLabel?: string;
  categoryColumnLabel?: string;
  valueDetailLabel?: string;
  countDetailLabel?: string;
  itemNoun?: string;
  headerRight?: ReactNode;
  /** When set, selection is controlled by the parent (Costs-style filter). */
  selectedKey?: string | null;
  onSelectKey?: (key: string) => void;
  onClearSelection?: () => void;
  clearFilterLabel?: string;
  layout?: "split" | "stacked";
  showDetailsCard?: boolean;
}) {
  const isControlled = controlledSelectedKey !== undefined;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [internalSelectedKey, setInternalSelectedKey] = useState<string | null>(
    null,
  );
  const [animate, setAnimate] = useState(true);

  const selectedKey = isControlled
    ? (controlledSelectedKey ?? null)
    : internalSelectedKey;

  const total = useMemo(
    () => slices.reduce((s, d) => s + d.value, 0),
    [slices],
  );
  const itemCount = useMemo(
    () => slices.reduce((s, d) => s + d.count, 0),
    [slices],
  );

  const slicesByKey = useMemo(() => {
    const map = new Map<string, DonutBreakdownSlice>();
    for (const slice of slices) map.set(slice.key, slice);
    return map;
  }, [slices]);

  const slicesSignature = useMemo(
    () => slices.map((s) => `${s.key}:${s.value}:${s.count}`).join("|"),
    [slices],
  );

  useEffect(() => {
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 280);
    return () => clearTimeout(t);
  }, [slicesSignature]);

  useEffect(() => {
    if (!isControlled && selectedKey && !slicesByKey.has(selectedKey)) {
      setInternalSelectedKey(null);
    }
  }, [isControlled, selectedKey, slicesByKey]);

  const selectedSlice = selectedKey
    ? (slicesByKey.get(selectedKey) ?? null)
    : null;
  const hoveredSlice =
    hoverIndex != null && slices[hoverIndex] ? slices[hoverIndex] : null;
  const detailsSlice = hoveredSlice ?? selectedSlice;

  const clearHover = useCallback(() => setHoverIndex(null), []);
  const activate = useCallback((index: number) => {
    setHoverIndex((prev) => (prev === index ? prev : index));
  }, []);

  const handleSelect = useCallback(
    (key: string) => {
      setHoverIndex(null);
      if (isControlled) {
        if (selectedKey === key) {
          onClearSelection?.();
        } else {
          onSelectKey?.(key);
        }
        return;
      }
      setInternalSelectedKey((prev) => (prev === key ? null : key));
      if (selectedKey === key) {
        onClearSelection?.();
      } else {
        onSelectKey?.(key);
      }
    },
    [isControlled, onClearSelection, onSelectKey, selectedKey],
  );

  const handleClear = useCallback(() => {
    if (isControlled) {
      onClearSelection?.();
      return;
    }
    setInternalSelectedKey(null);
    onClearSelection?.();
  }, [isControlled, onClearSelection]);

  const valueLabel = valueDetailLabel ?? valueColumnLabel;
  const countLabel = countDetailLabel ?? countColumnLabel;

  const showCountColumn = valueFormat === "money";
  const gridCols = showCountColumn
    ? "grid-cols-[auto_1fr_auto_auto_auto]"
    : "grid-cols-[auto_1fr_auto_auto]";

  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm opacity-70">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerRight}
          {selectedSlice ? (
            <div className="flex flex-wrap items-center gap-2 rounded-box border border-base-300 bg-base-200/50 px-3 py-2 text-sm">
              <span className="opacity-70">Currently Viewing</span>
              <span
                className="font-semibold"
                style={{ color: selectedSlice.color }}
              >
                {selectedSlice.name}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={handleClear}
              >
                {clearFilterLabel}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {total <= 0 || slices.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm opacity-60">
          {emptyMessage}
        </div>
      ) : (
        <div
          className={
            layout === "stacked"
              ? "flex flex-col gap-4"
              : "flex flex-col items-center gap-8 lg:flex-row lg:items-stretch lg:justify-center"
          }
          onMouseLeave={clearHover}
        >
          <div
            className={
              layout === "stacked"
                ? "relative mx-auto w-full max-w-[280px] shrink-0"
                : "relative mx-auto w-full max-w-[560px] shrink-0"
            }
          >
            <BreakdownDonut
              slices={slices}
              focusIndex={hoverIndex}
              animate={animate}
              total={total}
              itemCount={itemCount}
              valueFormat={valueFormat}
              centerTotalLabel={centerTotalLabel}
              itemNoun={itemNoun}
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
                      {formatValue(selectedSlice.value, valueFormat)}
                    </div>
                    <div className="mt-0.5 text-xs opacity-70">
                      {pct(selectedSlice.share)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[11px] font-medium uppercase tracking-wide opacity-60">
                      {centerTotalLabel}
                    </div>
                    <div className="mt-1 text-xl font-bold tracking-tight">
                      {formatValue(total, valueFormat)}
                    </div>
                    <div className="mt-0.5 text-xs opacity-70">
                      {itemCount}{" "}
                      {itemCount === 1
                        ? itemNoun.replace(/s$/, "") || itemNoun
                        : itemNoun}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            className={
              layout === "stacked"
                ? "flex w-full min-w-0 flex-col gap-2 border-t border-base-300 pt-3"
                : "flex w-full min-w-0 flex-1 flex-col gap-4 lg:max-w-md"
            }
          >
            <div
              className={`grid ${gridCols} gap-3 px-3 text-[10px] uppercase tracking-wide opacity-50`}
            >
              <span />
              <span>{categoryColumnLabel}</span>
              <span className="text-right">{valueColumnLabel}</span>
              <span className="w-14 text-right">%</span>
              {showCountColumn ? (
                <span className="w-10 text-right">{countColumnLabel}</span>
              ) : null}
            </div>
            <ul className="space-y-1" role="list">
              {slices.map((slice, index) => {
                const hovered = hoverIndex === index;
                const selected = selectedKey === slice.key;
                return (
                  <li key={slice.key}>
                    <button
                      type="button"
                      className={`grid w-full ${gridCols} items-center gap-3 rounded-box px-3 py-2.5 text-left text-sm transition ${
                        hovered || selected
                          ? "bg-base-200"
                          : "hover:bg-base-200/60"
                      }`}
                      style={{
                        borderLeft: `3px solid ${slice.color}`,
                      }}
                      aria-label={`${slice.name}: ${formatValue(slice.value, valueFormat)}, ${pct(slice.share)}. Activate to view details and filter the list.`}
                      aria-pressed={selected}
                      onMouseEnter={() => activate(index)}
                      onFocus={() => activate(index)}
                      onBlur={clearHover}
                      onClick={() => handleSelect(slice.key)}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: slice.color }}
                        aria-hidden
                      />
                      <span className="min-w-0 truncate font-medium">
                        {slice.name}
                      </span>
                      <span className="text-right font-semibold tabular-nums">
                        {formatValue(slice.value, valueFormat)}
                      </span>
                      <span className="w-14 text-right tabular-nums opacity-70">
                        {pct(slice.share)}
                      </span>
                      {showCountColumn ? (
                        <span className="w-10 text-right tabular-nums opacity-70">
                          {slice.count}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            {showDetailsCard && detailsSlice ? (
              <div aria-live="polite">
                <MemoDetailsCard
                  slice={detailsSlice}
                  valueFormat={valueFormat}
                  valueLabel={valueLabel}
                  countLabel={countLabel}
                  className="w-full"
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

/** Build slices from simple name/value rows (count-based status pies). */
export function buildCountDonutSlices(
  data: { name: string; value: number }[],
  colors: Record<string, string>,
  fallbackColor = "#94a3b8",
): DonutBreakdownSlice[] {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((s, d) => s + d.value, 0);
  return filtered.map((d) => ({
    key: d.name,
    name: d.name,
    value: d.value,
    count: d.value,
    share: total > 0 ? (d.value / total) * 100 : null,
    color: colors[d.name] ?? fallbackColor,
  }));
}

/** Build slices from name/value money rows (optional count defaults to 1 per row aggregate). */
export function buildMoneyDonutSlices(
  data: { name: string; value: number; count?: number }[],
  colors: Record<string, string> | ((name: string, index: number) => string),
  fallbackColor = "#94a3b8",
): DonutBreakdownSlice[] {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((s, d) => s + d.value, 0);
  return filtered.map((d, index) => {
    const color =
      typeof colors === "function"
        ? colors(d.name, index)
        : (colors[d.name] ?? fallbackColor);
    const count = d.count ?? 1;
    return {
      key: d.name,
      name: d.name,
      value: d.value,
      count,
      share: total > 0 ? (d.value / total) * 100 : null,
      color,
    };
  });
}
