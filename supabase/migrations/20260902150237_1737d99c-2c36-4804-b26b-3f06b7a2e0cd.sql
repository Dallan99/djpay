-- 1. Fix trigger body (remove reference to a non-existent column)
CREATE OR REPLACE FUNCTION public.dj_pay_enforce_invoice_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_staff boolean := public.dj_pay_is_invoice_staff();
  v_contractor uuid := public.current_professional_contractor_id();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_staff THEN
      IF v_contractor IS NULL OR NEW.contractor_id <> v_contractor THEN
        RAISE EXCEPTION 'Você só pode enviar notas fiscais do seu próprio cadastro.';
      END IF;
      NEW.company_id := public.current_active_company_id();
      NEW.status := 'pending';
      NEW.submitted_by_user_id := auth.uid();
      NEW.submitted_at := now();
    ELSE
      IF NEW.submitted_by_user_id IS NOT NULL AND NEW.submitted_at IS NULL THEN
        NEW.submitted_at := now();
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF v_is_staff THEN
    RETURN NEW;
  END IF;

  IF v_contractor IS NULL OR OLD.contractor_id <> v_contractor THEN
    RAISE EXCEPTION 'Sem permissão para alterar esta nota fiscal.';
  END IF;

  IF OLD.status <> 'pending'
     OR OLD.url_arquivo IS NOT NULL
     OR NEW.url_arquivo IS NULL
     OR NEW.status <> OLD.status
     OR NEW.company_id <> OLD.company_id
     OR NEW.contractor_id <> OLD.contractor_id
     OR NEW.valor <> OLD.valor
     OR coalesce(NEW.numero, '') <> coalesce(OLD.numero, '')
     OR NEW.competencia <> OLD.competencia
     OR NEW.payment_id IS DISTINCT FROM OLD.payment_id
     OR NEW.submitted_by_user_id IS DISTINCT FROM OLD.submitted_by_user_id
     OR NEW.data_emissao IS DISTINCT FROM OLD.data_emissao
     OR NEW.data_vencimento IS DISTINCT FROM OLD.data_vencimento
  THEN
    RAISE EXCEPTION 'A nota fiscal é imutável após o envio; só é permitido anexar o arquivo uma única vez.';
  END IF;

  NEW.submitted_at := OLD.submitted_at;
  RETURN NEW;
END;
$$;

-- 2. Immutable helpers get a fixed search_path
CREATE OR REPLACE FUNCTION public.dj_normalize_role(p_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT CASE lower(btrim(coalesce(p_role, '')))
    WHEN 'administrator' THEN 'administrator'
    WHEN 'administrador' THEN 'administrator'
    WHEN 'admin' THEN 'administrator'
    WHEN 'finance_hr' THEN 'finance_hr'
    WHEN 'financeiro_rh' THEN 'finance_hr'
    WHEN 'financeiro/rh' THEN 'finance_hr'
    WHEN 'financeiro' THEN 'finance_hr'
    WHEN 'professional_pj' THEN 'professional_pj'
    WHEN 'profissional_pj' THEN 'professional_pj'
    WHEN 'profissional pj' THEN 'professional_pj'
    WHEN 'pj' THEN 'professional_pj'
    ELSE lower(btrim(coalesce(p_role, '')))
  END;
$$;

CREATE OR REPLACE FUNCTION public.dj_is_active_status(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT lower(btrim(coalesce(p_status, ''))) IN ('active', 'ativo');
$$;

CREATE OR REPLACE FUNCTION public.dj_try_uuid(p_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
BEGIN
  RETURN p_value::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- 3. Do not let anonymous visitors execute the permission helpers
REVOKE EXECUTE ON FUNCTION public.dj_normalize_role(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.dj_is_active_status(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.dj_try_uuid(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.dj_pay_is_invoice_staff() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.dj_pay_invoice_object_scope(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.dj_pay_can_access_invoice_object(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.dj_pay_can_delete_invoice_object(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.dj_pay_enforce_invoice_submission() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.dj_normalize_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_is_active_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_try_uuid(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_is_invoice_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_invoice_object_scope(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_can_access_invoice_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_can_delete_invoice_object(text) TO authenticated;

-- 4. Replace the user_metadata-based policy on contract_benefits
DROP POLICY IF EXISTS "Usuários autorizados acessam benefícios do contrato" ON public.contract_benefits;

CREATE POLICY contract_benefits_access_company_or_own
ON public.contract_benefits
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.contractors c
    WHERE c.id = contract_benefits.contractor_id
      AND c.company_id = contract_benefits.company_id
      AND (
        c.user_id = auth.uid()
        OR (
          c.company_id = public.current_active_company_id()
          AND public.dj_pay_is_invoice_staff()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.contractors c
    WHERE c.id = contract_benefits.contractor_id
      AND c.company_id = contract_benefits.company_id
      AND c.company_id = public.current_active_company_id()
      AND public.dj_pay_is_invoice_staff()
  )
);