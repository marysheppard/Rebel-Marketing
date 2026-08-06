-- =============================================================================
-- Demo cohesion fixes (baseline UPDATEs outside the 8888 fill block)
-- Safe to re-run. Does not touch AR showcase / cost dashboard seeds.
-- =============================================================================

UPDATE public.campaigns
SET campaign_name = 'Lumen Q3 Listings'
WHERE id = '44444444-4444-4444-4444-444444444407'
  AND campaign_name IS DISTINCT FROM 'Lumen Q3 Listings';
