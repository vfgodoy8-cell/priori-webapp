-- ============================================================
-- Priori™ — Labels de nivel de grupo configurables por org
-- Mismo patrón que org_role_labels.
-- Defaults en código: 1=Grupo, 2=Subgrupo, 3=Equipo, 4=Célula
-- ============================================================

CREATE TABLE public.org_group_level_labels (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  level           int  NOT NULL CHECK (level BETWEEN 1 AND 4),
  label           text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 40),
  PRIMARY KEY (organization_id, level)
);

CREATE INDEX org_group_level_labels_org_idx
  ON public.org_group_level_labels(organization_id);

ALTER TABLE public.org_group_level_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_group_level_labels: select"
  ON public.org_group_level_labels FOR SELECT
  USING (public.my_role_in_org(organization_id) IS NOT NULL);

CREATE POLICY "org_group_level_labels: insert"
  ON public.org_group_level_labels FOR INSERT
  WITH CHECK (public.my_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE POLICY "org_group_level_labels: update"
  ON public.org_group_level_labels FOR UPDATE
  USING  (public.my_role_in_org(organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.my_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE POLICY "org_group_level_labels: delete"
  ON public.org_group_level_labels FOR DELETE
  USING (public.my_role_in_org(organization_id) IN ('owner', 'admin'));
