-- Migração aditiva para incluir o tipo COMODATO.
-- Execute no projeto Supabase correto. Não apaga dados existentes.

alter table public.cadastro_itens
  add column if not exists tipo_patrimonio text;

alter table public.cadastro_itens
  add column if not exists sem_patrimonio boolean not null default false;

alter table public.cadastro_itens
  drop constraint if exists cadastro_itens_cliente_patrimonio_check;
alter table public.cadastro_itens
  add constraint cadastro_itens_cliente_patrimonio_check
  check (equipamento_cliente = false or sem_patrimonio or nullif(trim(patrimonio_cliente), '') is not null);

alter table public.patrimonios
  add column if not exists tipo_patrimonio text;

update public.cadastro_itens
set tipo_patrimonio = case when equipamento_cliente then 'CLIENTE' else 'PROPRIO' end
where tipo_patrimonio is null;

update public.patrimonios
set tipo_patrimonio = case when equipamento_cliente then 'CLIENTE' else 'PROPRIO' end
where tipo_patrimonio is null;

alter table public.cadastro_itens
  drop constraint if exists cadastro_itens_tipo_patrimonio_check;
alter table public.cadastro_itens
  add constraint cadastro_itens_tipo_patrimonio_check
  check (tipo_patrimonio is null or tipo_patrimonio in ('PROPRIO', 'CLIENTE', 'COMODATO'));

alter table public.patrimonios
  drop constraint if exists patrimonios_tipo_patrimonio_check;
alter table public.patrimonios
  add constraint patrimonios_tipo_patrimonio_check
  check (tipo_patrimonio is null or tipo_patrimonio in ('PROPRIO', 'CLIENTE', 'COMODATO'));

create or replace function public.format_external_patrimonio(
  unit_name text,
  raw_patrimonio text,
  prefix_value text
)
returns text
language plpgsql
immutable
as $$
declare
  unit_number text := public.extract_unit_number(unit_name);
  clean_value text := trim(coalesce(raw_patrimonio, ''));
  digits_value text;
  normalized_prefix text := upper(trim(prefix_value));
begin
  if unit_number is null then
    raise exception 'Nao foi possivel identificar o numero da unidade: %', unit_name;
  end if;
  if normalized_prefix not in ('CL', 'CM') then
    raise exception 'Prefixo de patrimonio invalido.';
  end if;
  if clean_value = '' then
    raise exception 'Informe o numero do patrimonio.';
  end if;
  if public.normalize_text(clean_value) like (normalized_prefix || '%/%') then
    return clean_value;
  end if;
  digits_value := regexp_replace(clean_value, '\D', '', 'g');
  if digits_value <> '' then
    clean_value := lpad(digits_value, 6, '0');
  end if;
  return normalized_prefix || unit_number || '/' || clean_value;
end;
$$;

create or replace function public.format_customer_patrimonio(unit_name text, raw_patrimonio text)
returns text
language sql
immutable
as $$
  select public.format_external_patrimonio(unit_name, raw_patrimonio, 'CL');
$$;

create or replace function public.generate_pending_patrimonios()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_item record;
  current_prefix text;
  current_unit_number text;
  next_number integer;
  inserted_count integer := 0;
begin
  lock table public.patrimonios in exclusive mode;
  for pending_item in
    select ci.*, c.unidade_nome
    from public.cadastro_itens ci
    join public.cadastros c on c.id = ci.cadastro_id
    left join public.patrimonios p on p.cadastro_item_id = ci.id
    where coalesce(ci.tipo_patrimonio, case when ci.equipamento_cliente then 'CLIENTE' else 'PROPRIO' end) = 'PROPRIO'
      and p.id is null
      and not coalesce(ci.sem_patrimonio, false)
    order by ci.created_at, ci.id
  loop
    current_prefix := public.resolve_unit_prefix(pending_item.unidade_nome);
    current_unit_number := public.extract_unit_number(pending_item.unidade_nome);
    if current_unit_number is null then
      raise exception 'Nao foi possivel identificar o numero da unidade: %', pending_item.unidade_nome;
    end if;
    select coalesce(max(numero_patrimonio), 0) + 1 into next_number
    from public.patrimonios where prefixo_patrimonio = current_prefix;
    if next_number > 999999 then
      raise exception 'Limite de patrimonio atingido para %.', current_prefix;
    end if;
    insert into public.patrimonios (
      cadastro_id, cadastro_item_id, equipamento_id, equipamento_nome,
      prefixo_patrimonio, numero_patrimonio, patrimonio_codigo, status,
      sigla_equipamento, equipamento_cliente, tipo_patrimonio
    ) values (
      pending_item.cadastro_id, pending_item.id, pending_item.equipamento_id,
      pending_item.equipamento_nome, current_prefix, next_number,
      public.format_patrimonio(current_prefix, current_unit_number, next_number),
      pending_item.status, pending_item.sigla_equipamento, false, 'PROPRIO'
    );
    inserted_count := inserted_count + 1;
  end loop;
  return jsonb_build_object('generated', inserted_count);
end;
$$;

create or replace function public.create_registration(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_request_id uuid := (payload->>'request_id')::uuid;
  requested_unidade_id uuid := (payload->>'unidade_id')::uuid;
  current_unit public.unidades%rowtype;
  existing_cadastro public.cadastros%rowtype;
  cadastro_row public.cadastros%rowtype;
  equipment_item jsonb;
  current_equipment public.equipamentos_catalogo%rowtype;
  item_row public.cadastro_itens%rowtype;
  inserted_item public.patrimonios%rowtype;
  item_name text;
  item_is_manual boolean;
  item_type text;
  item_has_no_patrimonio boolean;
  customer_patrimonio text;
  inserted_patrimonio_id uuid;
  inserted_numero_patrimonio integer;
  inserted_patrimonio_codigo text;
  response_items jsonb := '[]'::jsonb;
begin
  if requested_request_id is null or requested_unidade_id is null then
    raise exception 'Identificacao da solicitacao invalida.';
  end if;
  if jsonb_typeof(payload->'equipamentos') <> 'array' or jsonb_array_length(payload->'equipamentos') = 0 then
    raise exception 'Adicione pelo menos um equipamento.';
  end if;

  select * into existing_cadastro from public.cadastros where request_id = requested_request_id;
  if found then
    return (
      select jsonb_build_object(
        'cadastro_id', existing_cadastro.id, 'request_id', existing_cadastro.request_id,
        'unidade_id', existing_cadastro.unidade_id, 'unidade_nome', existing_cadastro.unidade_nome,
        'created_at', existing_cadastro.created_at, 'equipamentos',
        coalesce(jsonb_agg(jsonb_build_object(
          'item_id', ci.id, 'patrimonio_id', p.id, 'equipamento_id', ci.equipamento_id,
          'equipamento_nome', ci.equipamento_nome, 'numero_patrimonio', p.numero_patrimonio,
          'patrimonio_codigo', p.patrimonio_codigo, 'status', ci.status,
          'sigla_equipamento', ci.sigla_equipamento, 'equipamento_cliente', ci.equipamento_cliente,
          'tipo_patrimonio', coalesce(ci.tipo_patrimonio, case when ci.equipamento_cliente then 'CLIENTE' else 'PROPRIO' end),
          'sem_patrimonio', coalesce(ci.sem_patrimonio, false)
        ) order by ci.created_at, ci.id), '[]'::jsonb)
      ) from public.cadastro_itens ci left join public.patrimonios p on p.cadastro_item_id = ci.id
      where ci.cadastro_id = existing_cadastro.id
    );
  end if;

  select * into current_unit from public.unidades where id = requested_unidade_id and ativo = true;
  if not found then raise exception 'Selecione uma unidade valida.'; end if;

  insert into public.cadastros (request_id, unidade_id, unidade_nome)
  values (requested_request_id, current_unit.id, current_unit.nome) returning * into cadastro_row;

  for equipment_item in select value from jsonb_array_elements(payload->'equipamentos') as value loop
    item_type := upper(coalesce(nullif(trim(equipment_item->>'tipo_patrimonio'), ''),
      case when coalesce((equipment_item->>'equipamento_cliente')::boolean, false) then 'CLIENTE' else 'PROPRIO' end));
    if item_type not in ('PROPRIO', 'CLIENTE', 'COMODATO') then raise exception 'Tipo de patrimonio invalido.'; end if;
    customer_patrimonio := nullif(trim(coalesce(equipment_item->>'patrimonio_cliente', '')), '');
    item_has_no_patrimonio := item_type <> 'PROPRIO' and coalesce((equipment_item->>'sem_patrimonio')::boolean, false);
    if item_type <> 'PROPRIO' then
      if not item_has_no_patrimonio then
        if customer_patrimonio is null then raise exception 'Informe o numero do patrimonio.'; end if;
        customer_patrimonio := public.format_external_patrimonio(current_unit.nome, customer_patrimonio, case when item_type = 'COMODATO' then 'CM' else 'CL' end);
      else
        customer_patrimonio := null;
      end if;
    end if;
    if equipment_item->>'status' not in ('ATIVO', 'INATIVO') then raise exception 'Escolha o status de todos os equipamentos.'; end if;

    if equipment_item ? 'equipamento_id' then
      select * into current_equipment from public.equipamentos_catalogo where id = (equipment_item->>'equipamento_id')::uuid and ativo = true;
      if not found then raise exception 'Selecione um equipamento valido em todas as linhas.'; end if;
      item_name := current_equipment.nome; item_is_manual := false;
    else
      item_name := nullif(trim(coalesce(equipment_item->>'equipamento_nome', '')), ''); item_is_manual := true;
      if item_name is null then raise exception 'Digite o nome de todos os itens faltantes.'; end if;
    end if;

    insert into public.cadastro_itens (cadastro_id, equipamento_id, equipamento_nome, item_manual, equipamento_cliente, patrimonio_cliente, tipo_patrimonio, sem_patrimonio, status, sigla_equipamento)
    values (cadastro_row.id, case when item_is_manual then null else current_equipment.id end, item_name, item_is_manual, item_type = 'CLIENTE', customer_patrimonio, item_type, item_has_no_patrimonio, equipment_item->>'status', public.generate_equipment_code(item_name))
    returning * into item_row;

    inserted_patrimonio_id := null;
    inserted_numero_patrimonio := null;
    inserted_patrimonio_codigo := null;

    if item_type <> 'PROPRIO' and not item_has_no_patrimonio then
      insert into public.patrimonios (cadastro_id, cadastro_item_id, equipamento_id, equipamento_nome, prefixo_patrimonio, numero_patrimonio, patrimonio_codigo, status, sigla_equipamento, equipamento_cliente, tipo_patrimonio)
      values (cadastro_row.id, item_row.id, item_row.equipamento_id, item_row.equipamento_nome, case when item_type = 'COMODATO' then 'CM' else 'CL' end, null, customer_patrimonio, item_row.status, item_row.sigla_equipamento, item_type = 'CLIENTE', item_type)
      returning * into inserted_item;
      inserted_patrimonio_id := inserted_item.id;
      inserted_numero_patrimonio := inserted_item.numero_patrimonio;
      inserted_patrimonio_codigo := inserted_item.patrimonio_codigo;
    end if;

    response_items := response_items || jsonb_build_array(jsonb_build_object(
      'item_id', item_row.id, 'patrimonio_id', inserted_patrimonio_id, 'equipamento_id', item_row.equipamento_id,
      'equipamento_nome', item_row.equipamento_nome, 'numero_patrimonio', inserted_numero_patrimonio,
      'patrimonio_codigo', inserted_patrimonio_codigo, 'status', item_row.status,
      'sigla_equipamento', item_row.sigla_equipamento, 'equipamento_cliente', item_row.equipamento_cliente,
      'tipo_patrimonio', item_type, 'sem_patrimonio', item_has_no_patrimonio
    ));
  end loop;
  return jsonb_build_object('cadastro_id', cadastro_row.id, 'request_id', cadastro_row.request_id, 'unidade_id', cadastro_row.unidade_id, 'unidade_nome', cadastro_row.unidade_nome, 'created_at', cadastro_row.created_at, 'equipamentos', response_items);
end;
$$;
