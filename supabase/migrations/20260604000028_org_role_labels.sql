-- ============================================================
-- Priori(tm) -- Labels de roles configurables por org
-- Permite que cada org renombre owner/admin/member
-- sin cambiar el modelo de permisos (enum member_role intacto)
-- ============================================================

CREATE TABLE public.org_role_labels (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  label           text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 40),
  PRIMARY KEY (organization_id, role)
);

CREATE INDEX org_role_labels_org_idx ON public.org_role_labels(organization_id);

ALTER TABLE public.org_role_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_role_labels: select"
  ON public.org_role_labels FOR SELECT
  USING (public.my_role_in_org(organization_id) IS NOT NULL);

CREATE POLICY "org_role_labels: insert"
  ON public.org_role_labels FOR INSERT
  WITH CHECK (public.my_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE POLICY "org_role_labels: update"
  ON public.org_role_labels FOR UPDATE
  USING  (public.my_role_in_org(organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.my_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE POLICY "org_role_labels: delete"
  ON public.org_role_labels FOR DELETE
  USING (public.my_role_in_org(organization_id) IN ('owner', 'admin'));
