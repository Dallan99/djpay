-- Make the storage SELECT gate SECURITY DEFINER so it can use the internal
-- scope helper without exposing that helper to clients.
CREATE OR REPLACE FUNCTION public.dj_pay_can_access_invoice_object(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.dj_pay_invoice_object_scope(p_name) s
    WHERE (
      public.dj_pay_is_invoice_staff()
      AND s.invoice_company_id = public.current_active_company_id()
    ) OR (
      s.invoice_company_id = public.current_active_company_id()
      AND s.invoice_contractor_id = public.current_professional_contractor_id()
      AND public.current_professional_contractor_id() IS NOT NULL
    )
  );
$function$;

-- Internal-only helper: not callable directly by clients.
REVOKE ALL ON FUNCTION public.dj_pay_invoice_object_scope(text) FROM anon, authenticated, PUBLIC;

-- Defensive: keep the client-facing gates off anon/PUBLIC.
REVOKE ALL ON FUNCTION public.dj_pay_can_access_invoice_object(text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.dj_pay_can_insert_invoice_object(text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.dj_pay_can_delete_invoice_object(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.dj_pay_can_access_invoice_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_can_insert_invoice_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_can_delete_invoice_object(text) TO authenticated;