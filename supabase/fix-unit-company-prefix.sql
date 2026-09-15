-- Correcao aditiva para unidades cujo nome comeca pelo numero.
-- Exemplo: "11113 - ESCOLA MUNICIPAL LUIZ ANSELMO".
-- Execute somente no projeto Supabase correto, apos revisar o SQL.

create or replace function public.resolve_unit_prefix(unit_name text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text := public.normalize_text(unit_name);
  unit_code text := (regexp_match(normalized, '^\d+'))[1];
begin
  if unit_code in ('1100', '1300', '1600', '1700') or length(unit_code) >= 5 then
    return 'LP';
  end if;

  if normalized like '%AROMA%' then
    return 'AS';
  end if;

  raise exception 'Nao foi possivel identificar a empresa da unidade: %', unit_name;
end;
$$;
