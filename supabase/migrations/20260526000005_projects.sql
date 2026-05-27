-- ============================================================
-- Priori™ — Tabla projects (Modo Squad)
-- ============================================================

create table public.projects (
  id               uuid default gen_random_uuid() primary key,
  organization_id  uuid references public.organizations(id) on delete cascade not null,
  name             text not null,
  description      text,
  impact_value     numeric not null default 0,
  impact_metric    text not null default 'revenue'
                     check (impact_metric in ('revenue', 'customers')),
  effort_sprints   integer not null default 1
                     check (effort_sprints between 1 and 24),
  stakeholder      text,
  production_date  date,
  dependencies     text,
  status           text not null default 'active'
                     check (status in ('active', 'discarded')),
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

-- Índice para queries por organización
create index projects_organization_id_idx on public.projects(organization_id);

-- updated_at automático
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.projects enable row level security;

-- SELECT: miembros de la organización ven sus proyectos
create policy "projects: select"
  on public.projects for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = projects.organization_id
        and profile_id = auth.uid()
    )
  );

-- INSERT: miembros de la organización pueden crear proyectos
create policy "projects: insert"
  on public.projects for insert
  with check (
    exists (
      select 1 from public.organization_members
      where organization_id = projects.organization_id
        and profile_id = auth.uid()
    )
  );

-- UPDATE: miembros de la organización pueden editar proyectos
create policy "projects: update"
  on public.projects for update
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = projects.organization_id
        and profile_id = auth.uid()
    )
  );

-- DELETE: miembros de la organización pueden eliminar proyectos
create policy "projects: delete"
  on public.projects for delete
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = projects.organization_id
        and profile_id = auth.uid()
    )
  );
