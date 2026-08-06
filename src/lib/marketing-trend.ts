/** Build readable multi-grain media trend series for Marketing Analytics. */

export type DailyMediaPoint = {
  date: string; // YYYY-MM-DD
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
};

export type MarketingTrendPoint = {
  label: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
};

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function periodSpanDays(start: string | null, end: string | null): number {
  if (!start || !end) return 400;
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  return (
    Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

export function trendGrain(
  start: string | null,
  end: string | null,
): "day" | "week" | "month" {
  const days = periodSpanDays(start, end);
  if (days <= 45) return "day";
  if (days <= 120) return "week";
  return "month";
}

function mondayOf(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

function formatDayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function formatWeekLabel(iso: string) {
  return `W ${formatDayLabel(iso)}`;
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function bucketKey(
  isoDate: string,
  grain: "day" | "week" | "month",
): string {
  if (grain === "day") return isoDate;
  if (grain === "week") return mondayOf(isoDate);
  return isoDate.slice(0, 7);
}

function bucketLabel(key: string, grain: "day" | "week" | "month"): string {
  if (grain === "day") return formatDayLabel(key);
  if (grain === "week") return formatWeekLabel(key);
  return formatMonthLabel(key);
}

export function buildMarketingTrendSeries(
  daily: DailyMediaPoint[],
  rangeStart: string | null,
  rangeEnd: string | null,
): MarketingTrendPoint[] {
  const grain = trendGrain(rangeStart, rangeEnd);
  const map = new Map<
    string,
    {
      impressions: number;
      clicks: number;
      conversions: number;
      spend: number;
    }
  >();

  for (const row of daily) {
    const key = bucketKey(row.date, grain);
    const cur = map.get(key) ?? {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
    };
    cur.impressions += row.impressions;
    cur.clicks += row.clicks;
    cur.conversions += row.conversions;
    cur.spend += row.spend;
    map.set(key, cur);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      label: bucketLabel(key, grain),
      impressions: v.impressions,
      clicks: v.clicks,
      conversions: v.conversions,
      spend: v.spend,
      ctr:
        v.impressions > 0
          ? Math.round((v.clicks / v.impressions) * 10000) / 100
          : 0,
    }));
}
