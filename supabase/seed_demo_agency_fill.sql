-- =============================================================================
-- Rebel Marketing — Agency ops / HR demo fill (idempotent)
-- =============================================================================
-- Fixed UUID block: 88888888-8888-8888-8888-88888888xxxx
-- Does NOT touch AR showcase (9999…), costs (6666…), or baseline invoices (5555…).
--
-- IMPORTANT: Only DELETE work_entries in …8901–8920. Never DELETE all rows
-- WHERE id LIKE '88888888%' — live baseline work historically shared the 8888 prefix.
--
-- ID map (last 4 of final segment):
--   PTO:            …8101–8105
--   Change reqs:    …8201–8210  (approvals with client-change types)
--   Time entries:   …8301–8325
--   Campaigns:      …8401–8403
--   Calendar:       …8501–8510
--   Assignments:    …8601–8615
--   Tasks:          …8701–8712
--   Costs:          …8801–8802
--   Clients:        …8211–8212
--   Work entries:   …8901–8908
--
-- Prerequisites: demo clients 2222…201–210, contracts 3333…301+, campaigns 4444…,
--   profiles 1111…103–105 (marketing roster).
-- Companion: seed_demo_cohesion_fixes.sql renames baseline Lumen Q3 Listings.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Cleanup (8888… fill IDs only) — children before parents
-- -----------------------------------------------------------------------------
DELETE FROM public.time_entries
WHERE id >= '88888888-8888-8888-8888-888888888301'
  AND id <= '88888888-8888-8888-8888-888888888325';

DELETE FROM public.work_entries
WHERE id >= '88888888-8888-8888-8888-888888888901'
  AND id <= '88888888-8888-8888-8888-888888888920';

DELETE FROM public.tasks
WHERE id >= '88888888-8888-8888-8888-888888888701'
  AND id <= '88888888-8888-8888-8888-888888888720';

DELETE FROM public.campaign_assignments
WHERE id >= '88888888-8888-8888-8888-888888888601'
  AND id <= '88888888-8888-8888-8888-888888888620';

DELETE FROM public.calendar_events
WHERE id >= '88888888-8888-8888-8888-888888888501'
  AND id <= '88888888-8888-8888-8888-888888888520';

DELETE FROM public.pto_requests
WHERE id >= '88888888-8888-8888-8888-888888888101'
  AND id <= '88888888-8888-8888-8888-888888888120';

DELETE FROM public.approvals
WHERE id >= '88888888-8888-8888-8888-888888888201'
  AND id <= '88888888-8888-8888-8888-888888888220';

DELETE FROM public.costs
WHERE id >= '88888888-8888-8888-8888-888888888801'
  AND id <= '88888888-8888-8888-8888-888888888810';

DELETE FROM public.campaigns
WHERE id >= '88888888-8888-8888-8888-888888888401'
  AND id <= '88888888-8888-8888-8888-888888888410';

DELETE FROM public.clients
WHERE id >= '88888888-8888-8888-8888-888888888211'
  AND id <= '88888888-8888-8888-8888-888888888212';

-- -----------------------------------------------------------------------------
-- Clients — intake funnel statuses
-- -----------------------------------------------------------------------------
INSERT INTO public.clients (
  id, client_name, industry, contact_name, contact_email, contact_phone,
  status, account_manager_id, customer_id, portal_status,
  dba_brand_name, website, city, state,
  contact_first_name, contact_last_name, contact_job_title,
  primary_objective, engagement_type,
  estimated_monthly_marketing_budget, estimated_monthly_advertising_budget,
  requested_services, expected_start_date
) VALUES
(
  '88888888-8888-8888-8888-888888888211',
  'Riverbend Outfitters',
  'Retail / Outdoor',
  'Alex Rivera',
  'alex@riverbend-outfitters.example',
  '555-0142',
  'Intake in Progress',
  '11111111-1111-1111-1111-111111111102',
  'CUST-RIVERBEND',
  'Not Invited',
  'Riverbend',
  'https://riverbend.example',
  'Asheville',
  'NC',
  'Alex',
  'Rivera',
  'Marketing Director',
  'Lead generation',
  'Retainer',
  8000,
  5000,
  ARRAY['Social Media Management', 'Paid Advertising'],
  NULL
),
(
  '88888888-8888-8888-8888-888888888212',
  'Bright Path Nonprofit',
  'Nonprofit',
  'Jordan Lee',
  'jordan@brightpath.example',
  '555-0198',
  'Ready for Contract',
  '11111111-1111-1111-1111-111111111102',
  'CUST-BRIGHTPATH',
  'Not Invited',
  'Bright Path',
  'https://brightpath.example',
  'Charlotte',
  'NC',
  'Jordan',
  'Lee',
  'Development Director',
  'Brand awareness',
  'Project',
  4500,
  2500,
  ARRAY['Brand Strategy', 'Content Marketing'],
  CURRENT_DATE + 21
);

-- -----------------------------------------------------------------------------
-- Campaigns — Planned + Canceled (status pie)
-- -----------------------------------------------------------------------------
INSERT INTO public.campaigns (
  id, client_id, contract_id, campaign_name, campaign_type,
  start_date, end_date, campaign_status, campaign_budget, project_fee,
  description, target_audience
) VALUES
(
  '88888888-8888-8888-8888-888888888401',
  '22222222-2222-2222-2222-222222222201',
  '33333333-3333-3333-3333-333333333301',
  'Blue Ridge Fall Menu Push',
  'Social Media',
  CURRENT_DATE + 14,
  CURRENT_DATE + 75,
  'Planned',
  12000,
  3500,
  'Seasonal menu creative + geo social push (planned). Ties to Always-On budget increase request and the fall moodboard kickoff task.',
  'Local coffee drinkers 25-54'
),
(
  '88888888-8888-8888-8888-888888888402',
  '22222222-2222-2222-2222-222222222202',
  '33333333-3333-3333-3333-333333333302',
  'Summit App Download Test',
  'Advertising',
  CURRENT_DATE - 90,
  CURRENT_DATE - 30,
  'Canceled',
  8000,
  2000,
  'Canceled after soft launch underperformed CPA goal',
  'Fitness app intenders'
),
(
  '88888888-8888-8888-8888-888888888403',
  '22222222-2222-2222-2222-222222222205',
  '33333333-3333-3333-3333-333333333305',
  'Northwind Holiday Teaser',
  'Content',
  CURRENT_DATE + 30,
  CURRENT_DATE + 100,
  'Planned',
  15000,
  4000,
  'Holiday lookbook teaser content calendar',
  'Apparel shoppers 18-40'
);

-- -----------------------------------------------------------------------------
-- Campaign assignments (employee dashboards / time page)
-- Insert only when (campaign_id, user_id) pair is missing
-- -----------------------------------------------------------------------------
INSERT INTO public.campaign_assignments (id, campaign_id, user_id)
SELECT v.id::uuid, v.campaign_id::uuid, v.user_id::uuid
FROM (VALUES
  -- Core fill assignments
  ('88888888-8888-8888-8888-888888888601', '44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111104'),
  ('88888888-8888-8888-8888-888888888602', '44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111105'),
  ('88888888-8888-8888-8888-888888888603', '44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111104'),
  ('88888888-8888-8888-8888-888888888604', '44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111105'),
  ('88888888-8888-8888-8888-888888888605', '44444444-4444-4444-4444-444444444408', '11111111-1111-1111-1111-111111111103'),
  ('88888888-8888-8888-8888-888888888606', '44444444-4444-4444-4444-444444444412', '11111111-1111-1111-1111-111111111104'),
  ('88888888-8888-8888-8888-888888888607', '88888888-8888-8888-8888-888888888401', '11111111-1111-1111-1111-111111111105'),
  ('88888888-8888-8888-8888-888888888608', '44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111103'),
  -- Cohesion: assignees must be on tasked campaigns
  ('88888888-8888-8888-8888-888888888609', '44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111105'), -- Sydney / Summit Rebrand
  ('88888888-8888-8888-8888-888888888610', '44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111105'), -- Sydney / Harbor Content
  ('88888888-8888-8888-8888-888888888611', '44444444-4444-4444-4444-444444444407', '11111111-1111-1111-1111-111111111105'), -- Sydney / Lumen Q3
  ('88888888-8888-8888-8888-888888888612', '44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111104'), -- McKane / Harbor Launch
  ('88888888-8888-8888-8888-888888888613', '44444444-4444-4444-4444-444444444411', '11111111-1111-1111-1111-111111111104'), -- McKane / Pulse Festival
  ('88888888-8888-8888-8888-888888888614', '44444444-4444-4444-4444-444444444410', '11111111-1111-1111-1111-111111111103')  -- Will / Cedar SEO
) AS v(id, campaign_id, user_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.campaign_assignments ca
  WHERE ca.campaign_id = v.campaign_id::uuid AND ca.user_id = v.user_id::uuid
);

-- -----------------------------------------------------------------------------
-- Tasks — status/hours synced to fill time_entries
-- (DB check has no Completed — use Approved for finished work)
-- -----------------------------------------------------------------------------
INSERT INTO public.tasks (
  id, campaign_id, assignee_id, created_by, title, description,
  due_date, status, priority, estimated_hours, actual_hours,
  assigned_date, notes, deliverable_notes, deliverable_url,
  completed_at, submitted_at
) VALUES
('88888888-8888-8888-8888-888888888701',
 '44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111103',
 'Q3 social calendar draft', 'Build August–September organic post calendar for Blue Ridge.',
 CURRENT_DATE + 10, 'In Progress', 'Medium', 6, 9,
 CURRENT_DATE - 2, '', '', '', NULL, NULL),
('88888888-8888-8888-8888-888888888702',
 '44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111103',
 'Landing page hero copy', 'Rewrite Summit membership landing hero + CTAs.',
 CURRENT_DATE + 5, 'In Progress', 'High', 4, 6,
 CURRENT_DATE - 5, 'First draft in Notion', '', '', NULL, NULL),
('88888888-8888-8888-8888-888888888703',
 '44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111102',
 'Paid media QA checklist', 'QA Harbor launch ads across Meta + Google.',
 CURRENT_DATE - 3, 'Submitted', 'Urgent', 3, 6,
 CURRENT_DATE - 8, '', 'Checklist attached in Drive', 'https://example.com/harbor-qa',
 NULL, CURRENT_DATE - 1),
('88888888-8888-8888-8888-888888888704',
 '44444444-4444-4444-4444-444444444408', '11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111103',
 'Product shoot shot list', 'Shot list for Northwind summer drop studio day.',
 CURRENT_DATE + 6, 'Needs Revision', 'High', 5, 6,
 CURRENT_DATE - 12, 'Client wants more lifestyle frames', 'Rev 1 notes', '',
 NULL, CURRENT_DATE - 4),
('88888888-8888-8888-8888-888888888705',
 '44444444-4444-4444-4444-444444444412', '11111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111103',
 'Trust series episode 2 edit', 'Final edit for Evergreen thought-leadership video.',
 CURRENT_DATE - 7, 'Approved', 'Medium', 8, 8.5,
 CURRENT_DATE - 20, '', 'Final cut delivered', 'https://example.com/evergreen-ep2',
 CURRENT_DATE - 6, CURRENT_DATE - 8),
('88888888-8888-8888-8888-888888888706',
 '44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111102',
 'July content package (delivered)', 'Harbor July blog + social package approved and delivered.',
 CURRENT_DATE - 20, 'Approved', 'Low', 10, 6.5,
 CURRENT_DATE - 35, '', 'Approved by AM', '',
 CURRENT_DATE - 18, CURRENT_DATE - 22),
('88888888-8888-8888-8888-888888888707',
 '44444444-4444-4444-4444-444444444410', '11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111102',
 'SEO keyword map update', 'Refresh Cedar Dental keyword clusters for Q3.',
 CURRENT_DATE + 14, 'In Progress', 'Medium', 5, 8,
 CURRENT_DATE - 1, '', '', '', NULL, NULL),
('88888888-8888-8888-8888-888888888708',
 '44444444-4444-4444-4444-444444444411', '11111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111103',
 'Festival booth creative', 'Pulse festival booth banner + flyer set.',
 CURRENT_DATE + 3, 'Submitted', 'High', 6, 8,
 CURRENT_DATE - 6, '', 'Print-ready PDFs', 'https://example.com/pulse-booth',
 NULL, CURRENT_DATE - 1),
('88888888-8888-8888-8888-888888888709',
 '44444444-4444-4444-4444-444444444407', '11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111103',
 'Listing ad variants A/B — Lumen Q3', 'Create 4 Meta variants for Lumen Q3 listings.',
 CURRENT_DATE - 14, 'Approved', 'Medium', 4, 4,
 CURRENT_DATE - 25, '', 'Variants live', '',
 CURRENT_DATE - 12, CURRENT_DATE - 15),
('88888888-8888-8888-8888-888888888710',
 '88888888-8888-8888-8888-888888888401', '11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111103',
 'Fall menu moodboard', 'Kickoff moodboard for planned Blue Ridge fall push.',
 CURRENT_DATE + 21, 'Not Started', 'Low', 3, 0,
 CURRENT_DATE, '', '', '', NULL, NULL);

-- -----------------------------------------------------------------------------
-- Calendar events
-- -----------------------------------------------------------------------------
INSERT INTO public.calendar_events (id, user_id, title, event_date, notes, client_id) VALUES
('88888888-8888-8888-8888-888888888501',
 '11111111-1111-1111-1111-111111111103',
 'Blue Ridge weekly standup', CURRENT_DATE - 2, 'Agenda: social calendar + local ads',
 '22222222-2222-2222-2222-222222222201'),
('88888888-8888-8888-8888-888888888502',
 '11111111-1111-1111-1111-111111111104',
 'Summit creative review', CURRENT_DATE + 1, 'Review membership landing copy',
 '22222222-2222-2222-2222-222222222202'),
('88888888-8888-8888-8888-888888888503',
 '11111111-1111-1111-1111-111111111105',
 'Harbor launch sync', CURRENT_DATE + 3, 'Late campaign recovery plan',
 '22222222-2222-2222-2222-222222222203'),
('88888888-8888-8888-8888-888888888504',
 '11111111-1111-1111-1111-111111111103',
 'Northwind studio shoot', CURRENT_DATE + 7, 'Half-day product shoot (after shot-list due)',
 '22222222-2222-2222-2222-222222222205'),
('88888888-8888-8888-8888-888888888505',
 '11111111-1111-1111-1111-111111111102',
 'Monthly reporting block', CURRENT_DATE + 10, 'Client performance decks',
 NULL),
('88888888-8888-8888-8888-888888888506',
 '11111111-1111-1111-1111-111111111104',
 'Evergreen film day', CURRENT_DATE - 14, 'Trust series episode 2 principal shoot (before final edit approval)',
 '22222222-2222-2222-2222-222222222208'),
('88888888-8888-8888-8888-888888888507',
 '11111111-1111-1111-1111-111111111103',
 'Cedar SEO workshop', CURRENT_DATE + 14, 'Keyword map working session',
 '22222222-2222-2222-2222-222222222206'),
('88888888-8888-8888-8888-888888888508',
 '11111111-1111-1111-1111-111111111103',
 'Bright Path discovery call', CURRENT_DATE + 4, 'Ready-for-contract prospect',
 '88888888-8888-8888-8888-888888888212'),
('88888888-8888-8888-8888-888888888509',
 '11111111-1111-1111-1111-111111111102',
 'Riverbend intake check-in', CURRENT_DATE + 2, 'Intake in progress — services + budget scoping',
 '88888888-8888-8888-8888-888888888211');

-- -----------------------------------------------------------------------------
-- Work entries (billing review — approved unbilled)
-- No rows on Canceled …8402 or moodboard …8710
-- -----------------------------------------------------------------------------
INSERT INTO public.work_entries (
  id, campaign_id, user_id, work_date, work_type, description, hours,
  billable, approval_status, billed, out_of_scope, retainer_bucket, task_id
) VALUES
('88888888-8888-8888-8888-888888888901',
 '44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111104',
 CURRENT_DATE - 4, 'Social Media Posts', 'Organic post batch + scheduling', 5.0,
 true, 'Approved', false, false, 'Included', '88888888-8888-8888-8888-888888888701'),
('88888888-8888-8888-8888-888888888902',
 '44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111105',
 CURRENT_DATE - 3, 'Copywriting', 'Membership landing hero drafts', 3.5,
 true, 'Approved', false, false, 'Included', '88888888-8888-8888-8888-888888888702'),
('88888888-8888-8888-8888-888888888903',
 '44444444-4444-4444-4444-444444444412', '11111111-1111-1111-1111-111111111104',
 CURRENT_DATE - 8, 'Graphic Design', 'Episode 2 thumbnails + lower thirds', 4.0,
 true, 'Approved', false, false, 'Overage', '88888888-8888-8888-8888-888888888705'),
('88888888-8888-8888-8888-888888888904',
 '44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111105',
 CURRENT_DATE - 10, 'Analytics/Reporting', 'July performance narrative', 2.5,
 true, 'Approved', true, false, 'Included', '88888888-8888-8888-8888-888888888706'),
('88888888-8888-8888-8888-888888888905',
 '44444444-4444-4444-4444-444444444408', '11111111-1111-1111-1111-111111111105',
 CURRENT_DATE - 6, 'Ad Creation', 'Shot list prep + mood refs', 3.0,
 true, 'Pending', false, false, 'Included', '88888888-8888-8888-8888-888888888704'),
('88888888-8888-8888-8888-888888888906',
 '44444444-4444-4444-4444-444444444410', '11111111-1111-1111-1111-111111111103',
 CURRENT_DATE - 2, 'Strategy', 'Keyword cluster workshop prep', 2.0,
 true, 'Approved', false, false, 'Included', '88888888-8888-8888-8888-888888888707');

-- -----------------------------------------------------------------------------
-- Time entries (utilization / time page) — hours match task.actual_hours
-- -----------------------------------------------------------------------------
INSERT INTO public.time_entries (
  id, employee_id, task_id, work_entry_id, work_date,
  start_time, end_time, break_minutes, total_hours, description
) VALUES
('88888888-8888-8888-8888-888888888301',
 '11111111-1111-1111-1111-111111111104', '88888888-8888-8888-8888-888888888701', '88888888-8888-8888-8888-888888888901',
 CURRENT_DATE - 4, '09:00', '14:30', 30, 5.0, 'Social calendar drafting'),
('88888888-8888-8888-8888-888888888302',
 '11111111-1111-1111-1111-111111111105', '88888888-8888-8888-8888-888888888702', '88888888-8888-8888-8888-888888888902',
 CURRENT_DATE - 3, '10:00', '13:45', 15, 3.5, 'Landing page copy'),
('88888888-8888-8888-8888-888888888303',
 '11111111-1111-1111-1111-111111111104', '88888888-8888-8888-8888-888888888705', '88888888-8888-8888-8888-888888888903',
 CURRENT_DATE - 8, '09:00', '13:30', 30, 4.0, 'Video edit session'),
('88888888-8888-8888-8888-888888888304',
 '11111111-1111-1111-1111-111111111105', '88888888-8888-8888-8888-888888888706', '88888888-8888-8888-8888-888888888904',
 CURRENT_DATE - 10, '13:00', '15:45', 15, 2.5, 'July reporting'),
('88888888-8888-8888-8888-888888888305',
 '11111111-1111-1111-1111-111111111105', '88888888-8888-8888-8888-888888888704', '88888888-8888-8888-8888-888888888905',
 CURRENT_DATE - 6, '09:30', '12:45', 15, 3.0, 'Shot list + refs'),
('88888888-8888-8888-8888-888888888306',
 '11111111-1111-1111-1111-111111111103', '88888888-8888-8888-8888-888888888707', '88888888-8888-8888-8888-888888888906',
 CURRENT_DATE - 2, '11:00', '13:15', 15, 2.0, 'SEO prep'),
('88888888-8888-8888-8888-888888888307',
 '11111111-1111-1111-1111-111111111104', '88888888-8888-8888-8888-888888888703', NULL,
 CURRENT_DATE - 5, '09:00', '12:00', 0, 3.0, 'Paid media QA'),
('88888888-8888-8888-8888-888888888308',
 '11111111-1111-1111-1111-111111111104', '88888888-8888-8888-8888-888888888708', NULL,
 CURRENT_DATE - 2, '14:00', '18:00', 0, 4.0, 'Festival booth creative'),
('88888888-8888-8888-8888-888888888309',
 '11111111-1111-1111-1111-111111111105', '88888888-8888-8888-8888-888888888709', NULL,
 CURRENT_DATE - 14, '10:00', '14:30', 30, 4.0, 'Listing ad variants'),
('88888888-8888-8888-8888-888888888310',
 '11111111-1111-1111-1111-111111111105', '88888888-8888-8888-8888-888888888702', NULL,
 CURRENT_DATE - 1, '09:00', '11:30', 0, 2.5, 'Copy revisions'),
('88888888-8888-8888-8888-888888888311',
 '11111111-1111-1111-1111-111111111104', '88888888-8888-8888-8888-888888888701', NULL,
 CURRENT_DATE - 1, '13:00', '17:00', 0, 4.0, 'Calendar polish'),
('88888888-8888-8888-8888-888888888312',
 '11111111-1111-1111-1111-111111111103', '88888888-8888-8888-8888-888888888707', NULL,
 CURRENT_DATE - 7, '09:00', '12:30', 30, 3.0, 'Keyword research'),
('88888888-8888-8888-8888-888888888313',
 '11111111-1111-1111-1111-111111111104', '88888888-8888-8888-8888-888888888705', NULL,
 CURRENT_DATE - 9, '10:00', '15:00', 30, 4.5, 'Color grade pass'),
('88888888-8888-8888-8888-888888888314',
 '11111111-1111-1111-1111-111111111105', '88888888-8888-8888-8888-888888888706', NULL,
 CURRENT_DATE - 12, '09:00', '13:00', 0, 4.0, 'Content package build'),
('88888888-8888-8888-8888-888888888315',
 '11111111-1111-1111-1111-111111111103', '88888888-8888-8888-8888-888888888707', NULL,
 CURRENT_DATE - 9, '14:00', '17:00', 0, 3.0, 'Competitor SERP review'),
('88888888-8888-8888-8888-888888888316',
 '11111111-1111-1111-1111-111111111104', '88888888-8888-8888-8888-888888888703', NULL,
 CURRENT_DATE - 4, '15:00', '18:00', 0, 3.0, 'Ad QA follow-ups'),
('88888888-8888-8888-8888-888888888317',
 '11111111-1111-1111-1111-111111111105', '88888888-8888-8888-8888-888888888704', NULL,
 CURRENT_DATE - 8, '09:00', '12:00', 0, 3.0, 'Lifestyle frame concepts'),
('88888888-8888-8888-8888-888888888318',
 '11111111-1111-1111-1111-111111111104', '88888888-8888-8888-8888-888888888708', NULL,
 CURRENT_DATE - 3, '09:00', '13:30', 30, 4.0, 'Booth layout iterations');

-- -----------------------------------------------------------------------------
-- PTO requests
-- -----------------------------------------------------------------------------
INSERT INTO public.pto_requests (id, user_id, start_date, end_date, hours, reason, status) VALUES
('88888888-8888-8888-8888-888888888101',
 '11111111-1111-1111-1111-111111111104',
 CURRENT_DATE + 12, CURRENT_DATE + 14, 24, 'Long weekend trip', 'Pending'),
('88888888-8888-8888-8888-888888888102',
 '11111111-1111-1111-1111-111111111105',
 CURRENT_DATE - 20, CURRENT_DATE - 18, 24, 'Family visit', 'Approved'),
('88888888-8888-8888-8888-888888888103',
 '11111111-1111-1111-1111-111111111103',
 CURRENT_DATE + 5, CURRENT_DATE + 5, 8, 'Personal appointment', 'Pending'),
('88888888-8888-8888-8888-888888888104',
 '11111111-1111-1111-1111-111111111104',
 CURRENT_DATE - 45, CURRENT_DATE - 44, 16, 'Conflict with shoot week — declined', 'Rejected'),
('88888888-8888-8888-8888-888888888105',
 '11111111-1111-1111-1111-111111111105',
 CURRENT_DATE + 30, CURRENT_DATE + 34, 40, 'Early fall PTO', 'Approved');

-- -----------------------------------------------------------------------------
-- Client change-request approvals (+ one Rejected agency-style leftover)
-- -----------------------------------------------------------------------------
INSERT INTO public.approvals (
  id, campaign_id, client_id, approval_type, description,
  requested_date, approved_date, approval_status, requested_by, approved_by, notes
) VALUES
('88888888-8888-8888-8888-888888888201',
 '44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201',
 'Budget Increase', 'Increase always-on social retainer for fall season',
 CURRENT_DATE - 3, NULL, 'Pending',
 '11111111-1111-1111-1111-111111111107', NULL, 'Client change: +$2k/mo media; supports Fall Menu Push'),
('88888888-8888-8888-8888-888888888202',
 '44444444-4444-4444-4444-444444444403', '22222222-2222-2222-2222-222222222202',
 'Strategy / Mix', 'Shift budget from brand to membership conversion',
 CURRENT_DATE - 12, CURRENT_DATE - 9, 'Approved',
 '11111111-1111-1111-1111-111111111108', '11111111-1111-1111-1111-111111111102', 'Client change approved'),
('88888888-8888-8888-8888-888888888203',
 '44444444-4444-4444-4444-444444444408', '22222222-2222-2222-2222-222222222205',
 'Scope Change', 'Add email nurture to summer drop package',
 CURRENT_DATE - 5, NULL, 'Changes Requested',
 '11111111-1111-1111-1111-111111111102', NULL, 'Need revised fee schedule'),
('88888888-8888-8888-8888-888888888204',
 '44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222203',
 'Timeline Change', 'Push Harbor launch creative deadline one week',
 CURRENT_DATE - 2, NULL, 'Pending',
 '11111111-1111-1111-1111-111111111107', NULL, 'Client change: delay start'),
('88888888-8888-8888-8888-888888888205',
 '44444444-4444-4444-4444-444444444408', '22222222-2222-2222-2222-222222222205',
 'Pause / Cancel', 'Pause Northwind Summer Drop during peak retail week',
 CURRENT_DATE - 8, CURRENT_DATE - 6, 'Rejected',
 '11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111101', 'Rejected — keep limited summer-drop work live'),
('88888888-8888-8888-8888-888888888206',
 '44444444-4444-4444-4444-444444444412', '22222222-2222-2222-2222-222222222208',
 'Launch', 'Agency: reject rushed trust-series premiere date',
 CURRENT_DATE - 15, CURRENT_DATE - 14, 'Rejected',
 '11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111101', 'Rejected premiere; film day then final edit delivered later');

-- -----------------------------------------------------------------------------
-- Unapproved costs (+ rush/overtime leftover type)
-- -----------------------------------------------------------------------------
INSERT INTO public.costs (
  id, campaign_id, client_id, cost_type, description, amount, cost_date,
  vendor_name, approved, approval_status, pass_through
) VALUES
('88888888-8888-8888-8888-888888888801',
 '44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222203',
 'Rush/overtime fees', 'Weekend rush edits for Harbor launch recovery', 1850,
 CURRENT_DATE - 4, 'Internal', false, 'Unapproved', false),
('88888888-8888-8888-8888-888888888802',
 '44444444-4444-4444-4444-444444444411', '22222222-2222-2222-2222-222222222207',
 'Other', 'Misc festival permit fee (needs review)', 420,
 CURRENT_DATE - 6, 'City Permits', false, 'Unapproved', true);

COMMIT;
