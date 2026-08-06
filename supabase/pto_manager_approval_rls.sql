-- Allow agency_manager and account_manager to approve/reject others' PTO.
-- Requesters may update their own Pending rows but cannot set Approved/Rejected (no self-approve).

DROP POLICY IF EXISTS pto_update ON public.pto_requests;

-- Managers: update others' requests only (never own)
CREATE POLICY pto_update_managers ON public.pto_requests
FOR UPDATE
TO authenticated
USING (
  user_id <> auth.uid()
  AND (
    is_agency_manager()
    OR current_user_role() = 'account_manager'
  )
)
WITH CHECK (
  user_id <> auth.uid()
  AND (
    is_agency_manager()
    OR current_user_role() = 'account_manager'
  )
  AND status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text, 'Canceled'::text])
);

-- Owners: may edit/cancel own Pending requests; cannot set Approved or Rejected
CREATE POLICY pto_update_own ON public.pto_requests
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND status = 'Pending'
)
WITH CHECK (
  user_id = auth.uid()
  AND status = ANY (ARRAY['Pending'::text, 'Canceled'::text])
);
