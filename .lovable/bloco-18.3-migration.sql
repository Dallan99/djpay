-- Bloco 18.3 — Geração idempotente de pagamentos da competência
-- REVISADO PARA REVISÃO. NÃO APLICADO. Sem cron. Não altera pagamentos existentes.

-- 1) Amplia o CHECK de tipo_pagamento em public.payments aceitando códigos canônicos sem invalidar legados.
-- Reuse a coluna source_key e o índice criados no Bloco 18.1 (não cria novo índice nem coluna tipo_pagamento_canonico).
DO $$
DECLARE
  v_constraint text;
BEGIN
  FOR v_constraint IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.payments'::regclass 
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%tipo_pagamento%'
  LOOP
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS %I', v_constraint);
  END LOOP;
END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_tipo_pagamento_check
  CHECK (tipo_pagamento IS NULL OR tipo_pagamento IN (
    -- Códigos canônicos
    'monthly_fee', 'cost_allowance', 'thirteenth_invoice', 'paid_vacation',
    'bonus', 'profit_sharing', 'commission', 'award', 'other',
    -- Validação e compatibilidade legada
    'mensalidade', 'ajuda_custo', 'decima_terceira_nota', 'ferias',
    'plr', 'comissao', 'premio', 'outros'
  ));

-- 2) Mapeamento de tipo de benefício em código canônico
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

-- 3) Geração determinística de source_key (reutilizando a convenção do Bloco 18.1)
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

-- 4) Função idempotente para geração de pagamentos da competência sem tabela temporária persistente
CREATE OR REPLACE FUNCTION public.dj_pay_generate_competence_payments(
  p_company_id uuid,
  p_competencia date,
  p_dry_run boolean DEFAULT true
)
RETURNS TABLE (
  action text,
  contractor_id uuid,
  tipo_pagamento text,
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

  IF p_dry_run THEN
    RETURN QUERY
    WITH ativo AS (
      SELECT c.id AS contractor_id,
             c.valor_mensal        AS c_valor_mensal,
             c.data_vencimento     AS c_data_vencimento
      FROM public.contractors c
      WHERE c.company_id = p_company_id
        AND public.dj_is_active_status(c.status)
    ), contrato AS (
      SELECT DISTINCT ON (fc.contractor_id)
             fc.id                 AS contract_id,
             fc.contractor_id,
             fc.valor_mensal,
             fc.data_vencimento
      FROM public.contractor_financial_contracts fc
      WHERE fc.company_id = p_company_id
        AND public.dj_is_active_status(fc.status)
        AND (fc.data_inicio IS NULL OR fc.data_inicio <= v_month_end)
        AND (fc.data_encerramento IS NULL OR fc.data_encerramento >= v_month_start)
      ORDER BY fc.contractor_id, fc.data_inicio DESC NULLS LAST, fc.created_at DESC
    ), base AS (
      SELECT a.contractor_id,
             ct.contract_id,
             coalesce(ct.valor_mensal, a.c_valor_mensal)       AS valor_mensal,
             coalesce(ct.data_vencimento, a.c_data_vencimento) AS venc_ref,
             (ct.contract_id IS NOT NULL)                      AS is_from_contract
      FROM ativo a
      LEFT JOIN contrato ct ON ct.contractor_id = a.contractor_id
    ), com_venc AS (
      SELECT b.*,
             CASE
               WHEN b.venc_ref IS NULL THEN NULL
               ELSE v_month_start
                    + least(
                        extract(day FROM b.venc_ref)::int,
                        extract(day FROM v_month_end)::int
                      ) - 1
             END AS vencimento
      FROM base b
    ), candidates AS (
      -- Mensalidade via contrato (source_key inclui contract_id) ou fallback legado distinto
      SELECT cv.contractor_id,
             'monthly_fee'::text AS tipo_pagamento,
             round(cv.valor_mensal, 2) AS valor,
             cv.vencimento,
             public.payment_type_label('mensalidade') AS descricao,
             public.dj_pay_source_key(
               p_company_id, cv.contractor_id, v_month_start, 'monthly_fee',
               CASE WHEN cv.is_from_contract THEN 'contract-' || cv.contract_id::text ELSE 'legacy-contractor' END
             ) AS source_key
      FROM com_venc cv
      WHERE cv.valor_mensal IS NOT NULL AND cv.valor_mensal > 0

      UNION ALL

      -- Benefícios ativos (suporta contract_benefits e fallback contractor_financial_benefits)
      -- Não gera ajuda de custo de campos legados
      SELECT cv.contractor_id,
             public.dj_pay_benefit_to_canonical_type(fb.tipo) AS tipo_pagamento,
             round(fb.valor, 2) AS valor,
             coalesce(fb.data_pagamento, cv.vencimento) AS vencimento,
             coalesce(
               nullif(btrim(COALESCE(to_jsonb(fb)->>'descricao', to_jsonb(fb)->>'descricao_outro', '')), ''),
               public.payment_type_label(public.dj_pay_benefit_to_canonical_type(fb.tipo))
             ) AS descricao,
             public.dj_pay_source_key(
               p_company_id, cv.contractor_id, v_month_start,
               public.dj_pay_benefit_to_canonical_type(fb.tipo),
               'benefit-' || fb.id::text
             ) AS source_key
      FROM com_venc cv
      JOIN (
        SELECT id, contractor_id, company_id, tipo, valor, status, periodicidade, mes_pagamento, data_pagamento,
               COALESCE(to_jsonb(b)->>'descricao', to_jsonb(b)->>'descricao_outro', '') AS descricao
        FROM public.contractor_financial_benefits b
        WHERE b.company_id = p_company_id
        UNION ALL
        SELECT id, contractor_id, company_id, tipo, valor, status, periodicidade, mes_pagamento, data_pagamento,
               COALESCE(to_jsonb(b)->>'descricao', to_jsonb(b)->>'descricao_outro', '') AS descricao
        FROM public.contract_benefits b
        WHERE b.company_id = p_company_id
          AND NOT EXISTS (
            SELECT 1
            FROM public.contractor_financial_benefits cfb
            WHERE cfb.company_id = b.company_id
              AND cfb.contractor_id = b.contractor_id
              AND public.dj_pay_benefit_to_canonical_type(cfb.tipo) =
                  public.dj_pay_benefit_to_canonical_type(b.tipo)
              AND CASE lower(btrim(coalesce(cfb.periodicidade, '')))
                    WHEN 'mensal' THEN 'monthly'
                    WHEN 'monthly' THEN 'monthly'
                    WHEN 'anual' THEN 'annual'
                    WHEN 'annual' THEN 'annual'
                    WHEN 'trimestral' THEN 'quarterly'
                    WHEN 'quarterly' THEN 'quarterly'
                    WHEN 'semestral' THEN 'semiannual'
                    WHEN 'semiannual' THEN 'semiannual'
                    WHEN 'personalizado' THEN 'custom'
                    WHEN 'personalizada' THEN 'custom'
                    WHEN 'custom' THEN 'custom'
                    ELSE lower(btrim(coalesce(cfb.periodicidade, '')))
                  END =
                  CASE lower(btrim(coalesce(b.periodicidade, '')))
                    WHEN 'mensal' THEN 'monthly'
                    WHEN 'monthly' THEN 'monthly'
                    WHEN 'anual' THEN 'annual'
                    WHEN 'annual' THEN 'annual'
                    WHEN 'trimestral' THEN 'quarterly'
                    WHEN 'quarterly' THEN 'quarterly'
                    WHEN 'semestral' THEN 'semiannual'
                    WHEN 'semiannual' THEN 'semiannual'
                    WHEN 'personalizado' THEN 'custom'
                    WHEN 'personalizada' THEN 'custom'
                    WHEN 'custom' THEN 'custom'
                    ELSE lower(btrim(coalesce(b.periodicidade, '')))
                  END
          )
      ) fb ON fb.contractor_id = cv.contractor_id
          AND fb.company_id = p_company_id
          AND public.dj_is_active_status(fb.status)
      WHERE fb.valor IS NOT NULL AND fb.valor > 0
        AND (
          lower(btrim(coalesce(fb.periodicidade, ''))) IN ('mensal', 'monthly')
          OR fb.mes_pagamento = extract(month FROM v_month_start)::smallint
          OR (fb.data_pagamento IS NOT NULL AND fb.data_pagamento BETWEEN v_month_start AND v_month_end)
        )
    )
    SELECT CASE WHEN EXISTS (
             SELECT 1 FROM public.payments p WHERE p.source_key = c.source_key
           ) THEN 'skipped' ELSE 'would_insert' END AS action,
           c.contractor_id, c.tipo_pagamento, c.valor, c.vencimento, c.source_key
    FROM candidates c
    ORDER BY c.contractor_id, c.tipo_pagamento;

  ELSE

    RETURN QUERY
    WITH ativo AS (
      SELECT c.id AS contractor_id,
             c.valor_mensal        AS c_valor_mensal,
             c.data_vencimento     AS c_data_vencimento
      FROM public.contractors c
      WHERE c.company_id = p_company_id
        AND public.dj_is_active_status(c.status)
    ), contrato AS (
      SELECT DISTINCT ON (fc.contractor_id)
             fc.id                 AS contract_id,
             fc.contractor_id,
             fc.valor_mensal,
             fc.data_vencimento
      FROM public.contractor_financial_contracts fc
      WHERE fc.company_id = p_company_id
        AND public.dj_is_active_status(fc.status)
        AND (fc.data_inicio IS NULL OR fc.data_inicio <= v_month_end)
        AND (fc.data_encerramento IS NULL OR fc.data_encerramento >= v_month_start)
      ORDER BY fc.contractor_id, fc.data_inicio DESC NULLS LAST, fc.created_at DESC
    ), base AS (
      SELECT a.contractor_id,
             ct.contract_id,
             coalesce(ct.valor_mensal, a.c_valor_mensal)       AS valor_mensal,
             coalesce(ct.data_vencimento, a.c_data_vencimento) AS venc_ref,
             (ct.contract_id IS NOT NULL)                      AS is_from_contract
      FROM ativo a
      LEFT JOIN contrato ct ON ct.contractor_id = a.contractor_id
    ), com_venc AS (
      SELECT b.*,
             CASE
               WHEN b.venc_ref IS NULL THEN NULL
               ELSE v_month_start
                    + least(
                        extract(day FROM b.venc_ref)::int,
                        extract(day FROM v_month_end)::int
                      ) - 1
             END AS vencimento
      FROM base b
    ), candidates AS (
      -- Mensalidade via contrato (source_key inclui contract_id) ou fallback legado distinto
      SELECT cv.contractor_id,
             'monthly_fee'::text AS tipo_pagamento,
             round(cv.valor_mensal, 2) AS valor,
             cv.vencimento,
             public.payment_type_label('mensalidade') AS descricao,
             public.dj_pay_source_key(
               p_company_id, cv.contractor_id, v_month_start, 'monthly_fee',
               CASE WHEN cv.is_from_contract THEN 'contract-' || cv.contract_id::text ELSE 'legacy-contractor' END
             ) AS source_key
      FROM com_venc cv
      WHERE cv.valor_mensal IS NOT NULL AND cv.valor_mensal > 0

      UNION ALL

      -- Benefícios ativos (suporta contract_benefits e fallback contractor_financial_benefits)
      -- Não gera ajuda de custo de campos legados
      SELECT cv.contractor_id,
             public.dj_pay_benefit_to_canonical_type(fb.tipo) AS tipo_pagamento,
             round(fb.valor, 2) AS valor,
             coalesce(fb.data_pagamento, cv.vencimento) AS vencimento,
             coalesce(
               nullif(btrim(COALESCE(to_jsonb(fb)->>'descricao', to_jsonb(fb)->>'descricao_outro', '')), ''),
               public.payment_type_label(public.dj_pay_benefit_to_canonical_type(fb.tipo))
             ) AS descricao,
             public.dj_pay_source_key(
               p_company_id, cv.contractor_id, v_month_start,
               public.dj_pay_benefit_to_canonical_type(fb.tipo),
               'benefit-' || fb.id::text
             ) AS source_key
      FROM com_venc cv
      JOIN (
        SELECT id, contractor_id, company_id, tipo, valor, status, periodicidade, mes_pagamento, data_pagamento,
               COALESCE(to_jsonb(b)->>'descricao', to_jsonb(b)->>'descricao_outro', '') AS descricao
        FROM public.contractor_financial_benefits b
        WHERE b.company_id = p_company_id
        UNION ALL
        SELECT id, contractor_id, company_id, tipo, valor, status, periodicidade, mes_pagamento, data_pagamento,
               COALESCE(to_jsonb(b)->>'descricao', to_jsonb(b)->>'descricao_outro', '') AS descricao
        FROM public.contract_benefits b
        WHERE b.company_id = p_company_id
          AND NOT EXISTS (
            SELECT 1
            FROM public.contractor_financial_benefits cfb
            WHERE cfb.company_id = b.company_id
              AND cfb.contractor_id = b.contractor_id
              AND public.dj_pay_benefit_to_canonical_type(cfb.tipo) =
                  public.dj_pay_benefit_to_canonical_type(b.tipo)
              AND CASE lower(btrim(coalesce(cfb.periodicidade, '')))
                    WHEN 'mensal' THEN 'monthly'
                    WHEN 'monthly' THEN 'monthly'
                    WHEN 'anual' THEN 'annual'
                    WHEN 'annual' THEN 'annual'
                    WHEN 'trimestral' THEN 'quarterly'
                    WHEN 'quarterly' THEN 'quarterly'
                    WHEN 'semestral' THEN 'semiannual'
                    WHEN 'semiannual' THEN 'semiannual'
                    WHEN 'personalizado' THEN 'custom'
                    WHEN 'personalizada' THEN 'custom'
                    WHEN 'custom' THEN 'custom'
                    ELSE lower(btrim(coalesce(cfb.periodicidade, '')))
                  END =
                  CASE lower(btrim(coalesce(b.periodicidade, '')))
                    WHEN 'mensal' THEN 'monthly'
                    WHEN 'monthly' THEN 'monthly'
                    WHEN 'anual' THEN 'annual'
                    WHEN 'annual' THEN 'annual'
                    WHEN 'trimestral' THEN 'quarterly'
                    WHEN 'quarterly' THEN 'quarterly'
                    WHEN 'semestral' THEN 'semiannual'
                    WHEN 'semiannual' THEN 'semiannual'
                    WHEN 'personalizado' THEN 'custom'
                    WHEN 'personalizada' THEN 'custom'
                    WHEN 'custom' THEN 'custom'
                    ELSE lower(btrim(coalesce(b.periodicidade, '')))
                  END
          )
      ) fb ON fb.contractor_id = cv.contractor_id
          AND fb.company_id = p_company_id
          AND public.dj_is_active_status(fb.status)
      WHERE fb.valor IS NOT NULL AND fb.valor > 0
        AND (
          lower(btrim(coalesce(fb.periodicidade, ''))) IN ('mensal', 'monthly')
          OR fb.mes_pagamento = extract(month FROM v_month_start)::smallint
          OR (fb.data_pagamento IS NOT NULL AND fb.data_pagamento BETWEEN v_month_start AND v_month_end)
        )
    ), inserted AS (
      INSERT INTO public.payments (
        company_id, contractor_id, competencia, descricao, valor, vencimento,
        status, tipo_pagamento, source_key
      )
      SELECT p_company_id, c.contractor_id, v_month_start, c.descricao, c.valor, c.vencimento,
             'pending',
             c.tipo_pagamento,
             c.source_key
      FROM candidates c
      ON CONFLICT (company_id, source_key) WHERE source_key IS NOT NULL DO NOTHING
      RETURNING payments.contractor_id, payments.tipo_pagamento, payments.valor,
                payments.vencimento, payments.source_key
    )
    SELECT 'inserted'::text AS action, i.contractor_id, i.tipo_pagamento, i.valor, i.vencimento, i.source_key
    FROM inserted i
    UNION ALL
    SELECT 'skipped'::text AS action, c.contractor_id, c.tipo_pagamento, c.valor, c.vencimento, c.source_key
    FROM candidates c
    WHERE NOT EXISTS (SELECT 1 FROM inserted i WHERE i.source_key = c.source_key)
    ORDER BY 2, 3;

  END IF;
END;
$$;

-- 5) Restrição estrita de execução: apenas postgres e service_role
REVOKE ALL ON FUNCTION public.dj_pay_generate_competence_payments(uuid, date, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_generate_competence_payments(uuid, date, boolean) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.dj_pay_source_key(uuid, uuid, date, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_source_key(uuid, uuid, date, text, text) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.dj_pay_benefit_to_canonical_type(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dj_pay_benefit_to_canonical_type(text) TO postgres, service_role;
