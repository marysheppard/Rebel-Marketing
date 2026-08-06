-- =============================================================================
-- Rebel Marketing — surgical seed improvements (REVIEW ONLY)
-- =============================================================================
-- Generated for review. NOT applied by the agent.
-- Do NOT run against production until you have read every section.
--
-- Covers audit fixes 1 + 2 + 3 (no full wipe):
--   1) Invoice money/status consistency
--   2) Ad spend pass_through flags cleared
--   3) Remove junk/test clients & related rows
--
-- Rollback: Section 0 creates backup_* tables; Section R restores from them.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Section 0 — Backup affected rows (run this before applying changes)
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS seed_backup;

DROP TABLE IF EXISTS seed_backup.invoices_before CASCADE;
DROP TABLE IF EXISTS seed_backup.costs_ad_pass_through_before CASCADE;
DROP TABLE IF EXISTS seed_backup.junk_client_ids CASCADE;

CREATE TABLE seed_backup.junk_client_ids AS
SELECT id, client_name, customer_id, status, account_manager_id, created_at
FROM public.clients
WHERE id IN (
  '41c4ba77-2ab7-419f-af5f-fb4100618501'::uuid, -- chickfila
  'd7d4a716-f757-4714-a356-524c1cedb5fc'::uuid, -- Harbor Test Works LLC
  '7a91fc6f-78ec-43e1-98c5-4c18425e24b7'::uuid, -- kroger
  'e0e93ab5-6578-46e2-9936-ac8e7b445a82'::uuid  -- Magnolia Coffee
);

CREATE TABLE seed_backup.invoices_before AS
SELECT *
FROM public.invoices
WHERE invoice_number IN ('INV-1003', 'INV-DASH-PT-001');

CREATE TABLE seed_backup.costs_ad_pass_through_before AS
SELECT *
FROM public.costs
WHERE cost_type = 'Ad spend'
  AND pass_through = true;

-- Optional: full snapshot of junk-client dependency trees for restore
DROP TABLE IF EXISTS seed_backup.junk_contracts CASCADE;
CREATE TABLE seed_backup.junk_contracts AS
SELECT * FROM public.contracts
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DROP TABLE IF EXISTS seed_backup.junk_campaigns CASCADE;
CREATE TABLE seed_backup.junk_campaigns AS
SELECT * FROM public.campaigns
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DROP TABLE IF EXISTS seed_backup.junk_signature_requests CASCADE;
CREATE TABLE seed_backup.junk_signature_requests AS
SELECT * FROM public.signature_requests
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DROP TABLE IF EXISTS seed_backup.junk_contract_versions CASCADE;
CREATE TABLE seed_backup.junk_contract_versions AS
SELECT * FROM public.contract_versions
WHERE contract_id IN (SELECT id FROM seed_backup.junk_contracts);

DROP TABLE IF EXISTS seed_backup.junk_contract_signatures CASCADE;
CREATE TABLE seed_backup.junk_contract_signatures AS
SELECT * FROM public.contract_signatures
WHERE contract_id IN (SELECT id FROM seed_backup.junk_contracts);

DROP TABLE IF EXISTS seed_backup.junk_client_portal_access CASCADE;
CREATE TABLE seed_backup.junk_client_portal_access AS
SELECT * FROM public.client_portal_access
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DROP TABLE IF EXISTS seed_backup.junk_portal_notifications CASCADE;
CREATE TABLE seed_backup.junk_portal_notifications AS
SELECT * FROM public.portal_notifications
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DROP TABLE IF EXISTS seed_backup.junk_portal_sessions CASCADE;
CREATE TABLE seed_backup.junk_portal_sessions AS
SELECT * FROM public.portal_sessions
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DROP TABLE IF EXISTS seed_backup.junk_dashboard_activations CASCADE;
CREATE TABLE seed_backup.junk_dashboard_activations AS
SELECT * FROM public.dashboard_activations
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DROP TABLE IF EXISTS seed_backup.junk_clients CASCADE;
CREATE TABLE seed_backup.junk_clients AS
SELECT * FROM public.clients
WHERE id IN (SELECT id FROM seed_backup.junk_client_ids);

-- -----------------------------------------------------------------------------
-- Section 1 — P0 invoice fixes
-- -----------------------------------------------------------------------------
-- INV-1003: has $5,000 paid of $12,500 but status Overdue → Partially Paid
UPDATE public.invoices
SET status = 'Partially Paid'
WHERE id = '55555555-5555-5555-5555-555555555503'::uuid
  AND invoice_number = 'INV-1003';

-- INV-DASH-PT-001: subtotal and pass_through both 2200 with total 2200 (double-count).
-- Treat as pure pass-through draft: subtotal 0 + PT 2200 + tax 0 = total 2200.
UPDATE public.invoices
SET
  subtotal = 0,
  pass_through_amount = 2200,
  tax_amount = 0,
  total_amount = 2200
WHERE id = '66666666-6666-6666-6666-666666666690'::uuid
  AND invoice_number = 'INV-DASH-PT-001';

-- -----------------------------------------------------------------------------
-- Section 2 — Ad spend must not carry pass_through=true
-- (category charts use cost_type; billing filters use the boolean)
-- -----------------------------------------------------------------------------
UPDATE public.costs
SET pass_through = false
WHERE cost_type = 'Ad spend'
  AND pass_through = true
  AND id IN (
    '66666666-6666-6666-6666-666666666601'::uuid,
    '66666666-6666-6666-6666-666666666602'::uuid,
    '66666666-6666-6666-6666-666666666603'::uuid,
    '66666666-6666-6666-6666-666666666604'::uuid,
    '66666666-6666-6666-6666-666666666605'::uuid,
    '66666666-6666-6666-6666-666666666607'::uuid,
    'e827c4ac-e3ea-4eb5-a59f-895118cf99c8'::uuid,
    'a79da71f-b273-4a63-a2c8-921a7443e50d'::uuid,
    '6ac4796a-5a02-4474-9c83-0fd077c50ca9'::uuid,
    '6b95689d-999b-4cc3-a888-73c254b0eda3'::uuid,
    '584ad32c-c5cb-489f-884a-9f7d9d9bd90b'::uuid,
    '0e5ee937-cf39-420a-a442-73fb306f8071'::uuid,
    'fa66cdcf-2d94-4451-b10f-68325d38f367'::uuid
  );

-- -----------------------------------------------------------------------------
-- Section 3 — Remove junk / test clients (FK-safe order)
-- Targets: chickfila, kroger, Magnolia Coffee, Harbor Test Works LLC
-- -----------------------------------------------------------------------------
-- Child tables first
DELETE FROM public.portal_sessions
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DELETE FROM public.portal_notifications
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DELETE FROM public.dashboard_activations
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DELETE FROM public.client_portal_access
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DELETE FROM public.contract_signatures
WHERE contract_id IN (SELECT id FROM seed_backup.junk_contracts);

DELETE FROM public.signature_requests
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DELETE FROM public.contract_versions
WHERE contract_id IN (SELECT id FROM seed_backup.junk_contracts);

-- Magnolia engagement campaign (only campaign under junk clients)
DELETE FROM public.campaign_assignments
WHERE campaign_id = '83a85f64-96f5-4a39-8653-665c34da4b64'::uuid;

DELETE FROM public.campaign_metrics
WHERE campaign_id = '83a85f64-96f5-4a39-8653-665c34da4b64'::uuid;

DELETE FROM public.tasks
WHERE campaign_id = '83a85f64-96f5-4a39-8653-665c34da4b64'::uuid;

DELETE FROM public.work_entries
WHERE campaign_id = '83a85f64-96f5-4a39-8653-665c34da4b64'::uuid;

DELETE FROM public.costs
WHERE campaign_id = '83a85f64-96f5-4a39-8653-665c34da4b64'::uuid
   OR client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DELETE FROM public.approvals
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DELETE FROM public.campaigns
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DELETE FROM public.contracts
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DELETE FROM public.client_user_links
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DELETE FROM public.control_exceptions
WHERE client_id IN (SELECT id FROM seed_backup.junk_client_ids);

DELETE FROM public.clients
WHERE id IN (SELECT id FROM seed_backup.junk_client_ids);

-- -----------------------------------------------------------------------------
-- Section V — Verification (read-only checks; safe inside transaction)
-- -----------------------------------------------------------------------------
-- Expect: INV-1003 → Partially Paid
-- Expect: INV-DASH-PT-001 → subtotal 0, pt 2200, total 2200
-- Expect: 0 Ad spend rows with pass_through true
-- Expect: 0 junk clients remaining

-- Uncomment to inspect before commit:
-- SELECT invoice_number, status, subtotal, pass_through_amount, total_amount
-- FROM public.invoices
-- WHERE invoice_number IN ('INV-1003', 'INV-DASH-PT-001');
--
-- SELECT count(*) AS ad_with_pt
-- FROM public.costs WHERE cost_type = 'Ad spend' AND pass_through;
--
-- SELECT client_name FROM public.clients
-- WHERE client_name ILIKE ANY (ARRAY['%kroger%','%chickfila%','%Magnolia%','%Harbor Test%']);

COMMIT;

-- =============================================================================
-- Section R — ROLLBACK (run separately ONLY if you need to undo after commit)
-- =============================================================================
-- WARNING: Re-inserting deleted junk rows may fail if IDs collide or schema
-- evolved. Prefer restoring from seed_backup only when backups still exist.
--
-- BEGIN;
--
-- -- Restore invoice fixes
-- UPDATE public.invoices i
-- SET
--   status = b.status,
--   subtotal = b.subtotal,
--   pass_through_amount = b.pass_through_amount,
--   tax_amount = b.tax_amount,
--   total_amount = b.total_amount
-- FROM seed_backup.invoices_before b
-- WHERE i.id = b.id;
--
-- -- Restore Ad spend pass_through flags
-- UPDATE public.costs c
-- SET pass_through = b.pass_through
-- FROM seed_backup.costs_ad_pass_through_before b
-- WHERE c.id = b.id;
--
-- -- Restore junk clients and children (order: parents → children)
-- INSERT INTO public.clients SELECT * FROM seed_backup.junk_clients
-- ON CONFLICT (id) DO NOTHING;
-- INSERT INTO public.contracts SELECT * FROM seed_backup.junk_contracts
-- ON CONFLICT (id) DO NOTHING;
-- INSERT INTO public.campaigns SELECT * FROM seed_backup.junk_campaigns
-- ON CONFLICT (id) DO NOTHING;
-- INSERT INTO public.contract_versions SELECT * FROM seed_backup.junk_contract_versions
-- ON CONFLICT (id) DO NOTHING;
-- INSERT INTO public.signature_requests SELECT * FROM seed_backup.junk_signature_requests
-- ON CONFLICT (id) DO NOTHING;
-- INSERT INTO public.contract_signatures SELECT * FROM seed_backup.junk_contract_signatures
-- ON CONFLICT (id) DO NOTHING;
-- INSERT INTO public.client_portal_access SELECT * FROM seed_backup.junk_client_portal_access
-- ON CONFLICT (id) DO NOTHING;
-- INSERT INTO public.portal_notifications SELECT * FROM seed_backup.junk_portal_notifications
-- ON CONFLICT (id) DO NOTHING;
-- INSERT INTO public.portal_sessions SELECT * FROM seed_backup.junk_portal_sessions
-- ON CONFLICT (id) DO NOTHING;
-- INSERT INTO public.dashboard_activations SELECT * FROM seed_backup.junk_dashboard_activations
-- ON CONFLICT (id) DO NOTHING;
--
-- COMMIT;
--
-- To discard backups later:
-- DROP SCHEMA seed_backup CASCADE;
