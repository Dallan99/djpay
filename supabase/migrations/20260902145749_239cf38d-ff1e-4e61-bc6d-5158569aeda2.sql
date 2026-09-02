-- 1. Role/status vocabulary normalization (non-destructive, accepts legacy values)
CREATE OR REPLACE FUNCTION public.dj_normalize_role(p_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
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
AS $$
  SELECT lower(btrim(coalesce(p_status, ''))) IN ('active', 'ativo');
$$;

CREATE OR REPLACE FUNCTION public.current_active_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.company_id
  FROM public.users AS u
  WHERE u.id = auth.uid()
    AND public.dj_is_active_status(u.status)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.company_id
  FROM public.users AS u
  WHERE u.id = auth.uid()
    AND public.dj_is_active_status(u.status)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.dj_normalize_role(u.role)
  FROM public.users AS u
  WHERE u.id = auth.uid()
    AND public.dj_is_active_status(u.status)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_active_user_has_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS u
    WHERE u.id = auth.uid()
      AND public.dj_is_active_status(u.status)
      AND public.dj_normalize_role(u.role) = ANY (
        SELECT public.dj_normalize_role(r) FROM unnest(allowed_roles) AS r
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_professional_contractor_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id
  FROM public.contractors AS c
  INNER JOIN public.users AS u
    ON u.id = auth.uid()
   AND public.dj_is_active_status(u.status)
   AND public.dj_normalize_role(u.role) = 'professional_pj'
   AND u.company_id = c.company_id
  WHERE c.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.dj_pay_is_invoice_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT public.current_active_user_has_role(ARRAY['administrator', 'finance_hr']);
$$;

GRANT EXECUTE ON FUNCTION public.dj_normalize_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_is_active_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_is_invoice_staff() TO authenticated;

-- 2. invoices: PJ submission + immutability enforcement
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
      NEW.data_pagamento_guard := NULL;
    ELSE
      IF NEW.submitted_by_user_id IS NOT NULL AND NEW.submitted_at IS NULL THEN
        NEW.submitted_at := now();
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
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

DROP TRIGGER IF EXISTS invoices_enforce_submission ON public.invoices;
CREATE TRIGGER invoices_enforce_submission
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.dj_pay_enforce_invoice_submission();

DROP POLICY IF EXISTS invoices_insert_professional_own ON public.invoices;
CREATE POLICY invoices_insert_professional_own
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.current_active_company_id()
  AND contractor_id = public.current_professional_contractor_id()
  AND contractor_id IS NOT NULL
  AND status = 'pending'
  AND submitted_by_user_id = auth.uid()
);

DROP POLICY IF EXISTS invoices_update_professional_attach_file ON public.invoices;
CREATE POLICY invoices_update_professional_attach_file
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  company_id = public.current_active_company_id()
  AND contractor_id = public.current_professional_contractor_id()
  AND status = 'pending'
  AND url_arquivo IS NULL
)
WITH CHECK (
  company_id = public.current_active_company_id()
  AND contractor_id = public.current_professional_contractor_id()
  AND status = 'pending'
  AND url_arquivo IS NOT NULL
);

DROP POLICY IF EXISTS invoices_delete_professional_orphan ON public.invoices;
CREATE POLICY invoices_delete_professional_orphan
ON public.invoices
FOR DELETE
TO authenticated
USING (
  company_id = public.current_active_company_id()
  AND contractor_id = public.current_professional_contractor_id()
  AND status = 'pending'
  AND url_arquivo IS NULL
);

-- 3. Storage helpers (path validation + row existence)
CREATE OR REPLACE FUNCTION public.dj_try_uuid(p_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p_value::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.dj_pay_invoice_object_scope(p_name text)
RETURNS TABLE (invoice_id uuid, invoice_company_id uuid, invoice_contractor_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
  WITH parts AS (
    SELECT storage.foldername(p_name) AS segments
  ), parsed AS (
    SELECT
      public.dj_try_uuid(segments[1]) AS company_id,
      public.dj_try_uuid(segments[2]) AS contractor_id,
      public.dj_try_uuid(segments[3]) AS invoice_id
    FROM parts
    WHERE array_length(segments, 1) = 3
  )
  SELECT i.id, i.company_id, i.contractor_id
  FROM parsed p
  JOIN public.invoices i
    ON i.id = p.invoice_id
   AND i.company_id = p.company_id
   AND i.contractor_id = p.contractor_id
  WHERE p.company_id IS NOT NULL
    AND p.contractor_id IS NOT NULL
    AND p.invoice_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.dj_pay_can_access_invoice_object(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.dj_pay_can_delete_invoice_object(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dj_pay_invoice_object_scope(p_name) s
    WHERE public.dj_pay_is_invoice_staff()
      AND s.invoice_company_id = public.current_active_company_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.dj_try_uuid(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_invoice_object_scope(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_can_access_invoice_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_can_delete_invoice_object(text) TO authenticated;

-- 4. storage.objects policies, restricted to the invoices bucket
DROP POLICY IF EXISTS invoice_files_select ON storage.objects;
CREATE POLICY invoice_files_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND public.dj_pay_can_access_invoice_object(name)
);

DROP POLICY IF EXISTS invoice_files_insert ON storage.objects;
CREATE POLICY invoice_files_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND public.dj_pay_can_access_invoice_object(name)
);

DROP POLICY IF EXISTS invoice_files_delete ON storage.objects;
CREATE POLICY invoice_files_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices'
  AND public.dj_pay_can_delete_invoice_object(name)
);