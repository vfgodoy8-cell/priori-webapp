-- ============================================================
-- Priori™ — RLS corregido (consolidado)
-- Reemplaza las policies del schema inicial.
-- Pegar completo en Supabase Studio → SQL Editor → Run
-- ============================================================


-- ============================================================
-- 1. DROP de policies a reemplazar
-- ============================================================

drop policy if exists "org_members: select miembros"  on public.organization_members;
drop policy if exists "org_members: insert"            on public.organization_members;
drop policy if exists "org_members: delete"            on public.organization_members;
drop policy if exists "profiles: select misma org"     on public.profiles;


-- ============================================================
-- 2. Funciones helper SECURITY DEFINER
-- Al bypassear RLS, evitan la recursión infinita.
-- ============================================================

-- Rol del usuario actual en una organización dada
create or replace function public.my_role_in_org(org_id uuid)
returns text as $$
  select role
  from public.organization_members
  where organization_id = org_id
    and profile_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- Verifica si dos perfiles comparten al menos una organización
create or replace function public.is_in_same_org(target_profile_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.organization_members om1
    join public.organization_members om2
      on om1.organization_id = om2.organization_id
    where om1.profile_id = auth.uid()
      and om2.profile_id = target_profile_id
  );
$$ language sql security definer stable;


-- ============================================================
-- 3. Policies corregidas — organization_members
-- ============================================================

-- SELECT: cada usuario ve solo sus propias filas
create policy "org_members: select"
  on public.organization_members for select
  using (profile_id = auth.uid());

-- INSERT: bootstrap como owner, o owner/admin agrega a otros
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
-- 4. Policy corregida — profiles
-- ============================================================

create policy "profiles: select misma org"
  on public.profiles for select
  using (public.is_in_same_org(id));
