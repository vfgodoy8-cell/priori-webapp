-- Fix: is_in_same_org usaba ANY(set-returning function) en WHERE
-- PostgreSQL no permite SRF en cláusulas WHERE.
-- Reemplazado por JOIN explícito entre las dos filas de membresía.

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
