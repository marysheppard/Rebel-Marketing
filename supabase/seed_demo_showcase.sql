-- =============================================================================
-- Rebel Marketing — Whole-app demo showcase seed (idempotent)
-- =============================================================================
-- Fixed UUID namespace: 99999999-9999-9999-9999-99999999xxxx
-- Separated from live/task IDs (77777777-…) and baseline invoices (55555555-…).
-- Safe to re-run: deletes only this 99999999% showcase range, then inserts.
--
-- ID map (last 4 hex digits of final segment):
--   Invoices aging:     …7701–7710
--   Invoices trend:     …7711–7722  (generate_series m=0..11)
--   Invoices extras:    …7730–7733
--   Payments partials:  …7801–7802
--   Payments trend:     …7811–7822
--   Work entries:       …7901–7904
--   Approvals:          …7951–7953
--
-- Prerequisites:
--   - Demo clients 22222222-…201–208, contracts 33333333-…301–308,
--     campaigns 44444444-… (see seed_cost_dashboard.sql)
--   - Optional: run seed_cost_dashboard.sql first for cost charts
--
-- Covers:
--   - AR aging: Current, 1–30, 31–60, 61–90, 90+ (relative to CURRENT_DATE)
--   - AR trend: invoice + payment in each of the last 12 months
--   - Billing status mix: Draft, Sent, Partially Paid, Overdue, Paid,
--     Disputed, Canceled
--   - Work entries + approvals for ops/billing demos
--   - Portal-pay friendly open invoices on Blue Ridge / Harbor
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Cleanup (showcase IDs only)
-- -----------------------------------------------------------------------------
DELETE FROM public.payments
WHERE id >= '99999999-9999-9999-9999-999999997801'
  AND id <= '99999999-9999-9999-9999-999999997840';

DELETE FROM public.invoices
WHERE id >= '99999999-9999-9999-9999-999999997701'
  AND id <= '99999999-9999-9999-9999-999999997740';

DELETE FROM public.work_entries
WHERE id >= '99999999-9999-9999-9999-999999997901'
  AND id <= '99999999-9999-9999-9999-999999997920';

DELETE FROM public.approvals
WHERE id >= '99999999-9999-9999-9999-999999997951'
  AND id <= '99999999-9999-9999-9999-999999997960';

-- -----------------------------------------------------------------------------
-- Section A — AR aging open invoices (due_date relative to today)
-- -----------------------------------------------------------------------------
INSERT INTO public.invoices (
  id, client_id, contract_id, campaign_id, invoice_number,
  invoice_date, due_date, subtotal, pass_through_amount, tax_amount, total_amount,
  status, disputed, notes
) VALUES
-- Current (not past due)
('99999999-9999-9999-9999-999999997701',
 '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444401',
 'INV-SHOW-CUR-01',
 (CURRENT_DATE - 5), (CURRENT_DATE + 14),
 12000, 0, 0, 12000, 'Sent', false, 'Showcase aging: Current'),
('99999999-9999-9999-9999-999999997702',
 '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333303', '44444444-4444-4444-4444-444444444405',
 'INV-SHOW-CUR-02',
 (CURRENT_DATE - 10), (CURRENT_DATE + 7),
 8000, 500, 0, 8500, 'Partially Paid', false, 'Showcase aging: Current partial'),

-- 1–30 days past due
('99999999-9999-9999-9999-999999997703',
 '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444403',
 'INV-SHOW-130-01',
 (CURRENT_DATE - 40), (CURRENT_DATE - 15),
 9500, 0, 0, 9500, 'Overdue', false, 'Showcase aging: 1-30'),
('99999999-9999-9999-9999-999999997704',
 '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333304', '44444444-4444-4444-4444-444444444407',
 'INV-SHOW-130-02',
 (CURRENT_DATE - 50), (CURRENT_DATE - 22),
 6200, 0, 0, 6200, 'Overdue', false, 'Showcase aging: 1-30'),

-- 31–60
('99999999-9999-9999-9999-999999997705',
 '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333305', '44444444-4444-4444-4444-444444444408',
 'INV-SHOW-3160-01',
 (CURRENT_DATE - 70), (CURRENT_DATE - 45),
 11000, 0, 0, 11000, 'Overdue', false, 'Showcase aging: 31-60'),
('99999999-9999-9999-9999-999999997706',
 '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444410',
 'INV-SHOW-3160-02',
 (CURRENT_DATE - 75), (CURRENT_DATE - 50),
 14000, 0, 0, 14000, 'Partially Paid', false, 'Showcase aging: 31-60 partial'),

-- 61–90
('99999999-9999-9999-9999-999999997707',
 '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333307', '44444444-4444-4444-4444-444444444411',
 'INV-SHOW-6190-01',
 (CURRENT_DATE - 100), (CURRENT_DATE - 75),
 7800, 0, 0, 7800, 'Overdue', false, 'Showcase aging: 61-90'),
('99999999-9999-9999-9999-999999997708',
 '22222222-2222-2222-2222-222222222208', '33333333-3333-3333-3333-333333333308', '44444444-4444-4444-4444-444444444412',
 'INV-SHOW-6190-02',
 (CURRENT_DATE - 105), (CURRENT_DATE - 80),
 15600, 0, 0, 15600, 'Overdue', false, 'Showcase aging: 61-90'),

-- 90+
('99999999-9999-9999-9999-999999997709',
 '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402',
 'INV-SHOW-90P-01',
 (CURRENT_DATE - 150), (CURRENT_DATE - 120),
 18500, 0, 0, 18500, 'Overdue', false, 'Showcase aging: 90+'),
('99999999-9999-9999-9999-999999997710',
 '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333303', '44444444-4444-4444-4444-444444444406',
 'INV-SHOW-90P-02',
 (CURRENT_DATE - 180), (CURRENT_DATE - 150),
 22000, 0, 0, 22000, 'Disputed', true, 'Showcase aging: 90+ disputed');

-- Partial payments for aging partials
INSERT INTO public.payments (
  id, invoice_id, client_id, payment_date, amount, payment_method, reference, notes
) VALUES
('99999999-9999-9999-9999-999999997801',
 '99999999-9999-9999-9999-999999997702', '22222222-2222-2222-2222-222222222203',
 CURRENT_DATE - 3, 3000, 'Credit Card', 'SHOW-CUR-PART', 'Partial on Current showcase'),
('99999999-9999-9999-9999-999999997802',
 '99999999-9999-9999-9999-999999997706', '22222222-2222-2222-2222-222222222206',
 CURRENT_DATE - 40, 5000, 'ACH', 'SHOW-3160-PART', 'Partial on 31-60 showcase');

-- -----------------------------------------------------------------------------
-- Section B — 12-month trend: one paid invoice + cash each month (m = 0..11)
-- invoice_date / payment_date mid-month for last 12 months
-- -----------------------------------------------------------------------------
INSERT INTO public.invoices (
  id, client_id, contract_id, campaign_id, invoice_number,
  invoice_date, due_date, subtotal, pass_through_amount, tax_amount, total_amount,
  status, disputed, notes
)
SELECT
  ('99999999-9999-9999-9999-99999999' || to_char(7711 + g.m, 'FM0000'))::uuid,
  CASE (g.m % 8)
    WHEN 0 THEN '22222222-2222-2222-2222-222222222201'::uuid
    WHEN 1 THEN '22222222-2222-2222-2222-222222222202'::uuid
    WHEN 2 THEN '22222222-2222-2222-2222-222222222203'::uuid
    WHEN 3 THEN '22222222-2222-2222-2222-222222222204'::uuid
    WHEN 4 THEN '22222222-2222-2222-2222-222222222205'::uuid
    WHEN 5 THEN '22222222-2222-2222-2222-222222222206'::uuid
    WHEN 6 THEN '22222222-2222-2222-2222-222222222207'::uuid
    ELSE '22222222-2222-2222-2222-222222222208'::uuid
  END,
  CASE (g.m % 8)
    WHEN 0 THEN '33333333-3333-3333-3333-333333333301'::uuid
    WHEN 1 THEN '33333333-3333-3333-3333-333333333302'::uuid
    WHEN 2 THEN '33333333-3333-3333-3333-333333333303'::uuid
    WHEN 3 THEN '33333333-3333-3333-3333-333333333304'::uuid
    WHEN 4 THEN '33333333-3333-3333-3333-333333333305'::uuid
    WHEN 5 THEN '33333333-3333-3333-3333-333333333306'::uuid
    WHEN 6 THEN '33333333-3333-3333-3333-333333333307'::uuid
    ELSE '33333333-3333-3333-3333-333333333308'::uuid
  END,
  CASE (g.m % 8)
    WHEN 0 THEN '44444444-4444-4444-4444-444444444401'::uuid
    WHEN 1 THEN '44444444-4444-4444-4444-444444444403'::uuid
    WHEN 2 THEN '44444444-4444-4444-4444-444444444405'::uuid
    WHEN 3 THEN '44444444-4444-4444-4444-444444444407'::uuid
    WHEN 4 THEN '44444444-4444-4444-4444-444444444408'::uuid
    WHEN 5 THEN '44444444-4444-4444-4444-444444444410'::uuid
    WHEN 6 THEN '44444444-4444-4444-4444-444444444411'::uuid
    ELSE '44444444-4444-4444-4444-444444444412'::uuid
  END,
  'INV-SHOW-TR-' || lpad((g.m + 1)::text, 2, '0'),
  (date_trunc('month', CURRENT_DATE)::date - (g.m || ' months')::interval)::date + 9,
  (date_trunc('month', CURRENT_DATE)::date - (g.m || ' months')::interval)::date + 39,
  4000 + (g.m * 350),
  0,
  0,
  4000 + (g.m * 350),
  'Paid',
  false,
  'Showcase trend: paid invoice month -' || g.m
FROM generate_series(0, 11) AS g(m);

INSERT INTO public.payments (
  id, invoice_id, client_id, payment_date, amount, payment_method, reference, notes
)
SELECT
  ('99999999-9999-9999-9999-99999999' || to_char(7811 + g.m, 'FM0000'))::uuid,
  ('99999999-9999-9999-9999-99999999' || to_char(7711 + g.m, 'FM0000'))::uuid,
  CASE (g.m % 8)
    WHEN 0 THEN '22222222-2222-2222-2222-222222222201'::uuid
    WHEN 1 THEN '22222222-2222-2222-2222-222222222202'::uuid
    WHEN 2 THEN '22222222-2222-2222-2222-222222222203'::uuid
    WHEN 3 THEN '22222222-2222-2222-2222-222222222204'::uuid
    WHEN 4 THEN '22222222-2222-2222-2222-222222222205'::uuid
    WHEN 5 THEN '22222222-2222-2222-2222-222222222206'::uuid
    WHEN 6 THEN '22222222-2222-2222-2222-222222222207'::uuid
    ELSE '22222222-2222-2222-2222-222222222208'::uuid
  END,
  (date_trunc('month', CURRENT_DATE)::date - (g.m || ' months')::interval)::date + 18,
  4000 + (g.m * 350),
  CASE (g.m % 4)
    WHEN 0 THEN 'ACH'
    WHEN 1 THEN 'Check'
    WHEN 2 THEN 'Credit Card'
    ELSE 'Other'
  END,
  'SHOW-TR-' || lpad((g.m + 1)::text, 2, '0'),
  'Showcase trend cash month -' || g.m
FROM generate_series(0, 11) AS g(m);

-- Extra unpaid Sent invoices mid-window so openAr/overdueAr trend is non-flat
INSERT INTO public.invoices (
  id, client_id, contract_id, campaign_id, invoice_number,
  invoice_date, due_date, subtotal, pass_through_amount, tax_amount, total_amount,
  status, disputed, notes
) VALUES
('99999999-9999-9999-9999-999999997730',
 '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333304', '44444444-4444-4444-4444-444444444416',
 'INV-SHOW-OPEN-01',
 (date_trunc('month', CURRENT_DATE)::date - INTERVAL '2 months')::date + 5,
 (date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 months')::date + 5,
 6700, 0, 0, 6700, 'Sent', false, 'Showcase open AR trend'),
('99999999-9999-9999-9999-999999997731',
 '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333305', '44444444-4444-4444-4444-444444444409',
 'INV-SHOW-OPEN-02',
 (date_trunc('month', CURRENT_DATE)::date - INTERVAL '4 months')::date + 8,
 (date_trunc('month', CURRENT_DATE)::date - INTERVAL '3 months')::date + 8,
 9100, 0, 0, 9100, 'Overdue', false, 'Showcase overdue AR trend');

-- -----------------------------------------------------------------------------
-- Section C — Billing status extras (Draft / Canceled)
-- -----------------------------------------------------------------------------
INSERT INTO public.invoices (
  id, client_id, contract_id, campaign_id, invoice_number,
  invoice_date, due_date, subtotal, pass_through_amount, tax_amount, total_amount,
  status, disputed, notes
) VALUES
('99999999-9999-9999-9999-999999997732',
 '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444401',
 'INV-SHOW-DRAFT-01',
 CURRENT_DATE, CURRENT_DATE + 30,
 4500, 200, 0, 4700, 'Draft', false, 'Showcase billing Draft'),
('99999999-9999-9999-9999-999999997733',
 '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444404',
 'INV-SHOW-CANC-01',
 CURRENT_DATE - 60, CURRENT_DATE - 30,
 3200, 0, 0, 3200, 'Canceled', false, 'Showcase billing Canceled');

-- -----------------------------------------------------------------------------
-- Section D — Work entries (billing review)
-- -----------------------------------------------------------------------------
INSERT INTO public.work_entries (
  id, campaign_id, user_id, work_date, work_type, description, hours,
  billable, approval_status, billed, out_of_scope, retainer_bucket
) VALUES
('99999999-9999-9999-9999-999999997901',
 '44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111104',
 CURRENT_DATE - 3, 'Campaign Management', 'Showcase unbilled approved hours', 6.5,
 true, 'Approved', false, false, 'Included'),
('99999999-9999-9999-9999-999999997902',
 '44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111105',
 CURRENT_DATE - 5, 'Copywriting', 'Showcase pending approval hours', 4.0,
 true, 'Pending', false, false, 'Included'),
('99999999-9999-9999-9999-999999997903',
 '44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111104',
 CURRENT_DATE - 20, 'Ad Creation', 'Showcase already billed hours', 8.0,
 true, 'Approved', true, false, 'Overage'),
('99999999-9999-9999-9999-999999997904',
 '44444444-4444-4444-4444-444444444412', '11111111-1111-1111-1111-111111111105',
 CURRENT_DATE - 2, 'Strategy', 'Showcase non-billable strategy', 2.0,
 false, 'Not Required', false, false, 'Not Applicable');

-- -----------------------------------------------------------------------------
-- Section E — Approvals (customer dashboard)
-- -----------------------------------------------------------------------------
INSERT INTO public.approvals (
  id, campaign_id, client_id, approval_type, description,
  requested_date, approved_date, approval_status, requested_by, approved_by, notes
) VALUES
('99999999-9999-9999-9999-999999997951',
 '44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201',
 'Creative', 'Showcase pending creative for Blue Ridge',
 CURRENT_DATE - 2, NULL, 'Pending',
 '11111111-1111-1111-1111-111111111103', NULL, 'Demo pending approval'),
('99999999-9999-9999-9999-999999997952',
 '44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222203',
 'Media Plan', 'Showcase approved media plan Harbor',
 CURRENT_DATE - 10, CURRENT_DATE - 8, 'Approved',
 '11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111102', 'Demo approved'),
('99999999-9999-9999-9999-999999997953',
 '44444444-4444-4444-4444-444444444408', '22222222-2222-2222-2222-222222222205',
 'Content Calendar', 'Showcase changes requested',
 CURRENT_DATE - 4, NULL, 'Changes Requested',
 '11111111-1111-1111-1111-111111111104', NULL, 'Demo changes requested');

COMMIT;

-- -----------------------------------------------------------------------------
-- Quick verify (run after apply)
-- -----------------------------------------------------------------------------
-- SELECT
--   CASE
--     WHEN due_date >= CURRENT_DATE THEN 'Current'
--     WHEN CURRENT_DATE - due_date <= 30 THEN '1-30'
--     WHEN CURRENT_DATE - due_date <= 60 THEN '31-60'
--     WHEN CURRENT_DATE - due_date <= 90 THEN '61-90'
--     ELSE '90+'
--   END AS bucket,
--   count(*), sum(total_amount)
-- FROM invoices
-- WHERE id::text LIKE '99999999%'
--   AND status NOT IN ('Draft','Canceled','Paid')
-- GROUP BY 1 ORDER BY 1;
--
-- SELECT date_trunc('month', payment_date)::date AS m, sum(amount)
-- FROM payments WHERE id::text LIKE '99999999%'
-- GROUP BY 1 ORDER BY 1;
