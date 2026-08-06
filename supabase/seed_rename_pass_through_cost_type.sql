-- =============================================================================
-- Rename cost_type: Reimbursable/pass-through expenses
--           → Other Reimbursable/pass-through expenses
-- Safe to re-run. Widens check → updates rows → tightens check.
-- =============================================================================

ALTER TABLE public.costs DROP CONSTRAINT IF EXISTS costs_cost_type_check;

ALTER TABLE public.costs ADD CONSTRAINT costs_cost_type_check CHECK (
  cost_type = ANY (ARRAY[
    'Ad spend'::text,
    'Vendor/freelancer costs'::text,
    'Employee labor cost'::text,
    'Other Reimbursable/pass-through expenses'::text,
    'Reimbursable/pass-through expenses'::text,
    'Software/tool subscription costs'::text,
    'Stock media licensing'::text,
    'Production costs'::text,
    'Travel expenses'::text,
    'Rush/overtime fees'::text,
    'Platform/processing fees'::text,
    'Other'::text
  ])
);

UPDATE public.costs
SET cost_type = 'Other Reimbursable/pass-through expenses'
WHERE cost_type = 'Reimbursable/pass-through expenses';

ALTER TABLE public.costs DROP CONSTRAINT IF EXISTS costs_cost_type_check;

ALTER TABLE public.costs ADD CONSTRAINT costs_cost_type_check CHECK (
  cost_type = ANY (ARRAY[
    'Ad spend'::text,
    'Vendor/freelancer costs'::text,
    'Employee labor cost'::text,
    'Other Reimbursable/pass-through expenses'::text,
    'Software/tool subscription costs'::text,
    'Stock media licensing'::text,
    'Production costs'::text,
    'Travel expenses'::text,
    'Rush/overtime fees'::text,
    'Platform/processing fees'::text,
    'Other'::text
  ])
);
