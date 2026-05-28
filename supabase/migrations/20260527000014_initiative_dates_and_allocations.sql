-- ============================================================
-- Priori™ — Fechas y asignación de personas en initiatives
-- ============================================================

ALTER TABLE public.initiatives
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date   date,
  ADD COLUMN IF NOT EXISTS team_allocations jsonb NOT NULL DEFAULT '{}';
