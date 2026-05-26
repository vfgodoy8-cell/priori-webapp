-- ============================================================
-- Priori™ — Schema inicial
-- Ejecutar en: Supabase Studio → SQL Editor → New query
-- ============================================================


-- ============================================================
-- TABLAS
-- ============================================================

-- profiles: extiende auth.users, se crea automáticamente al signup
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- organizations: cada equipo/empresa que usa Priori
create table public.organizations (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  slug        text unique not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- organization_members: relación perfil ↔ organización con rol
create table public.organization_members (
  id               uuid default gen_random_uuid() primary key,
  organization_id  uuid references public.organizations(id) on delete cascade not null,
  profile_id       uuid references public.profiles(id) on delete cascade not null,
  role             text not null default 'member'
                     check (role in ('owner', 'admin', 'member')),
  created_at       timestamptz default now() not null,
  unique (organization_id, profile_id)
);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Actualiza updated_at automáticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute procedure public.handle_updated_at();

-- Crea un profile automáticamente cuando se registra un usuario
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles            enable row level security;
alter table public.organizations       enable row level security;
alter table public.organization_members enable row level security;


-- ---- profiles ----

-- Cada usuario puede ver su propio perfil
create policy "profiles: select propio"
  on public.profiles for select
  using (auth.uid() = id);

-- Miembros de la misma organización pueden verse entre sí
create policy "profiles: select misma org"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.organization_members om1
      join public.organization_members om2
        on om1.organization_id = om2.organization_id
      where om1.profile_id = auth.uid()
        and om2.profile_id = profiles.id
    )
  );

-- Cada usuario puede actualizar solo su propio perfil
create policy "profiles: update propio"
  on public.profiles for update
  using (auth.uid() = id);


-- ---- organizations ----

-- Miembros pueden ver su organización
create policy "organizations: select miembros"
  on public.organizations for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
        and profile_id = auth.uid()
    )
  );

-- Usuarios autenticados pueden crear organizaciones
create policy "organizations: insert autenticado"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- Solo el owner puede actualizar la organización
create policy "organizations: update owner"
  on public.organizations for update
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
        and profile_id = auth.uid()
        and role = 'owner'
    )
  );

-- Solo el owner puede eliminar la organización
create policy "organizations: delete owner"
  on public.organizations for delete
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
        and profile_id = auth.uid()
        and role = 'owner'
    )
  );


-- ---- organization_members ----

-- Miembros pueden ver a otros miembros de su org
create policy "org_members: select miembros"
  on public.organization_members for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_members.organization_id
        and om.profile_id = auth.uid()
    )
  );

-- Un usuario puede insertarse como owner de una org nueva,
-- o un owner/admin puede agregar otros miembros
create policy "org_members: insert"
  on public.organization_members for insert
  with check (
    (profile_id = auth.uid() and role = 'owner')
    or exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_members.organization_id
        and om.profile_id = auth.uid()
        and om.role in ('owner', 'admin')
    )
  );

-- Un owner puede eliminar cualquier miembro; un usuario puede eliminarse a sí mismo
create policy "org_members: delete"
  on public.organization_members for delete
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_members.organization_id
        and om.profile_id = auth.uid()
        and om.role = 'owner'
    )
  );
