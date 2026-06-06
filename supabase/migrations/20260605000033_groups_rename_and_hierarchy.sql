-- ============================================================
-- Priori™ — Renombrar teams → groups + jerarquía
-- Las columnas FK existentes (roadmap_segments.team_id, etc.)
-- CONSERVAN su nombre — inconsistencia aceptada para minimizar churn.
-- ============================================================

-- 1. Renombrar tabla
ALTER TABLE public.teams RENAME TO groups;

-- 2. Renombrar índice
ALTER INDEX public.teams_org_idx RENAME TO groups_org_idx;

-- 3. Renombrar políticas RLS (contenido sin cambios — legacy EXISTS)
ALTER POLICY "teams: select" ON public.groups RENAME TO "groups: select";
ALTER POLICY "teams: insert" ON public.groups RENAME TO "groups: insert";
ALTER POLICY "teams: update" ON public.groups RENAME TO "groups: update";
ALTER POLICY "teams: delete" ON public.groups RENAME TO "groups: delete";

-- 4. Nuevas columnas
ALTER TABLE public.groups
  ADD COLUMN parent_id          uuid          NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
  ADD COLUMN level              int           NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 4),
  ADD COLUMN unit               text          NULL
    CHECK (unit IN ('hours','days','sprints','projects_per_person','story_points')),
  ADD COLUMN capacity_per_period numeric       NULL,
  ADD COLUMN updated_at         timestamptz   NOT NULL DEFAULT now();

-- 5. Trigger updated_at
CREATE TRIGGER set_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 6. Seed: copiar proy_per_persona → capacity_per_period
--    Los grupos migrados quedan como raíces (parent_id NULL, level 1)
UPDATE public.groups
SET capacity_per_period = proy_per_persona;
