-- =============================================================================
-- Rebel Marketing — Campaign metrics history backfill (idempotent)
-- =============================================================================
-- Fixed UUID block: aa11aa11-aa11-aa11-aa11-aa11aa11xxxx
-- Fills Sep 2025 – Jun 2026 weekly metrics for campaigns that already have
-- Jul–Aug rows, so Analytics "Portfolio performance by month" is non-zero
-- across the default 12-month window.
--
-- Does NOT modify existing Jul–Aug campaign_metrics (random UUIDs).
-- Safe to re-run: deletes only this aa11… ID range, then inserts.
-- =============================================================================

BEGIN;

DELETE FROM public.campaign_metrics
WHERE id >= 'aa11aa11-aa11-aa11-aa11-aa11aa110001'
  AND id <= 'aa11aa11-aa11-aa11-aa11-aa11aa119999';

INSERT INTO public.campaign_metrics (
  id, campaign_id, metric_date, impressions, clicks, conversions, spend
)
SELECT
  ('aa11aa11-aa11-aa11-aa11-aa11aa11' || to_char(ids.row_n, 'FM0000'))::uuid,
  c.campaign_id,
  (date_trunc('month', DATE '2025-09-01') + (m.month_offset || ' months')::interval)::date
    + (w.day_offset - 1),
  -- impressions ~2k–10k with month/campaign/week variation
  2000 + ((c.idx * 700 + m.month_offset * 180 + w.week_n * 420) % 8000),
  -- clicks ~50–300
  50 + ((c.idx * 23 + m.month_offset * 11 + w.week_n * 17) % 250),
  -- conversions ~5–20
  5 + ((c.idx * 3 + m.month_offset * 2 + w.week_n) % 16),
  -- spend ~70–500
  round((70 + ((c.idx * 37 + m.month_offset * 19 + w.week_n * 29) % 430))::numeric, 2)
FROM (
  VALUES
    (0, '44444444-4444-4444-4444-444444444401'::uuid),
    (1, '44444444-4444-4444-4444-444444444402'::uuid),
    (2, '44444444-4444-4444-4444-444444444403'::uuid),
    (3, '44444444-4444-4444-4444-444444444406'::uuid),
    (4, '44444444-4444-4444-4444-444444444407'::uuid),
    (5, '44444444-4444-4444-4444-444444444408'::uuid),
    (6, '44444444-4444-4444-4444-444444444409'::uuid),
    (7, '44444444-4444-4444-4444-444444444410'::uuid),
    (8, '44444444-4444-4444-4444-444444444411'::uuid),
    (9, '44444444-4444-4444-4444-444444444413'::uuid)
) AS c(idx, campaign_id)
CROSS JOIN generate_series(0, 9) AS m(month_offset)  -- Sep 2025 .. Jun 2026
CROSS JOIN (
  VALUES (1, 1), (2, 8), (3, 15), (4, 22)
) AS w(week_n, day_offset)
CROSS JOIN LATERAL (
  SELECT
    1
    + c.idx
    + m.month_offset * 10
    + (w.week_n - 1) * 100
    AS row_n
) AS ids;

COMMIT;
