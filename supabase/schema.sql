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

create table if not exists public.patrimonios (
  id uuid primary key default gen_random_uuid(),
  cadastro_id uuid not null references public.cadastros(id) on delete restrict,
  equipamento_id uuid not null references public.equipamentos_catalogo(id),
  equipamento_nome text not null,
  numero_patrimonio integer not null unique,
  status text not null,
  sigla_equipamento text not null,
  created_at timestamptz not null default now(),
  constraint patrimonios_numero_check check (numero_patrimonio between 1 and 999999),
  constraint patrimonios_status_check check (status in ('ATIVO', 'INATIVO'))
);

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
create index if not exists idx_patrimonios_numero on public.patrimonios(numero_patrimonio);
create index if not exists idx_patrimonios_status on public.patrimonios(status);
create index if not exists idx_patrimonios_equipamento_id on public.patrimonios(equipamento_id);
create index if not exists idx_patrimonios_cadastro_id on public.patrimonios(cadastro_id);
create index if not exists idx_patrimonios_created_at on public.patrimonios(created_at desc);

create or replace view public.vw_admin_registros as
select
  c.id as cadastro_id,
  c.created_at as cadastro_created_at,
  c.request_id,
  c.unidade_id,
  c.unidade_nome,
  p.id as patrimonio_id,
  p.equipamento_id,
  p.equipamento_nome,
  p.numero_patrimonio,
  p.numero_patrimonio::text as numero_patrimonio_text,
  p.sigla_equipamento,
  p.status
from public.cadastros c
join public.patrimonios p on p.cadastro_id = c.id;

create or replace view public.vw_admin_unidades as
select
  u.*,
  coalesce(count(c.id), 0)::int as usage_count
from public.unidades u
left join public.cadastros c on c.unidade_id = u.id
group by u.id;

create or replace view public.vw_admin_equipamentos as
select
  e.*,
  coalesce(count(p.id), 0)::int as usage_count
from public.equipamentos_catalogo e
left join public.patrimonios p on p.equipamento_id = e.id
group by e.id;

create or replace function public.generate_unique_patrimonio()
returns integer
language plpgsql
as $$
declare
  candidate integer;
begin
  loop
    candidate := floor(random() * 999999 + 1);
    exit when not exists (
      select 1
      from public.patrimonios
      where numero_patrimonio = candidate
    );
  end loop;
  return candidate;
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
  generated_patrimonio integer;
  inserted_item public.patrimonios%rowtype;
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
              'patrimonio_id', p.id,
              'equipamento_id', p.equipamento_id,
              'equipamento_nome', p.equipamento_nome,
              'numero_patrimonio', p.numero_patrimonio,
              'status', p.status,
              'sigla_equipamento', p.sigla_equipamento
            )
          ),
          '[]'::jsonb
        )
      )
      from public.patrimonios p
      where p.cadastro_id = existing_cadastro.id
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

    select *
    into current_equipment
    from public.equipamentos_catalogo
    where id = (equipment_item->>'equipamento_id')::uuid and ativo = true;

    if not found then
      raise exception 'Selecione um equipamento valido em todas as linhas.';
    end if;

    loop
      generated_patrimonio := public.generate_unique_patrimonio();
      begin
        insert into public.patrimonios (
          cadastro_id,
          equipamento_id,
          equipamento_nome,
          numero_patrimonio,
          status,
          sigla_equipamento
        )
        values (
          cadastro_row.id,
          current_equipment.id,
          current_equipment.nome,
          generated_patrimonio,
          equipment_item->>'status',
          public.generate_equipment_code(current_equipment.nome)
        )
        returning * into inserted_item;
        exit;
      exception
        when unique_violation then
          continue;
      end;
    end loop;

    response_items := response_items || jsonb_build_array(
      jsonb_build_object(
        'patrimonio_id', inserted_item.id,
        'equipamento_id', inserted_item.equipamento_id,
        'equipamento_nome', inserted_item.equipamento_nome,
        'numero_patrimonio', inserted_item.numero_patrimonio,
        'status', inserted_item.status,
        'sigla_equipamento', inserted_item.sigla_equipamento
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
  if exists (select 1 from public.patrimonios where equipamento_id = equipment_uuid) then
    raise exception 'Nao e permitido excluir equipamentos ja utilizados.';
  end if;

  delete from public.equipamentos_catalogo where id = equipment_uuid;
end;
$$;

revoke all on public.unidades from anon, authenticated;
revoke all on public.equipamentos_catalogo from anon, authenticated;
revoke all on public.cadastros from anon, authenticated;
revoke all on public.patrimonios from anon, authenticated;
revoke all on public.configuracoes from anon, authenticated;
revoke all on public.historico_importacoes from anon, authenticated;

grant select on public.unidades to anon, authenticated;
grant select on public.equipamentos_catalogo to anon, authenticated;
grant execute on function public.create_registration(jsonb) to anon, authenticated;

alter table public.unidades enable row level security;
alter table public.equipamentos_catalogo enable row level security;
alter table public.cadastros enable row level security;
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
