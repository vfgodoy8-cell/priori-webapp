-- ============================================================
-- Priori™ — Configuración de capacidad por organización
-- Si una org no tiene fila, el código usa los defaults de columna.
-- ============================================================

CREATE TABLE public.org_capacity_settings (
  organization_id    uuid    PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  sprint_weeks       int     NOT NULL DEFAULT 2
    CHECK (sprint_weeks BETWEEN 1 AND 8),
  hours_per_day      numeric NOT NULL DEFAULT 8
    CHECK (hours_per_day > 0 AND hours_per_day <= 24),
  workdays_per_week  int     NOT NULL DEFAULT 5
    CHECK (workdays_per_week BETWEEN 1 AND 7),
  default_unit       text    NOT NULL DEFAULT 'sprints'
    CHECK (default_unit IN ('hours','days','sprints','projects_per_person','story_points')),
  consolidation_period text  NOT NULL DEFAULT 'sprint'
    CHECK (consolidation_period IN ('sprint','month','quarter')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_org_capacity_settings_updated_at
  BEFORE UPDATE ON public.org_capacity_settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.org_capacity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_capacity_settings: select"
  ON public.org_capacity_settings FOR SELECT
  USING (public.my_role_in_org(organization_id) IS NOT NULL);

CREATE POLICY "org_capacity_settings: insert"
  ON public.org_capacity_settings FOR INSERT
  WITH CHECK (public.my_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE POLICY "org_capacity_settings: update"
  ON public.org_capacity_settings FOR UPDATE
  USING  (public.my_role_in_org(organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.my_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE POLICY "org_capacity_settings: delete"
  ON public.org_capacity_settings FOR DELETE
  USING (public.my_role_in_org(organization_id) IN ('owner', 'admin'));
