-- =============================================================================
-- Sementes do Amanhã — esquema do banco (Supabase / Postgres)
--
-- Como usar: Supabase → SQL Editor → New query → cole este arquivo → Run.
-- Pode ser executado de novo sem perder dados (usa IF NOT EXISTS / OR REPLACE).
--
-- Segurança: todas as tabelas têm RLS. As regras abaixo espelham
-- lib/permissions.ts (perfis por área + escopo de finanças por time), então
-- mesmo que alguém use a chave pública fora do app, só vê o que o perfil permite.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------

create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  is_admin    boolean not null default false,
  acessos     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.teams (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  descricao    text,
  categorias   text[] not null default '{}',
  compartilhar boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Um registro por login (auth.users). Criado automaticamente pelo gatilho abaixo.
create table if not exists public.app_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text,
  role_id     uuid references public.roles(id) on delete restrict,
  team_ids    uuid[] not null default '{}',
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.custom_fields (
  id          uuid primary key default gen_random_uuid(),
  form        text not null check (form in ('visitors', 'finance')),
  label       text not null,
  type        text not null check (type in ('text', 'number', 'select', 'date')),
  options     jsonb,
  required    boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.donors (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null default '',
  como_chamar         text,
  anonimo_recorrente  boolean not null default false,
  contato             text,
  extra1              text,
  extra2              text,
  created_at          timestamptz not null default now()
);

create table if not exists public.visitors (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  documento   text not null default '',
  motivo      text not null default '',
  destino     text not null default '',
  entrada     timestamptz not null,
  saida       timestamptz,
  custom      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('entrada', 'saida')),
  descricao   text not null default '',
  valor       numeric(14, 2) not null,
  data        date not null,
  categoria   text not null default '',
  doador_id   uuid references public.donors(id) on delete set null,
  custom      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists visitors_entrada_idx on public.visitors (entrada desc);
create index if not exists transactions_data_idx on public.transactions (data desc);
create index if not exists transactions_doador_idx on public.transactions (doador_id);

-- -----------------------------------------------------------------------------
-- Funções de permissão (usadas pelas políticas RLS)
-- -----------------------------------------------------------------------------

-- Usuário logado, ativo e com perfil.
create or replace function public.is_active_user()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.app_users u
    where u.id = auth.uid() and u.ativo and u.role_id is not null
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select r.is_admin
    from public.app_users u join public.roles r on r.id = u.role_id
    where u.id = auth.uid() and u.ativo
  ), false);
$$;

-- Mesmo critério de hasAccess() em lib/permissions.ts.
create or replace function public.has_access(area text, min_level text default 'visualizar')
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select r.is_admin
      or (case coalesce(r.acessos ->> area, 'nenhum')
            when 'editar' then 2 when 'visualizar' then 1 else 0 end)
         >= (case min_level when 'editar' then 2 when 'visualizar' then 1 else 0 end)
    from public.app_users u join public.roles r on r.id = u.role_id
    where u.id = auth.uid() and u.ativo
  ), false);
$$;

-- Mesmo critério de visibleTransactions() em lib/permissions.ts.
create or replace function public.can_see_category(cat text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin()
    or not exists (
      select 1 from public.teams t
      where not t.compartilhar and cat = any (t.categorias)
    )
    or exists (
      select 1
      from public.teams t
      join public.app_users u on u.id = auth.uid() and u.ativo
      where not t.compartilhar and cat = any (t.categorias) and t.id = any (u.team_ids)
    );
$$;

-- -----------------------------------------------------------------------------
-- Gatilho: cria o registro em app_users quando um login é criado.
-- O PRIMEIRO login vira administrador. Os demais recebem o perfil/times
-- definidos pelo admin (via app_metadata, que só o servidor consegue gravar).
-- Quem se cadastrar por fora fica sem perfil e inativo = sem acesso a nada.
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_admin_role uuid;
  v_nome text := coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1));
  v_app jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  v_role uuid := nullif(v_app ->> 'role_id', '')::uuid;
  v_teams uuid[];
begin
  perform pg_advisory_xact_lock(727274);

  if not exists (select 1 from public.app_users) then
    select id into v_admin_role from public.roles where is_admin order by created_at limit 1;
    if v_admin_role is null then
      insert into public.roles (nome, descricao, is_admin, acessos)
      values (
        'Administrador',
        'Acesso completo, incluindo perfis, times e usuários.',
        true,
        '{"painel":"editar","visitantes":"editar","financas":"editar","doadores":"editar","campos":"editar","administracao":"editar","excel":"editar"}'::jsonb
      )
      returning id into v_admin_role;
    end if;
    insert into public.app_users (id, nome, email, role_id, team_ids, ativo)
    values (new.id, v_nome, new.email, v_admin_role, '{}', true);
    return new;
  end if;

  select coalesce(array_agg(x::uuid), '{}')
    into v_teams
    from jsonb_array_elements_text(
      case jsonb_typeof(v_app -> 'team_ids') when 'array' then v_app -> 'team_ids' else '[]'::jsonb end
    ) as x;

  insert into public.app_users (id, nome, email, role_id, team_ids, ativo)
  values (new.id, v_nome, new.email, v_role, v_teams, v_role is not null);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Privilégios: só usuários logados acessam as tabelas (anon não vê nada).
-- -----------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.is_active_user(), public.is_admin(),
  public.has_access(text, text), public.can_see_category(text) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.roles          enable row level security;
alter table public.teams          enable row level security;
alter table public.app_users      enable row level security;
alter table public.custom_fields  enable row level security;
alter table public.donors         enable row level security;
alter table public.visitors       enable row level security;
alter table public.transactions   enable row level security;

-- Perfis e times: todo usuário ativo lê; só quem edita a Administração altera.
drop policy if exists roles_select on public.roles;
drop policy if exists roles_write on public.roles;
create policy roles_select on public.roles for select to authenticated using (public.is_active_user());
create policy roles_write on public.roles for all to authenticated
  using (public.has_access('administracao', 'editar'))
  with check (public.has_access('administracao', 'editar'));

drop policy if exists teams_select on public.teams;
drop policy if exists teams_write on public.teams;
create policy teams_select on public.teams for select to authenticated using (public.is_active_user());
create policy teams_write on public.teams for all to authenticated
  using (public.has_access('administracao', 'editar'))
  with check (public.has_access('administracao', 'editar'));

-- Usuários: cada um lê o próprio registro (mesmo inativo); ativos leem todos.
-- Criação e exclusão de logins passam pela API do servidor (app/api/users).
drop policy if exists app_users_select on public.app_users;
drop policy if exists app_users_update on public.app_users;
create policy app_users_select on public.app_users for select to authenticated
  using (id = auth.uid() or public.is_active_user());
create policy app_users_update on public.app_users for update to authenticated
  using (public.has_access('administracao', 'editar'))
  with check (public.has_access('administracao', 'editar'));

-- Campos personalizados
drop policy if exists custom_fields_select on public.custom_fields;
drop policy if exists custom_fields_write on public.custom_fields;
create policy custom_fields_select on public.custom_fields for select to authenticated using (public.is_active_user());
create policy custom_fields_write on public.custom_fields for all to authenticated
  using (public.has_access('campos', 'editar'))
  with check (public.has_access('campos', 'editar'));

-- Doadores
drop policy if exists donors_select on public.donors;
drop policy if exists donors_write on public.donors;
create policy donors_select on public.donors for select to authenticated
  using (public.has_access('doadores') or public.has_access('financas') or public.has_access('excel'));
create policy donors_write on public.donors for all to authenticated
  using (public.has_access('doadores', 'editar'))
  with check (public.has_access('doadores', 'editar'));

-- Visitantes (o Painel e o Excel também leem)
drop policy if exists visitors_select on public.visitors;
drop policy if exists visitors_insert on public.visitors;
drop policy if exists visitors_update on public.visitors;
drop policy if exists visitors_delete on public.visitors;
create policy visitors_select on public.visitors for select to authenticated
  using (public.has_access('visitantes') or public.has_access('painel') or public.has_access('excel'));
create policy visitors_insert on public.visitors for insert to authenticated
  with check (public.has_access('visitantes', 'editar') or public.has_access('excel', 'editar'));
create policy visitors_update on public.visitors for update to authenticated
  using (public.has_access('visitantes', 'editar'))
  with check (public.has_access('visitantes', 'editar'));
create policy visitors_delete on public.visitors for delete to authenticated
  using (public.has_access('visitantes', 'editar'));

-- Finanças (respeitando o escopo dos times)
drop policy if exists transactions_select on public.transactions;
drop policy if exists transactions_insert on public.transactions;
drop policy if exists transactions_update on public.transactions;
drop policy if exists transactions_delete on public.transactions;
create policy transactions_select on public.transactions for select to authenticated
  using (
    (public.has_access('financas') or public.has_access('painel') or public.has_access('excel'))
    and public.can_see_category(categoria)
  );
create policy transactions_insert on public.transactions for insert to authenticated
  with check (
    (public.has_access('financas', 'editar') or public.has_access('excel', 'editar'))
    and public.can_see_category(categoria)
  );
create policy transactions_update on public.transactions for update to authenticated
  using (public.has_access('financas', 'editar') and public.can_see_category(categoria))
  with check (public.has_access('financas', 'editar') and public.can_see_category(categoria));
create policy transactions_delete on public.transactions for delete to authenticated
  using (public.has_access('financas', 'editar') and public.can_see_category(categoria));
