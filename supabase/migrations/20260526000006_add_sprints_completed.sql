-- Agrega sprints_completed a projects para el anillo de progreso
alter table public.projects
  add column if not exists sprints_completed integer not null default 0
    check (sprints_completed >= 0);
