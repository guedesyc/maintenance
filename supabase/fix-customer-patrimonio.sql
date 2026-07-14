create or replace function public.format_customer_patrimonio(unit_name text, raw_patrimonio text)
returns text
language plpgsql
immutable
as $$
declare
  unit_number text := public.extract_unit_number(unit_name);
  clean_value text := trim(coalesce(raw_patrimonio, ''));
  digits_value text;
begin
  if unit_number is null then
    raise exception 'Nao foi possivel identificar o numero da unidade: %', unit_name;
  end if;

  if clean_value = '' then
    raise exception 'Informe o patrimonio de todos os equipamentos do cliente.';
  end if;

  if public.normalize_text(clean_value) like 'CL%/%' then
    return clean_value;
  end if;

  digits_value := regexp_replace(clean_value, '\D', '', 'g');

  if digits_value <> '' then
    clean_value := lpad(digits_value, 6, '0');
  end if;

  return 'CL' || unit_number || '/' || clean_value;
end;
$$;

update public.patrimonios p
set patrimonio_codigo = public.format_customer_patrimonio(c.unidade_nome, p.patrimonio_codigo)
from public.cadastros c
where p.cadastro_id = c.id
  and p.equipamento_cliente = true
  and p.patrimonio_codigo is not null
  and public.normalize_text(p.patrimonio_codigo) not like 'CL%/%';

create or replace function public.create_registration(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_request_id uuid;
  requested_unidade_id uuid;
  current_unit public.unidades%rowtype;
  existing_cadastro public.cadastros%rowtype;
  cadastro_row public.cadastros%rowtype;
  equipment_item jsonb;
  current_equipment public.equipamentos_catalogo%rowtype;
  item_row public.cadastro_itens%rowtype;
  inserted_item public.patrimonios%rowtype;
  inserted_patrimonio_id uuid;
  inserted_numero_patrimonio integer;
  inserted_patrimonio_codigo text;
  item_name text;
  item_is_manual boolean;
  item_is_customer boolean;
  customer_patrimonio text;
  response_items jsonb := '[]'::jsonb;
begin
  requested_request_id := (payload->>'request_id')::uuid;
  requested_unidade_id := (payload->>'unidade_id')::uuid;

  if requested_request_id is null then
    raise exception 'request_id invalido';
  end if;

  if requested_unidade_id is null then
    raise exception 'unidade_id invalido';
  end if;

  if jsonb_typeof(payload->'equipamentos') <> 'array' or jsonb_array_length(payload->'equipamentos') = 0 then
    raise exception 'Adicione pelo menos um equipamento.';
  end if;

  select *
  into existing_cadastro
  from public.cadastros
  where request_id = requested_request_id;

  if found then
    return (
      select jsonb_build_object(
        'cadastro_id', existing_cadastro.id,
        'request_id', existing_cadastro.request_id,
        'unidade_id', existing_cadastro.unidade_id,
        'unidade_nome', existing_cadastro.unidade_nome,
        'created_at', existing_cadastro.created_at,
        'equipamentos',
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'item_id', ci.id,
              'patrimonio_id', p.id,
              'equipamento_id', ci.equipamento_id,
              'equipamento_nome', ci.equipamento_nome,
              'numero_patrimonio', p.numero_patrimonio,
              'patrimonio_codigo', p.patrimonio_codigo,
              'status', ci.status,
              'sigla_equipamento', ci.sigla_equipamento,
              'equipamento_cliente', ci.equipamento_cliente
            )
            order by ci.created_at, ci.id
          ),
          '[]'::jsonb
        )
      )
      from public.cadastro_itens ci
      left join public.patrimonios p on p.cadastro_item_id = ci.id
      where ci.cadastro_id = existing_cadastro.id
    );
  end if;

  select *
  into current_unit
  from public.unidades
  where id = requested_unidade_id and ativo = true;

  if not found then
    raise exception 'Selecione uma unidade valida.';
  end if;

  insert into public.cadastros (request_id, unidade_id, unidade_nome)
  values (requested_request_id, current_unit.id, current_unit.nome)
  returning * into cadastro_row;

  for equipment_item in
    select value
    from jsonb_array_elements(payload->'equipamentos') as value
  loop
    if (equipment_item->>'status') not in ('ATIVO', 'INATIVO') then
      raise exception 'Escolha o status de todos os equipamentos.';
    end if;

    item_is_customer := coalesce((equipment_item->>'equipamento_cliente')::boolean, false);
    customer_patrimonio := nullif(trim(coalesce(equipment_item->>'patrimonio_cliente', '')), '');

    if item_is_customer and customer_patrimonio is null then
      raise exception 'Informe o patrimonio de todos os equipamentos do cliente.';
    end if;

    if item_is_customer then
      customer_patrimonio := public.format_customer_patrimonio(current_unit.nome, customer_patrimonio);
    end if;

    if equipment_item ? 'equipamento_id' then
      select *
      into current_equipment
      from public.equipamentos_catalogo
      where id = (equipment_item->>'equipamento_id')::uuid and ativo = true;

      if not found then
        raise exception 'Selecione um equipamento valido em todas as linhas.';
      end if;

      item_name := current_equipment.nome;
      item_is_manual := false;
    else
      item_name := nullif(trim(coalesce(equipment_item->>'equipamento_nome', '')), '');
      item_is_manual := true;

      if item_name is null then
        raise exception 'Digite o nome de todos os itens faltantes.';
      end if;
    end if;

    insert into public.cadastro_itens (
      cadastro_id,
      equipamento_id,
      equipamento_nome,
      item_manual,
      equipamento_cliente,
      patrimonio_cliente,
      status,
      sigla_equipamento
    )
    values (
      cadastro_row.id,
      case when item_is_manual then null else current_equipment.id end,
      item_name,
      item_is_manual,
      item_is_customer,
      customer_patrimonio,
      equipment_item->>'status',
      public.generate_equipment_code(item_name)
    )
    returning * into item_row;

    inserted_patrimonio_id := null;
    inserted_numero_patrimonio := null;
    inserted_patrimonio_codigo := null;

    if item_is_customer then
      insert into public.patrimonios (
        cadastro_id,
        cadastro_item_id,
        equipamento_id,
        equipamento_nome,
        prefixo_patrimonio,
        numero_patrimonio,
        patrimonio_codigo,
        status,
        sigla_equipamento,
        equipamento_cliente
      )
      values (
        cadastro_row.id,
        item_row.id,
        item_row.equipamento_id,
        item_row.equipamento_nome,
        'CL',
        null,
        customer_patrimonio,
        item_row.status,
        item_row.sigla_equipamento,
        true
      )
      returning * into inserted_item;

      inserted_patrimonio_id := inserted_item.id;
      inserted_numero_patrimonio := inserted_item.numero_patrimonio;
      inserted_patrimonio_codigo := inserted_item.patrimonio_codigo;
    end if;

    response_items := response_items || jsonb_build_array(
      jsonb_build_object(
        'item_id', item_row.id,
        'patrimonio_id', inserted_patrimonio_id,
        'equipamento_id', item_row.equipamento_id,
        'equipamento_nome', item_row.equipamento_nome,
        'numero_patrimonio', inserted_numero_patrimonio,
        'patrimonio_codigo', inserted_patrimonio_codigo,
        'status', item_row.status,
        'sigla_equipamento', item_row.sigla_equipamento,
        'equipamento_cliente', item_row.equipamento_cliente
      )
    );
  end loop;

  return jsonb_build_object(
    'cadastro_id', cadastro_row.id,
    'request_id', cadastro_row.request_id,
    'unidade_id', cadastro_row.unidade_id,
    'unidade_nome', cadastro_row.unidade_nome,
    'created_at', cadastro_row.created_at,
    'equipamentos', response_items
  );
end;
$$;
