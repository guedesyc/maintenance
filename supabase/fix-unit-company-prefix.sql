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
begin
  if normalized like '%ESCOLA%' or normalized like '%CENTRO MUNICIPAL%' or normalized like '%CENTRO INTEGRADO%' or normalized like '%CENTRO SOCIAL URBANO%' or normalized like '%CENTRO DE EDUCACAO INFANTIL%' or normalized like 'CSU%' or normalized like '%CRECHE%' or normalized like '%COLEGIO%' or normalized like '%E.M.%' or normalized like '%CMEI%' or normalized like '% LP %' or normalized like 'LP %' or normalized like '% LP' then
    return 'LP';
  end if;

  if normalized like '%AROMA%' then
    return 'AS';
  end if;

  raise exception 'Nao foi possivel identificar a empresa da unidade: %', unit_name;
end;
$$;
