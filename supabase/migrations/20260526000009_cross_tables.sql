-- ============================================================
-- Modo Cross: tabla teams
-- ============================================================
create table public.teams (
  id               uuid default gen_random_uuid() primary key,
  organization_id  uuid references public.organizations(id) on delete cascade not null,
  name             text not null,
  personas         integer not null default 3 check (personas >= 1),
  proy_per_persona integer not null default 1 check (proy_per_persona >= 1),
  q1_pct           integer not null default 100 check (q1_pct between 0 and 100),
  q2_pct           integer not null default 100 check (q2_pct between 0 and 100),
  q3_pct           integer not null default 100 check (q3_pct between 0 and 100),
  q4_pct           integer not null default 100 check (q4_pct between 0 and 100),
  sort_order       integer not null default 0,
  created_at       timestamptz default now() not null
);

create index teams_org_idx on public.teams(organization_id);
alter table public.teams enable row level security;

create policy "teams: select" on public.teams for select
  using (exists (select 1 from public.organization_members
    where organization_id = teams.organization_id and profile_id = auth.uid()));
create policy "teams: insert" on public.teams for insert
  with check (exists (select 1 from public.organization_members
    where organization_id = teams.organization_id and profile_id = auth.uid()));
create policy "teams: update" on public.teams for update
  using (exists (select 1 from public.organization_members
    where organization_id = teams.organization_id and profile_id = auth.uid()));
create policy "teams: delete" on public.teams for delete
  using (exists (select 1 from public.organization_members
    where organization_id = teams.organization_id and profile_id = auth.uid()));

-- ============================================================
-- Modo Cross: tabla initiatives
-- ============================================================
create table public.initiatives (
  id                  uuid default gen_random_uuid() primary key,
  organization_id     uuid references public.organizations(id) on delete cascade not null,
  name                text not null,
  stakeholder         text,
  impact_value        numeric not null default 0,
  impact_metric       text not null default 'revenue'
                        check (impact_metric in ('revenue', 'customers')),
  effort_sprints      integer not null default 1 check (effort_sprints between 1 and 24),
  duration_quarters   integer not null default 1 check (duration_quarters between 1 and 4),
  q_start             integer check (q_start between 0 and 3),  -- null = backlog
  team_ids            jsonb not null default '[]',
  description         text,
  sq_project_ids      jsonb not null default '[]',
  status              text not null default 'active'
                        check (status in ('active', 'discarded')),
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

create index initiatives_org_idx on public.initiatives(organization_id);

create trigger set_initiatives_updated_at
  before update on public.initiatives
  for each row execute procedure public.handle_updated_at();

alter table public.initiatives enable row level security;

create policy "initiatives: select" on public.initiatives for select
  using (exists (select 1 from public.organization_members
    where organization_id = initiatives.organization_id and profile_id = auth.uid()));
create policy "initiatives: insert" on public.initiatives for insert
  with check (exists (select 1 from public.organization_members
    where organization_id = initiatives.organization_id and profile_id = auth.uid()));
create policy "initiatives: update" on public.initiatives for update
  using (exists (select 1 from public.organization_members
    where organization_id = initiatives.organization_id and profile_id = auth.uid()));
create policy "initiatives: delete" on public.initiatives for delete
  using (exists (select 1 from public.organization_members
    where organization_id = initiatives.organization_id and profile_id = auth.uid()));

-- Equipos default para nuevas organizaciones (se insertan con trigger o desde la app)
