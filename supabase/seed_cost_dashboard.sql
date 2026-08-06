-- Cost dashboard demo seed (idempotent via fixed UUIDs).
-- Covers Advertising, Vendor/Freelancer, Employee Labor, Pass-Through
-- across recent months with approved + pending mix for charts/filters.

DELETE FROM public.costs
WHERE id >= '66666666-6666-6666-6666-666666666601'
  AND id <= '66666666-6666-6666-6666-666666666640';

INSERT INTO public.costs (
  id, campaign_id, client_id, cost_type, description, amount, cost_date,
  vendor_name, approved, approval_status, pass_through
) VALUES
-- Advertising Spend (type wins even when pass_through)
('66666666-6666-6666-6666-666666666601', '44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201',
 'Ad spend', 'Q1 always-on Meta boost', 8200, '2026-01-12', 'Meta Ads', true, 'Approved', true),
('66666666-6666-6666-6666-666666666602', '44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222201',
 'Ad spend', 'Google Search local pack', 6400, '2026-02-08', 'Google Ads', true, 'Approved', true),
('66666666-6666-6666-6666-666666666603', '44444444-4444-4444-4444-444444444413', '22222222-2222-2222-2222-222222222208',
 'Ad spend', 'LinkedIn thought-leadership ads', 11800, '2026-04-18', 'LinkedIn Ads', true, 'Approved', true),
('66666666-6666-6666-6666-666666666604', '44444444-4444-4444-4444-444444444411', '22222222-2222-2222-2222-222222222207',
 'Ad spend', 'Festival retargeting (pending)', 7500, '2026-05-22', 'TikTok Ads', false, 'Pending', true),
('66666666-6666-6666-6666-666666666605', '44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222203',
 'Ad spend', 'June launch burst extension', 15500, '2026-06-14', 'ProgrammaticX', true, 'Approved', true),
('66666666-6666-6666-6666-666666666606', '44444444-4444-4444-4444-444444444407', '22222222-2222-2222-2222-222222222204',
 'Ad spend', 'July listings push', 4100, '2026-07-09', 'Meta Ads', true, 'Approved', false),
('66666666-6666-6666-6666-666666666607', '44444444-4444-4444-4444-444444444408', '22222222-2222-2222-2222-222222222205',
 'Ad spend', 'August back-to-school media', 9800, '2026-08-02', 'Google Ads', true, 'Approved', true),

-- Vendor / Freelancer
('66666666-6666-6666-6666-666666666610', '44444444-4444-4444-4444-444444444403', '22222222-2222-2222-2222-222222222202',
 'Vendor/freelancer costs', 'Freelance copywriter sprint', 2800, '2026-01-20', 'Wordsmith Co', true, 'Approved', false),
('66666666-6666-6666-6666-666666666611', '44444444-4444-4444-4444-444444444412', '22222222-2222-2222-2222-222222222208',
 'Production costs', 'Motion graphics package', 7600, '2026-02-25', 'MotionLab', true, 'Approved', false),
('66666666-6666-6666-6666-666666666612', '44444444-4444-4444-4444-444444444406', '22222222-2222-2222-2222-222222222203',
 'Software/tool subscription costs', 'Content calendar SaaS (Q2)', 450, '2026-04-01', 'Planly', true, 'Approved', false),
('66666666-6666-6666-6666-666666666613', '44444444-4444-4444-4444-444444444415', '22222222-2222-2222-2222-222222222203',
 'Vendor/freelancer costs', 'Influencer coordinator (pending)', 3200, '2026-05-05', 'Creator Desk', false, 'Pending', false),
('66666666-6666-6666-6666-666666666614', '44444444-4444-4444-4444-444444444410', '22222222-2222-2222-2222-222222222206',
 'Stock media licensing', 'Stock photo pack for SEO landing pages', 680, '2026-06-03', 'FrameStock', true, 'Approved', false),
('66666666-6666-6666-6666-666666666615', '44444444-4444-4444-4444-444444444404', '22222222-2222-2222-2222-222222222202',
 'Travel expenses', 'On-site membership shoot travel', 1120, '2026-07-18', 'Internal Travel', true, 'Approved', false),
('66666666-6666-6666-6666-666666666616', '44444444-4444-4444-4444-444444444413', '22222222-2222-2222-2222-222222222208',
 'Platform/processing fees', 'Ad platform processing fees', 390, '2026-08-01', 'AdNet Fees', true, 'Approved', false),

-- Employee Labor
('66666666-6666-6666-6666-666666666620', '44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201',
 'Employee labor cost', 'Account management hours — Jan', 2400, '2026-01-31', 'Internal', true, 'Approved', false),
('66666666-6666-6666-6666-666666666621', '44444444-4444-4444-4444-444444444406', '22222222-2222-2222-2222-222222222203',
 'Employee labor cost', 'Content engine staff time — Mar', 3600, '2026-03-28', 'Internal', true, 'Approved', false),
('66666666-6666-6666-6666-666666666622', '44444444-4444-4444-4444-444444444412', '22222222-2222-2222-2222-222222222208',
 'Employee labor cost', 'Creative production labor — May', 4800, '2026-05-30', 'Internal', true, 'Approved', false),
('66666666-6666-6666-6666-666666666623', '44444444-4444-4444-4444-444444444411', '22222222-2222-2222-2222-222222222207',
 'Employee labor cost', 'Festival creative overtime (pending)', 1900, '2026-06-20', 'Internal', false, 'Pending', false),
('66666666-6666-6666-6666-666666666624', '44444444-4444-4444-4444-444444444408', '22222222-2222-2222-2222-222222222205',
 'Employee labor cost', 'Summer drop design hours — Jul', 3100, '2026-07-25', 'Internal', true, 'Approved', false),

-- Reimbursable / Pass-Through (cost_type category)
('66666666-6666-6666-6666-666666666630', '44444444-4444-4444-4444-444444444415', '22222222-2222-2222-2222-222222222203',
 'Other Reimbursable/pass-through expenses', 'Client-approved creator gifts', 2200, '2026-02-14', 'Creator Desk', true, 'Approved', true),
('66666666-6666-6666-6666-666666666631', '44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222203',
 'Other Reimbursable/pass-through expenses', 'Launch event venue deposit', 5500, '2026-03-18', 'VenueHub', true, 'Approved', true),
('66666666-6666-6666-6666-666666666632', '44444444-4444-4444-4444-444444444411', '22222222-2222-2222-2222-222222222207',
 'Other Reimbursable/pass-through expenses', 'Festival booth materials', 1800, '2026-05-08', 'ExpoSupply', false, 'Pending', true),
('66666666-6666-6666-6666-666666666633', '44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222201',
 'Other Reimbursable/pass-through expenses', 'Local print flyers (ready to bill)', 950, '2026-07-12', 'PrintHouse', true, 'Approved', true),
('66666666-6666-6666-6666-666666666634', '44444444-4444-4444-4444-444444444413', '22222222-2222-2222-2222-222222222208',
 'Other Reimbursable/pass-through expenses', 'Client software seats — Aug', 1400, '2026-08-03', 'SaaS Direct', true, 'Approved', true);

-- Draft invoice with pass-through for billing-status approx demo
DELETE FROM public.invoices WHERE id = '66666666-6666-6666-6666-666666666690';

INSERT INTO public.invoices (
  id, client_id, contract_id, campaign_id, invoice_number, status,
  invoice_date, due_date, subtotal, pass_through_amount, tax_amount, total_amount, disputed, notes
)
SELECT
  '66666666-6666-6666-6666-666666666690',
  '22222222-2222-2222-2222-222222222203',
  c.contract_id,
  '44444444-4444-4444-4444-444444444415',
  'INV-DASH-PT-001',
  'Draft',
  CURRENT_DATE - 3,
  CURRENT_DATE + 27,
  2200,
  2200,
  0,
  2200,
  false,
  'Cost dashboard seed: draft pass-through invoice'
FROM public.campaigns c
WHERE c.id = '44444444-4444-4444-4444-444444444415'
LIMIT 1;
