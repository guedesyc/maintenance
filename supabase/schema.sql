create extension if not exists pgcrypto;
create extension if not exists unaccent;

create or replace function public.normalize_text(value text)
returns text
language sql
immutable
as $$
  select upper(trim(regexp_replace(unaccent(coalesce(value, '')), '\s+', ' ', 'g')));
$$;

create or replace function public.generate_equipment_code(value text)
returns text
language sql
immutable
as $$
  select left(replace(public.normalize_text(value), ' ', ''), 3);
$$;

create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_normalizado text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipamentos_catalogo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_normalizado text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cadastros (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  unidade_id uuid not null references public.unidades(id),
  unidade_nome text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cadastro_itens (
  id uuid primary key default gen_random_uuid(),
  cadastro_id uuid not null references public.cadastros(id) on delete restrict,
  equipamento_id uuid references public.equipamentos_catalogo(id),
  equipamento_nome text not null,
  item_manual boolean not null default false,
  equipamento_cliente boolean not null default false,
  patrimonio_cliente text,
  status text not null,
  sigla_equipamento text not null,
  created_at timestamptz not null default now(),
  constraint cadastro_itens_status_check check (status in ('ATIVO', 'INATIVO')),
  constraint cadastro_itens_catalogo_ou_manual_check check (equipamento_id is not null or item_manual = true),
  constraint cadastro_itens_cliente_patrimonio_check check (equipamento_cliente = false or nullif(trim(patrimonio_cliente), '') is not null)
);

alter table public.cadastro_itens
  add column if not exists equipamento_id uuid references public.equipamentos_catalogo(id),
  add column if not exists item_manual boolean not null default false,
  add column if not exists equipamento_cliente boolean not null default false,
  add column if not exists patrimonio_cliente text,
  add column if not exists sigla_equipamento text;

update public.cadastro_itens
set sigla_equipamento = public.generate_equipment_code(equipamento_nome)
where sigla_equipamento is null;

alter table public.cadastro_itens
  alter column sigla_equipamento set not null;

drop view if exists public.vw_admin_registros;
drop view if exists public.vw_admin_unidades;
drop view if exists public.vw_admin_equipamentos;

create table if not exists public.patrimonios (
  id uuid primary key default gen_random_uuid(),
  cadastro_id uuid not null references public.cadastros(id) on delete restrict,
  cadastro_item_id uuid unique references public.cadastro_itens(id) on delete restrict,
  equipamento_id uuid references public.equipamentos_catalogo(id),
  equipamento_nome text not null,
  prefixo_patrimonio text,
  numero_patrimonio integer,
  patrimonio_codigo text not null unique,
  status text not null,
  sigla_equipamento text not null,
  equipamento_cliente boolean not null default false,
  created_at timestamptz not null default now(),
  constraint patrimonios_numero_check check (numero_patrimonio is null or numero_patrimonio between 1 and 999999),
  constraint patrimonios_status_check check (status in ('ATIVO', 'INATIVO'))
);

alter table public.patrimonios
  add column if not exists cadastro_item_id uuid references public.cadastro_itens(id) on delete restrict,
  add column if not exists prefixo_patrimonio text,
  add column if not exists patrimonio_codigo text,
  add column if not exists equipamento_cliente boolean not null default false;

alter table public.patrimonios
  alter column equipamento_id drop not null,
  alter column numero_patrimonio drop not null;

alter table public.patrimonios
  drop constraint if exists patrimonios_numero_patrimonio_key;

drop index if exists public.patrimonios_numero_patrimonio_key;

alter table public.patrimonios
  drop constraint if exists patrimonios_cadastro_item_id_key;

drop index if exists public.patrimonios_cadastro_item_id_key;

delete from public.cadastro_itens ci
where not exists (
    select 1
    from public.patrimonios linked
    where linked.cadastro_item_id = ci.id
  )
  and exists (
    select 1
    from public.patrimonios p
    where p.cadastro_item_id is null
      and p.cadastro_id = ci.cadastro_id
      and coalesce(p.equipamento_id, '00000000-0000-0000-0000-000000000000'::uuid) =
        coalesce(ci.equipamento_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and p.equipamento_nome = ci.equipamento_nome
      and p.status = ci.status
      and p.created_at = ci.created_at
  );

do $$
declare
  old_patrimonio record;
  new_item_id uuid;
begin
  for old_patrimonio in
    select *
    from public.patrimonios
    where cadastro_item_id is null
    order by created_at, id
  loop
    insert into public.cadastro_itens (
      cadastro_id,
      equipamento_id,
      equipamento_nome,
      item_manual,
      equipamento_cliente,
      patrimonio_cliente,
      status,
      sigla_equipamento,
      created_at
    )
    values (
      old_patrimonio.cadastro_id,
      old_patrimonio.equipamento_id,
      old_patrimonio.equipamento_nome,
      false,
      coalesce(old_patrimonio.equipamento_cliente, false),
      null,
      old_patrimonio.status,
      old_patrimonio.sigla_equipamento,
      old_patrimonio.created_at
    )
    returning id into new_item_id;

    update public.patrimonios
    set cadastro_item_id = new_item_id
    where id = old_patrimonio.id;
  end loop;
end;
$$;

create unique index if not exists patrimonios_cadastro_item_id_key
on public.patrimonios(cadastro_item_id)
where cadastro_item_id is not null;

update public.patrimonios
set patrimonio_codigo = coalesce(patrimonio_codigo, numero_patrimonio::text)
where patrimonio_codigo is null
  and numero_patrimonio is not null;

alter table public.patrimonios
  alter column patrimonio_codigo set not null;

create unique index if not exists patrimonios_patrimonio_codigo_key
on public.patrimonios(patrimonio_codigo);

create table if not exists public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  valor jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.historico_importacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('UNIDADES', 'EQUIPAMENTOS', 'MODELO_EXPORTACAO')),
  nome_arquivo text not null,
  total_lidos integer not null default 0,
  total_importados integer not null default 0,
  total_duplicados integer not null default 0,
  total_vazios integer not null default 0,
  modo_importacao text not null default 'ADD',
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_unidades_updated_at on public.unidades;
create trigger trg_unidades_updated_at
before update on public.unidades
for each row execute function public.set_updated_at();

drop trigger if exists trg_equipamentos_catalogo_updated_at on public.equipamentos_catalogo;
create trigger trg_equipamentos_catalogo_updated_at
before update on public.equipamentos_catalogo
for each row execute function public.set_updated_at();

drop trigger if exists trg_configuracoes_updated_at on public.configuracoes;
create trigger trg_configuracoes_updated_at
before update on public.configuracoes
for each row execute function public.set_updated_at();

create index if not exists idx_unidades_nome_normalizado on public.unidades(nome_normalizado);
create index if not exists idx_unidades_ativo on public.unidades(ativo);
create index if not exists idx_equipamentos_nome_normalizado on public.equipamentos_catalogo(nome_normalizado);
create index if not exists idx_equipamentos_ativo on public.equipamentos_catalogo(ativo);
create index if not exists idx_cadastros_request_id on public.cadastros(request_id);
create index if not exists idx_cadastros_unidade_id on public.cadastros(unidade_id);
create index if not exists idx_cadastros_created_at on public.cadastros(created_at desc);
create index if not exists idx_cadastro_itens_cadastro_id on public.cadastro_itens(cadastro_id);
create index if not exists idx_cadastro_itens_equipamento_id on public.cadastro_itens(equipamento_id);
create index if not exists idx_cadastro_itens_cliente on public.cadastro_itens(equipamento_cliente);
create index if not exists idx_patrimonios_numero on public.patrimonios(numero_patrimonio);
create unique index if not exists idx_patrimonios_prefixo_numero on public.patrimonios(prefixo_patrimonio, numero_patrimonio)
where numero_patrimonio is not null;
create index if not exists idx_patrimonios_codigo on public.patrimonios(patrimonio_codigo);
create index if not exists idx_patrimonios_status on public.patrimonios(status);
create index if not exists idx_patrimonios_equipamento_id on public.patrimonios(equipamento_id);
create index if not exists idx_patrimonios_cadastro_id on public.patrimonios(cadastro_id);
create index if not exists idx_patrimonios_cadastro_item_id on public.patrimonios(cadastro_item_id);
create index if not exists idx_patrimonios_created_at on public.patrimonios(created_at desc);

create view public.vw_admin_registros as
select
  c.id as cadastro_id,
  c.created_at as cadastro_created_at,
  c.request_id,
  c.unidade_id,
  c.unidade_nome,
  p.id as patrimonio_id,
  ci.id as item_id,
  ci.equipamento_id,
  ci.equipamento_nome,
  p.numero_patrimonio,
  p.patrimonio_codigo,
  coalesce(p.patrimonio_codigo, '') as numero_patrimonio_text,
  ci.sigla_equipamento,
  ci.status,
  ci.equipamento_cliente,
  p.id is null and ci.equipamento_cliente = false as patrimonio_pendente
from public.cadastros c
join public.cadastro_itens ci on ci.cadastro_id = c.id
left join public.patrimonios p on p.cadastro_item_id = ci.id;

create view public.vw_admin_unidades as
select
  u.*,
  coalesce(count(c.id), 0)::int as usage_count
from public.unidades u
left join public.cadastros c on c.unidade_id = u.id
group by u.id;

create view public.vw_admin_equipamentos as
select
  e.*,
  coalesce(count(p.id), 0)::int as usage_count
from public.equipamentos_catalogo e
left join public.cadastro_itens p on p.equipamento_id = e.id
group by e.id;

create or replace function public.extract_unit_number(unit_name text)
returns text
language sql
immutable
as $$
  select (regexp_match(coalesce(unit_name, ''), '\d+'))[1];
$$;

create or replace function public.resolve_unit_prefix(unit_name text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text := public.normalize_text(unit_name);
begin
  if normalized like 'ESCOLA%' or normalized like '% LP %' or normalized like 'LP %' or normalized like '% LP' then
    return 'LP';
  end if;

  if normalized like '%AROMA%' then
    return 'AS';
  end if;

  raise exception 'Nao foi possivel identificar a empresa da unidade: %', unit_name;
end;
$$;

create or replace function public.format_patrimonio(prefix_value text, unit_number text, patrimonio_number integer)
returns text
language sql
immutable
as $$
  select prefix_value || unit_number || '/' || lpad(patrimonio_number::text, 6, '0');
$$;

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
    select
      ci.*,
      c.unidade_nome
    from public.cadastro_itens ci
    join public.cadastros c on c.id = ci.cadastro_id
    left join public.patrimonios p on p.cadastro_item_id = ci.id
    where ci.equipamento_cliente = false
      and p.id is null
    order by ci.created_at, ci.id
  loop
    current_prefix := public.resolve_unit_prefix(pending_item.unidade_nome);
    current_unit_number := public.extract_unit_number(pending_item.unidade_nome);

    if current_unit_number is null then
      raise exception 'Nao foi possivel identificar o numero da unidade: %', pending_item.unidade_nome;
    end if;

    select coalesce(max(numero_patrimonio), 0) + 1
    into next_number
    from public.patrimonios
    where prefixo_patrimonio = current_prefix;

    if next_number > 999999 then
      raise exception 'Limite de patrimonio atingido para %.', current_prefix;
    end if;

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
      pending_item.cadastro_id,
      pending_item.id,
      pending_item.equipamento_id,
      pending_item.equipamento_nome,
      current_prefix,
      next_number,
      public.format_patrimonio(current_prefix, current_unit_number, next_number),
      pending_item.status,
      pending_item.sigla_equipamento,
      false
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

create or replace function public.delete_equipment_if_unused(equipment_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.cadastro_itens where equipamento_id = equipment_uuid) then
    raise exception 'Nao e permitido excluir equipamentos ja utilizados.';
  end if;

  delete from public.equipamentos_catalogo where id = equipment_uuid;
end;
$$;

revoke all on public.unidades from anon, authenticated;
revoke all on public.equipamentos_catalogo from anon, authenticated;
revoke all on public.cadastros from anon, authenticated;
revoke all on public.cadastro_itens from anon, authenticated;
revoke all on public.patrimonios from anon, authenticated;
revoke all on public.configuracoes from anon, authenticated;
revoke all on public.historico_importacoes from anon, authenticated;

grant select on public.unidades to anon, authenticated;
grant select on public.equipamentos_catalogo to anon, authenticated;
grant execute on function public.create_registration(jsonb) to anon, authenticated;
grant execute on function public.generate_pending_patrimonios() to authenticated;

alter table public.unidades enable row level security;
alter table public.equipamentos_catalogo enable row level security;
alter table public.cadastros enable row level security;
alter table public.cadastro_itens enable row level security;
alter table public.patrimonios enable row level security;
alter table public.configuracoes enable row level security;
alter table public.historico_importacoes enable row level security;

drop policy if exists unidades_public_read on public.unidades;
create policy unidades_public_read on public.unidades
for select
to anon, authenticated
using (ativo = true);

drop policy if exists equipamentos_public_read on public.equipamentos_catalogo;
create policy equipamentos_public_read on public.equipamentos_catalogo
for select
to anon, authenticated
using (ativo = true);

drop policy if exists deny_cadastros_all on public.cadastros;
create policy deny_cadastros_all on public.cadastros
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_cadastro_itens_all on public.cadastro_itens;
create policy deny_cadastro_itens_all on public.cadastro_itens
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_patrimonios_all on public.patrimonios;
create policy deny_patrimonios_all on public.patrimonios
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_configuracoes_all on public.configuracoes;
create policy deny_configuracoes_all on public.configuracoes
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_importacoes_all on public.historico_importacoes;
create policy deny_importacoes_all on public.historico_importacoes
for all
to anon, authenticated
using (false)
with check (false);

comment on schema public is 'Bucket sugerido para o modelo: modelos-exportacao (privado). Permitir acesso apenas via service_role nas Netlify Functions.';
