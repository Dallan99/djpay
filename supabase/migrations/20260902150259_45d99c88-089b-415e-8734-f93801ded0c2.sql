CREATE OR REPLACE FUNCTION public.payment_type_label(payment_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE STRICT
SET search_path TO ''
AS $function$
  select case payment_type
    when 'mensalidade' then 'Mensalidade PJ'
    when 'ajuda_custo' then 'Ajuda de custo'
    when 'decima_terceira_nota' then '13ª Nota'
    when 'ferias' then 'Férias'
    when 'bonus' then 'Bônus'
    when 'plr' then 'PLR'
    when 'reembolso' then 'Reembolso'
    when 'comissao' then 'Comissão'
    when 'premio' then 'Prêmio'
    when 'adiantamento' then 'Adiantamento'
    when 'outros' then 'Outros'
    else 'Outros'
  end;
$function$;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
  END LOOP;
END $$;