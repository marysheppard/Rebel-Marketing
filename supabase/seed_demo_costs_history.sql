-- =============================================================================
-- Rebel Marketing — Costs history backfill (idempotent)
-- =============================================================================
-- Fixed UUID block: bb22bb22-bb22-bb22-bb22-bb22bb22xxxx
-- Fills Aug 2024 – Oct 2025 and Dec 2025 so Costs "Cost Trend Over Time"
-- (default last 24 months) has non-zero months before existing Nov 2025 / 2026 data.
--
-- 5 rows/month: Meta Ad spend + Google/LinkedIn/TikTok Ad spend + vendor +
-- labor + pass-through. Advertising totals are intentionally strong (~$12k–$22k+/mo).
-- Most rows are Approved (chart + filters); ~1/7 stay Pending for filter demos.
--
-- IMPORTANT: trg_force_pending_cost_for_non_agency forces Pending when
-- auth.uid() is not an agency_manager (MCP/SQL seeds have no JWT). Disable that
-- trigger (and the approval-block UPDATE trigger) for this seed only so Approved
-- sticks. Leave sync_cost_approved enabled.
--
-- Does NOT modify Nov 2025 holiday row or 6666… cost dashboard seed.
-- Safe to re-run: deletes only this bb22… ID range, then inserts.
-- =============================================================================

BEGIN;

ALTER TABLE public.costs DISABLE TRIGGER trg_force_pending_cost_for_non_agency;
ALTER TABLE public.costs DISABLE TRIGGER trg_block_non_agency_cost_approval_changes;

DELETE FROM public.costs
WHERE id >= 'bb22bb22-bb22-bb22-bb22-bb22bb220001'
  AND id <= 'bb22bb22-bb22-bb22-bb22-bb22bb229999';

INSERT INTO public.costs (
  id, campaign_id, client_id, cost_type, description, amount, cost_date,
  vendor_name, approved, approval_status, pass_through
)
SELECT
  ('bb22bb22-bb22-bb22-bb22-bb22bb22' || to_char(ids.row_n, 'FM0000'))::uuid,
  camp.campaign_id,
  camp.client_id,
  cat.cost_type,
  CASE
    WHEN cat.cat_idx = 4 THEN
      CASE m.month_offset % 4
        WHEN 0 THEN 'Google Search always-on — '
        WHEN 1 THEN 'LinkedIn thought-leadership ads — '
        WHEN 2 THEN 'TikTok retargeting burst — '
        ELSE 'Programmatic display buy — '
      END || to_char(month_start, 'Mon YYYY')
    ELSE cat.description || ' — ' || to_char(month_start, 'Mon YYYY')
  END,
  round((cat.base_amount + ((m.month_offset * 110 + cat.cat_idx * 370) % 4500))::numeric, 2),
  month_start + (cat.day_offset - 1),
  CASE
    WHEN cat.cat_idx = 4 THEN
      CASE m.month_offset % 4
        WHEN 0 THEN 'Google Ads'
        WHEN 1 THEN 'LinkedIn Ads'
        WHEN 2 THEN 'TikTok Ads'
        ELSE 'ProgrammaticX'
      END
    ELSE cat.vendor_name
  END,
  CASE WHEN (m.month_offset + cat.cat_idx) % 7 = 0 THEN false ELSE true END,
  CASE WHEN (m.month_offset + cat.cat_idx) % 7 = 0 THEN 'Pending' ELSE 'Approved' END,
  cat.pass_through
FROM (
  -- month_offset 0..14 → Aug 2024 .. Oct 2025; then append Dec 2025 as offset 16
  -- (skip 15 = Nov 2025 so existing holiday cost stays alone)
  SELECT month_offset,
    (DATE '2024-08-01' + (month_offset || ' months')::interval)::date AS month_start
  FROM generate_series(0, 14) AS g(month_offset)
  UNION ALL
  SELECT 16 AS month_offset, DATE '2025-12-01' AS month_start
) AS m
CROSS JOIN (
  VALUES
    -- day 7+ so Aug 2024 rows fall inside last_24_months (starts ~Aug 7)
    (0, 'Ad spend'::text, 'Always-on media buy', 7200, 'Meta Ads', false, 7),
    (1, 'Vendor/freelancer costs'::text, 'Freelance creative sprint', 2800, 'Wordsmith Co', false, 8),
    (2, 'Employee labor cost'::text, 'Account management hours', 2400, 'Internal', false, 12),
    (3, 'Other Reimbursable/pass-through expenses'::text, 'Client-billed vendor costs', 3100, 'Vendor Direct', true, 18),
    (4, 'Ad spend'::text, 'Secondary channel media buy', 6500, 'Google Ads', false, 22)
) AS cat(cat_idx, cost_type, description, base_amount, vendor_name, pass_through, day_offset)
CROSS JOIN LATERAL (
  SELECT
    CASE m.month_offset
      WHEN 0 THEN '44444444-4444-4444-4444-444444444401'::uuid  -- Aug 2024
      WHEN 1 THEN '44444444-4444-4444-4444-444444444401'::uuid  -- Sep 2024
      WHEN 2 THEN '44444444-4444-4444-4444-444444444402'::uuid
      WHEN 3 THEN '44444444-4444-4444-4444-444444444403'::uuid
      WHEN 4 THEN '44444444-4444-4444-4444-444444444406'::uuid
      WHEN 5 THEN '44444444-4444-4444-4444-444444444407'::uuid
      WHEN 6 THEN '44444444-4444-4444-4444-444444444408'::uuid
      WHEN 7 THEN '44444444-4444-4444-4444-444444444410'::uuid
      WHEN 8 THEN '44444444-4444-4444-4444-444444444411'::uuid
      WHEN 9 THEN '44444444-4444-4444-4444-444444444412'::uuid
      WHEN 10 THEN '44444444-4444-4444-4444-444444444413'::uuid
      WHEN 11 THEN '44444444-4444-4444-4444-444444444401'::uuid
      WHEN 12 THEN '44444444-4444-4444-4444-444444444403'::uuid
      WHEN 13 THEN '44444444-4444-4444-4444-444444444405'::uuid
      WHEN 14 THEN '44444444-4444-4444-4444-444444444408'::uuid  -- Oct 2025
      ELSE '44444444-4444-4444-4444-444444444406'::uuid  -- Dec 2025
    END AS campaign_id,
    CASE m.month_offset
      WHEN 0 THEN '22222222-2222-2222-2222-222222222201'::uuid  -- Aug 2024
      WHEN 1 THEN '22222222-2222-2222-2222-222222222201'::uuid  -- Sep 2024
      WHEN 2 THEN '22222222-2222-2222-2222-222222222201'::uuid
      WHEN 3 THEN '22222222-2222-2222-2222-222222222202'::uuid
      WHEN 4 THEN '22222222-2222-2222-2222-222222222203'::uuid
      WHEN 5 THEN '22222222-2222-2222-2222-222222222204'::uuid
      WHEN 6 THEN '22222222-2222-2222-2222-222222222205'::uuid
      WHEN 7 THEN '22222222-2222-2222-2222-222222222206'::uuid
      WHEN 8 THEN '22222222-2222-2222-2222-222222222207'::uuid
      WHEN 9 THEN '22222222-2222-2222-2222-222222222208'::uuid
      WHEN 10 THEN '22222222-2222-2222-2222-222222222208'::uuid
      WHEN 11 THEN '22222222-2222-2222-2222-222222222201'::uuid
      WHEN 12 THEN '22222222-2222-2222-2222-222222222202'::uuid
      WHEN 13 THEN '22222222-2222-2222-2222-222222222203'::uuid
      WHEN 14 THEN '22222222-2222-2222-2222-222222222205'::uuid  -- Oct 2025
      ELSE '22222222-2222-2222-2222-222222222203'::uuid
    END AS client_id
) AS camp
CROSS JOIN LATERAL (
  -- 5 rows/month; max row_n = 1+4+16*5 = 85
  SELECT 1 + cat.cat_idx + m.month_offset * 5 AS row_n
) AS ids;

ALTER TABLE public.costs ENABLE TRIGGER trg_force_pending_cost_for_non_agency;
ALTER TABLE public.costs ENABLE TRIGGER trg_block_non_agency_cost_approval_changes;

COMMIT;
