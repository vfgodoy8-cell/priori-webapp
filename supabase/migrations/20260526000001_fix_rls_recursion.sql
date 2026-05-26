-- ============================================================
-- Fix: recursión infinita en RLS de organization_members
--
-- Causa: las policies de organization_members se consultaban
-- a sí mismas para verificar membresía → recursión infinita.
--
-- Solución: funciones SECURITY DEFINER como intermediarias.
-- Al ser security definer, bypasean RLS y cortan el ciclo.
-- ============================================================


-- ============================================================
-- 1. DROP de policies problemáticas
-- ============================================================

drop policy if exists "org_members: select miembros"  on public.organization_members;
drop policy if exists "org_members: insert"            on public.organization_members;
drop policy if exists "org_members: delete"            on public.organization_members;
drop policy if exists "profiles: select misma org"     on public.profiles;


-- ============================================================
-- 2. Funciones helper SECURITY DEFINER (bypass RLS)
-- ============================================================

-- Devuelve los IDs de las organizaciones del usuario actual
create or replace function public.get_my_org_ids()
returns setof uuid as $$
  select organization_id
  from public.organization_members
  where profile_id = auth.uid();
$$ language sql security definer stable;

-- Devuelve el rol del usuario actual en una organización dada
create or replace function public.my_role_in_org(org_id uuid)
returns text as $$
  select role
  from public.organization_members
  where organization_id = org_id
    and profile_id = auth.uid()
  limit 1;
$$ language sql security definer stable;


-- ============================================================
-- 3. Policies corregidas en organization_members
-- ============================================================

-- SELECT: cada usuario ve solo sus propias filas de membresía
create policy "org_members: select"
  on public.organization_members for select
  using (profile_id = auth.uid());

-- INSERT: bootstrap como owner, o owner/admin agrega a otros
-- (get_my_org_ids y my_role_in_org usan security definer → sin recursión)
create policy "org_members: insert"
  on public.organization_members for insert
  with check (
    (profile_id = auth.uid() and role = 'owner')
    or public.my_role_in_org(organization_id) in ('owner', 'admin')
  );

-- DELETE: el usuario se elimina a sí mismo, o el owner elimina a cualquiera
create policy "org_members: delete"
  on public.organization_members for delete
  using (
    profile_id = auth.uid()
    or public.my_role_in_org(organization_id) = 'owner'
  );


-- ============================================================
-- 4. Policy corregida en profiles (también usaba org_members)
-- ============================================================

-- Función helper para verificar si dos perfiles comparten org
create or replace function public.is_in_same_org(target_profile_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.organization_members
    where profile_id = target_profile_id
      and organization_id = any(public.get_my_org_ids())
  );
$$ language sql security definer stable;

-- SELECT: usuarios ven perfiles de su misma organización
create policy "profiles: select misma org"
  on public.profiles for select
  using (public.is_in_same_org(id));
