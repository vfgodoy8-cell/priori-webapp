-- squad_status: en curso (dentro del círculo) o backlog (fuera del círculo)
alter table public.projects
  add column if not exists squad_status text not null default 'backlog'
    check (squad_status in ('backlog', 'curso'));
