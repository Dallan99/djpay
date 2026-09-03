-- Bloco 18.3 — geração idempotente de pagamentos de uma competência
-- PREPARADA PARA REVISÃO. NÃO APLICADA. Sem cron. Não altera pagamentos existentes.

-- 1) Metadados de origem (colunas novas, nullable: nenhuma linha existente é alterada)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS source_key text,
  ADD COLUMN IF NOT EXISTS tipo_pagamento_canonico text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND conname = 'payments_tipo_canonico_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_tipo_canonico_check
      CHECK (tipo_pagamento_canonico IS NULL OR tipo_pagamento_canonico IN (
        'monthly_fee','cost_allowance','thirteenth_invoice','paid_vacation',
        'bonus','profit_sharing','commission','award','other'
      ));
  END IF;
END $$;

-- chave determinística única (só para linhas geradas)
CREATE UNIQUE INDEX IF NOT EXISTS payments_source_key_uidx
  ON public.payments (source_key)
  WHERE source_key IS NOT NULL;

-- 2) Mapeamento canônico -> vocabulário legado já aceito pelo CHECK de tipo_pagamento
CREATE OR REPLACE FUNCTION public.dj_pay_canonical_to_legacy_type(p_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_type
    WHEN 'monthly_fee'        THEN 'mensalidade'
    WHEN 'cost_allowance'     THEN 'ajuda_custo'
    WHEN 'thirteenth_invoice' THEN 'decima_terceira_nota'
    WHEN 'paid_vacation'      THEN 'ferias'
    WHEN 'bonus'              THEN 'bonus'
    WHEN 'profit_sharing'     THEN 'plr'
    WHEN 'commission'         THEN 'comissao'
    WHEN 'award'              THEN 'premio'
    ELSE 'outros'
  END;
$$;

-- Mapeamento inverso: tipo de benefício cadastrado -> tipo canônico
CREATE OR REPLACE FUNCTION public.dj_pay_benefit_to_canonical_type(p_tipo text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE lower(btrim(coalesce(p_tipo, '')))
    WHEN 'mensalidade'          THEN 'monthly_fee'
    WHEN 'monthly_fee'          THEN 'monthly_fee'
    WHEN 'ajuda_custo'          THEN 'cost_allowance'
    WHEN 'ajuda_de_custo'       THEN 'cost_allowance'
    WHEN 'cost_allowance'       THEN 'cost_allowance'
    WHEN 'decima_terceira_nota' THEN 'thirteenth_invoice'
    WHEN 'decimo_terceiro'      THEN 'thirteenth_invoice'
    WHEN '13'                   THEN 'thirteenth_invoice'
    WHEN 'thirteenth_invoice'   THEN 'thirteenth_invoice'
    WHEN 'ferias'               THEN 'paid_vacation'
    WHEN 'férias'               THEN 'paid_vacation'
    WHEN 'paid_vacation'        THEN 'paid_vacation'
    WHEN 'bonus'                THEN 'bonus'
    WHEN 'bônus'                THEN 'bonus'
    WHEN 'plr'                  THEN 'profit_sharing'
    WHEN 'profit_sharing'       THEN 'profit_sharing'
    WHEN 'comissao'             THEN 'commission'
    WHEN 'comissão'             THEN 'commission'
    WHEN 'commission'           THEN 'commission'
    WHEN 'premio'               THEN 'award'
    WHEN 'prêmio'               THEN 'award'
    WHEN 'award'                THEN 'award'
    ELSE 'other'
  END;
$$;

-- 3) source_key determinística
--    empresa:profissional:AAAA-MM:tipo_canonico:discriminador
CREATE OR REPLACE FUNCTION public.dj_pay_source_key(
  p_company_id uuid,
  p_contractor_id uuid,
  p_competencia date,
  p_type text,
  p_discriminator text DEFAULT 'contract'
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT concat_ws(':',
    p_company_id::text,
    p_contractor_id::text,
    to_char(date_trunc('month', p_competencia)::date, 'YYYY-MM'),
    p_type,
    coalesce(nullif(btrim(p_discriminator), ''), 'contract')
  );
$$;

-- 4) Geração idempotente da competência
--    Fallbacks aprovados no 18.2:
--      valor mensal      : contractor_financial_contracts.valor_mensal -> contractors.valor_mensal
--      ajuda de custo    : contractor_financial_benefits(cost_allowance).valor
--                          -> contractor_financial_contracts.ajuda_de_custo -> contractors.ajuda_custo
--      vencimento        : dia de contractor_financial_contracts.data_vencimento
--                          -> dia de contractors.data_vencimento -> último dia da competência
--                          (dia > dias do mês é limitado ao último dia do mês)
--      contrato vigente  : status ativo/active e data_inicio <= fim da competência
--                          e (data_encerramento é nula ou >= início da competência)
--      profissional      : contractors.status ativo/active
CREATE OR REPLACE FUNCTION public.dj_pay_generate_competence_payments(
  p_company_id uuid,
  p_competencia date,
  p_dry_run boolean DEFAULT true
)
RETURNS TABLE (
  action text,
  contractor_id uuid,
  tipo_canonico text,
  valor numeric,
  vencimento date,
  source_key text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date := date_trunc('month', p_competencia)::date;
  v_month_end   date := (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date;
BEGIN
  IF p_company_id IS NULL OR p_competencia IS NULL THEN
    RAISE EXCEPTION 'company_id e competencia são obrigatórios';
  END IF;

  CREATE TEMP TABLE _dj_pay_candidates (
    contractor_id uuid NOT NULL,
    tipo_canonico text NOT NULL,
    valor numeric(14,2) NOT NULL,
    vencimento date,
    descricao text,
    source_key text NOT NULL
  ) ON COMMIT DROP;

  WITH ativo AS (
    SELECT c.id AS contractor_id,
           c.valor_mensal        AS c_valor_mensal,
           c.ajuda_custo         AS c_ajuda_custo,
           c.data_vencimento     AS c_data_vencimento
    FROM public.contractors c
    WHERE c.company_id = p_company_id
      AND public.dj_is_active_status(c.status)
  ), contrato AS (
    SELECT DISTINCT ON (fc.contractor_id)
           fc.contractor_id,
           fc.valor_mensal,
           fc.ajuda_de_custo,
           fc.data_vencimento
    FROM public.contractor_financial_contracts fc
    WHERE fc.company_id = p_company_id
      AND public.dj_is_active_status(fc.status)
      AND (fc.data_inicio IS NULL OR fc.data_inicio <= v_month_end)
      AND (fc.data_encerramento IS NULL OR fc.data_encerramento >= v_month_start)
    ORDER BY fc.contractor_id, fc.data_inicio DESC NULLS LAST, fc.created_at DESC
  ), base AS (
    SELECT a.contractor_id,
           coalesce(ct.valor_mensal, a.c_valor_mensal)                        AS valor_mensal,
           coalesce(ct.ajuda_de_custo, a.c_ajuda_custo)                       AS ajuda_custo,
           coalesce(ct.data_vencimento, a.c_data_vencimento)                  AS venc_ref
    FROM ativo a
    LEFT JOIN contrato ct ON ct.contractor_id = a.contractor_id
  ), com_venc AS (
    SELECT b.*,
           CASE
             WHEN b.venc_ref IS NULL THEN v_month_end
             ELSE v_month_start
                  + least(
                      extract(day FROM b.venc_ref)::int,
                      extract(day FROM v_month_end)::int
                    ) - 1
           END AS vencimento
    FROM base b
  )
  INSERT INTO _dj_pay_candidates (contractor_id, tipo_canonico, valor, vencimento, descricao, source_key)
  -- mensalidade a partir do contrato/profissional
  SELECT cv.contractor_id, 'monthly_fee', round(cv.valor_mensal, 2), cv.vencimento,
         public.payment_type_label('mensalidade'),
         public.dj_pay_source_key(p_company_id, cv.contractor_id, v_month_start, 'monthly_fee', 'contract')
  FROM com_venc cv
  WHERE cv.valor_mensal IS NOT NULL AND cv.valor_mensal > 0
  UNION ALL
  -- ajuda de custo pelo fallback de contrato/profissional (quando não há benefício cadastrado)
  SELECT cv.contractor_id, 'cost_allowance', round(cv.ajuda_custo, 2), cv.vencimento,
         public.payment_type_label('ajuda_custo'),
         public.dj_pay_source_key(p_company_id, cv.contractor_id, v_month_start, 'cost_allowance', 'contract')
  FROM com_venc cv
  WHERE cv.ajuda_custo IS NOT NULL AND cv.ajuda_custo > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.contractor_financial_benefits fb
      WHERE fb.company_id = p_company_id
        AND fb.contractor_id = cv.contractor_id
        AND public.dj_is_active_status(fb.status)
        AND public.dj_pay_benefit_to_canonical_type(fb.tipo) = 'cost_allowance'
    )
  UNION ALL
  -- benefícios cadastrados: mensais sempre; demais só no mes_pagamento da competência
  SELECT cv.contractor_id,
         public.dj_pay_benefit_to_canonical_type(fb.tipo),
         round(fb.valor, 2),
         coalesce(fb.data_pagamento, cv.vencimento),
         coalesce(nullif(btrim(fb.descricao_outro), ''),
                  public.payment_type_label(public.dj_pay_canonical_to_legacy_type(
                    public.dj_pay_benefit_to_canonical_type(fb.tipo)))),
         public.dj_pay_source_key(p_company_id, cv.contractor_id, v_month_start,
                                  public.dj_pay_benefit_to_canonical_type(fb.tipo),
                                  'benefit-' || fb.id::text)
  FROM com_venc cv
  JOIN public.contractor_financial_benefits fb
    ON fb.contractor_id = cv.contractor_id
   AND fb.company_id = p_company_id
   AND public.dj_is_active_status(fb.status)
  WHERE fb.valor IS NOT NULL AND fb.valor > 0
    AND (
      lower(btrim(coalesce(fb.periodicidade, ''))) IN ('mensal', 'monthly')
      OR fb.mes_pagamento = extract(month FROM v_month_start)::smallint
      OR (fb.data_pagamento IS NOT NULL
          AND fb.data_pagamento BETWEEN v_month_start AND v_month_end)
    );

  IF p_dry_run THEN
    RETURN QUERY
      SELECT CASE WHEN EXISTS (
               SELECT 1 FROM public.payments p WHERE p.source_key = c.source_key
             ) THEN 'skipped' ELSE 'would_insert' END,
             c.contractor_id, c.tipo_canonico, c.valor, c.vencimento, c.source_key
      FROM _dj_pay_candidates c
      ORDER BY 2, 3;
    RETURN;
  END IF;

  RETURN QUERY
  WITH inserted AS (
    INSERT INTO public.payments (
      company_id, contractor_id, competencia, descricao, valor, vencimento,
      status, tipo_pagamento, tipo_pagamento_canonico, source_key
    )
    SELECT p_company_id, c.contractor_id, v_month_start, c.descricao, c.valor, c.vencimento,
           'pending',
           public.dj_pay_canonical_to_legacy_type(c.tipo_canonico),
           c.tipo_canonico,
           c.source_key
    FROM _dj_pay_candidates c
    ON CONFLICT (source_key) WHERE source_key IS NOT NULL DO NOTHING
    RETURNING payments.contractor_id, payments.tipo_pagamento_canonico, payments.valor,
              payments.vencimento, payments.source_key
  )
  SELECT 'inserted', i.contractor_id, i.tipo_pagamento_canonico, i.valor, i.vencimento, i.source_key
  FROM inserted i
  UNION ALL
  SELECT 'skipped', c.contractor_id, c.tipo_canonico, c.valor, c.vencimento, c.source_key
  FROM _dj_pay_candidates c
  WHERE NOT EXISTS (SELECT 1 FROM inserted i WHERE i.source_key = c.source_key);
END;
$$;

-- 5) Execução restrita a postgres e service_role
REVOKE ALL ON FUNCTION public.dj_pay_generate_competence_payments(uuid, date, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dj_pay_generate_competence_payments(uuid, date, boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_generate_competence_payments(uuid, date, boolean) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.dj_pay_source_key(uuid, uuid, date, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dj_pay_source_key(uuid, uuid, date, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_source_key(uuid, uuid, date, text, text) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.dj_pay_canonical_to_legacy_type(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dj_pay_canonical_to_legacy_type(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_canonical_to_legacy_type(text) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.dj_pay_benefit_to_canonical_type(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dj_pay_benefit_to_canonical_type(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_benefit_to_canonical_type(text) TO postgres, service_role;
