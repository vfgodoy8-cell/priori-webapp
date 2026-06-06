-- ============================================================
-- Priori™ — Estado de workspace por usuario + contexto
-- RLS especial: cada usuario solo accede a sus propias filas
-- (profile_id = auth.uid() + membresía válida en la org).
-- El jsonb queda preparado para sandbox/escenarios (sin UI v1).
-- ============================================================

CREATE TABLE public.user_workspace_state (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id      uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  context         text    NOT NULL
    CHECK (context IN ('squad','cross','roadmap','dashboard')),
  state           jsonb   NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, profile_id, context)
);

CREATE INDEX user_workspace_state_profile_idx
  ON public.user_workspace_state(profile_id, organization_id);

CREATE TRIGGER set_user_workspace_state_updated_at
  BEFORE UPDATE ON public.user_workspace_state
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.user_workspace_state ENABLE ROW LEVEL SECURITY;

-- Solo filas propias + debe ser miembro de la org
CREATE POLICY "user_workspace_state: select"
  ON public.user_workspace_state FOR SELECT
  USING (
    profile_id = auth.uid()
    AND public.my_role_in_org(organization_id) IS NOT NULL
  );

CREATE POLICY "user_workspace_state: insert"
  ON public.user_workspace_state FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND public.my_role_in_org(organization_id) IS NOT NULL
  );

CREATE POLICY "user_workspace_state: update"
  ON public.user_workspace_state FOR UPDATE
  USING (
    profile_id = auth.uid()
    AND public.my_role_in_org(organization_id) IS NOT NULL
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND public.my_role_in_org(organization_id) IS NOT NULL
  );

CREATE POLICY "user_workspace_state: delete"
  ON public.user_workspace_state FOR DELETE
  USING (
    profile_id = auth.uid()
    AND public.my_role_in_org(organization_id) IS NOT NULL
  );
