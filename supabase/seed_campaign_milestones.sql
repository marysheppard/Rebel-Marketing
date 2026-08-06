-- =============================================================================
-- Rebel Marketing — campaign_milestones seed (upcoming + billing demos)
-- =============================================================================
-- Table must already exist (migration campaign_milestones_table).
-- Safe to re-run: deletes prior demo ids then re-inserts.
-- Upcoming target_date values are relative to CURRENT_DATE.
-- =============================================================================

DELETE FROM public.campaign_milestones
WHERE id::text LIKE 'a1000001-%'
   OR id::text LIKE 'b2000001-%';

-- Blue Ridge Social Always-On (~$18k)
INSERT INTO public.campaign_milestones (
  id, campaign_id, contract_id, sequence, name, recognition_amount,
  target_date, completed_at, approved_at, status, billable, billed, notes
) VALUES
(
  'b2000001-0001-4000-8000-000000000001',
  '44444444-4444-4444-4444-444444444401',
  '33333333-3333-3333-3333-333333333301',
  1, 'Kickoff & audience map', 2700,
  CURRENT_DATE - 45, now() - interval '44 days', now() - interval '43 days',
  'Approved', true, true, 'Billed earlier for recognition demo'
),
(
  'b2000001-0001-4000-8000-000000000002',
  '44444444-4444-4444-4444-444444444401',
  '33333333-3333-3333-3333-333333333301',
  2, 'Creative pack approval', 4500,
  CURRENT_DATE - 5, now() - interval '4 days', now() - interval '2 days',
  'Approved', true, false, 'Ready to invoice on Billing'
),
(
  'b2000001-0001-4000-8000-000000000003',
  '44444444-4444-4444-4444-444444444401',
  '33333333-3333-3333-3333-333333333301',
  3, 'Summer always-on launch', 6300,
  CURRENT_DATE + 10, NULL, NULL,
  'In Progress', true, false, 'Upcoming — in flight'
),
(
  'b2000001-0001-4000-8000-000000000004',
  '44444444-4444-4444-4444-444444444401',
  '33333333-3333-3333-3333-333333333301',
  4, 'Q3 performance wrap', 4500,
  CURRENT_DATE + 40, NULL, NULL,
  'Planned', true, false, 'Upcoming milestone'
);

-- Blue Ridge Local Ads (~$22k)
INSERT INTO public.campaign_milestones (
  id, campaign_id, contract_id, sequence, name, recognition_amount,
  target_date, completed_at, approved_at, status, billable, billed, notes
) VALUES
(
  'b2000001-0001-4000-8000-000000000005',
  '44444444-4444-4444-4444-444444444402',
  '33333333-3333-3333-3333-333333333301',
  1, 'Geo build & tracking', 5500,
  CURRENT_DATE - 20, now() - interval '18 days', now() - interval '17 days',
  'Approved', true, true, ''
),
(
  'b2000001-0001-4000-8000-000000000006',
  '44444444-4444-4444-4444-444444444402',
  '33333333-3333-3333-3333-333333333301',
  2, 'First media flight live', 8800,
  CURRENT_DATE + 7, NULL, NULL,
  'In Progress', true, false, 'Upcoming in ~1 week'
),
(
  'b2000001-0001-4000-8000-000000000007',
  '44444444-4444-4444-4444-444444444402',
  '33333333-3333-3333-3333-333333333301',
  3, 'Optimization milestone', 4400,
  CURRENT_DATE + 28, NULL, NULL,
  'Planned', true, false, 'Upcoming next month'
),
(
  'b2000001-0001-4000-8000-000000000008',
  '44444444-4444-4444-4444-444444444402',
  '33333333-3333-3333-3333-333333333301',
  4, 'Seasonal recap & handoff', 3300,
  CURRENT_DATE + 55, NULL, NULL,
  'Planned', true, false, 'Upcoming end of cycle'
);

-- Summit Rebrand Launch (~$25k)
INSERT INTO public.campaign_milestones (
  id, campaign_id, contract_id, sequence, name, recognition_amount,
  target_date, completed_at, approved_at, status, billable, billed, notes
) VALUES
(
  'b2000001-0001-4000-8000-000000000009',
  '44444444-4444-4444-4444-444444444403',
  '33333333-3333-3333-3333-333333333302',
  1, 'Brand platform approved', 5000,
  CURRENT_DATE - 30, now() - interval '28 days', now() - interval '27 days',
  'Approved', true, false, 'Approved unbilled — Billing Ready'
),
(
  'b2000001-0001-4000-8000-00000000000a',
  '44444444-4444-4444-4444-444444444403',
  '33333333-3333-3333-3333-333333333302',
  2, 'Visual system delivery', 7500,
  CURRENT_DATE + 5, NULL, NULL,
  'In Progress', true, false, 'Upcoming this week'
),
(
  'b2000001-0001-4000-8000-00000000000b',
  '44444444-4444-4444-4444-444444444403',
  '33333333-3333-3333-3333-333333333302',
  3, 'Launch campaign ship', 8750,
  CURRENT_DATE + 21, NULL, NULL,
  'Planned', true, false, 'Upcoming in 3 weeks'
),
(
  'b2000001-0001-4000-8000-00000000000c',
  '44444444-4444-4444-4444-444444444403',
  '33333333-3333-3333-3333-333333333302',
  4, 'Post-launch report', 3750,
  CURRENT_DATE + 50, NULL, NULL,
  'Planned', true, false, 'Upcoming wrap'
);

-- Harbor Content Engine (~$15k)
INSERT INTO public.campaign_milestones (
  id, campaign_id, contract_id, sequence, name, recognition_amount,
  target_date, completed_at, approved_at, status, billable, billed, notes
) VALUES
(
  'b2000001-0001-4000-8000-00000000000d',
  '44444444-4444-4444-4444-444444444406',
  '33333333-3333-3333-3333-333333333303',
  1, 'Editorial calendar lock', 3000,
  CURRENT_DATE + 3, NULL, NULL,
  'In Progress', true, false, 'Upcoming soon'
),
(
  'b2000001-0001-4000-8000-00000000000e',
  '44444444-4444-4444-4444-444444444406',
  '33333333-3333-3333-3333-333333333303',
  2, 'Batch 1 production', 6000,
  CURRENT_DATE + 18, NULL, NULL,
  'Planned', true, false, 'Upcoming'
),
(
  'b2000001-0001-4000-8000-00000000000f',
  '44444444-4444-4444-4444-444444444406',
  '33333333-3333-3333-3333-333333333303',
  3, 'Batch 2 + distribution', 6000,
  CURRENT_DATE + 45, NULL, NULL,
  'Planned', true, false, 'Upcoming later'
);

-- Evergreen Performance Ads (~$55k)
INSERT INTO public.campaign_milestones (
  id, campaign_id, contract_id, sequence, name, recognition_amount,
  target_date, completed_at, approved_at, status, billable, billed, notes
) VALUES
(
  'b2000001-0001-4000-8000-000000000010',
  '44444444-4444-4444-4444-444444444413',
  '33333333-3333-3333-3333-333333333308',
  1, 'Media plan sign-off', 11000,
  CURRENT_DATE - 10, now() - interval '8 days', now() - interval '7 days',
  'Approved', true, false, 'Ready to bill'
),
(
  'b2000001-0001-4000-8000-000000000011',
  '44444444-4444-4444-4444-444444444413',
  '33333333-3333-3333-3333-333333333308',
  2, 'Flight A live', 16500,
  CURRENT_DATE + 14, NULL, NULL,
  'Planned', true, false, 'Upcoming flight'
),
(
  'b2000001-0001-4000-8000-000000000012',
  '44444444-4444-4444-4444-444444444413',
  '33333333-3333-3333-3333-333333333308',
  3, 'Flight B + scale', 16500,
  CURRENT_DATE + 35, NULL, NULL,
  'Planned', true, false, 'Upcoming scale'
),
(
  'b2000001-0001-4000-8000-000000000013',
  '44444444-4444-4444-4444-444444444413',
  '33333333-3333-3333-3333-333333333308',
  4, 'Year-end media recap', 11000,
  CURRENT_DATE + 70, NULL, NULL,
  'Planned', true, false, 'Upcoming recap'
);

-- Harbor Launch Burst (Late): recovery + upcoming wrap
INSERT INTO public.campaign_milestones (
  id, campaign_id, contract_id, sequence, name, recognition_amount,
  target_date, completed_at, approved_at, status, billable, billed, notes
) VALUES
(
  'b2000001-0001-4000-8000-000000000014',
  '44444444-4444-4444-4444-444444444405',
  '33333333-3333-3333-3333-333333333303',
  1, 'Burst concept approved', 15000,
  CURRENT_DATE - 60, now() - interval '55 days', now() - interval '54 days',
  'Approved', true, true, ''
),
(
  'b2000001-0001-4000-8000-000000000015',
  '44444444-4444-4444-4444-444444444405',
  '33333333-3333-3333-3333-333333333303',
  2, 'Burst assets complete', 20000,
  CURRENT_DATE - 14, now() - interval '2 days', NULL,
  'Complete', true, false, 'Awaiting AM approval (was due 2 weeks ago)'
),
(
  'b2000001-0001-4000-8000-000000000016',
  '44444444-4444-4444-4444-444444444405',
  '33333333-3333-3333-3333-333333333303',
  3, 'Recovery wrap & learnings', 15000,
  CURRENT_DATE + 12, NULL, NULL,
  'Planned', true, false, 'Upcoming recovery milestone'
);
