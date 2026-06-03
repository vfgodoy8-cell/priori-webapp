-- Priori™ — Fase 5: tabla deviations (Agenda de Desvíos)

CREATE TABLE public.deviations (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id     uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  project_id          uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  initiative_id       uuid REFERENCES public.initiatives(id) ON DELETE CASCADE,
  reported_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  date                date NOT NULL DEFAULT CURRENT_DATE,
  reason              text NOT NULL CHECK (char_length(reason) > 0),
  blocking_dependency text,
  affected_dependency text,
  status              text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  source              text,
  external_ref        text,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT deviations_entity_check CHECK (
    (project_id IS NOT NULL AND initiative_id IS NULL) OR
    (project_id IS NULL AND initiative_id IS NOT NULL)
  )
);

CREATE INDEX deviations_project_idx    ON public.deviations(project_id)    WHERE project_id    IS NOT NULL;
CREATE INDEX deviations_initiative_idx ON public.deviations(initiative_id) WHERE initiative_id IS NOT NULL;
CREATE INDEX deviations_org_idx        ON public.deviations(organization_id, created_at DESC);

CREATE TRIGGER set_deviations_updated_at
  BEFORE UPDATE ON public.deviations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.deviations ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier miembro de la org
CREATE POLICY "deviations: select"
  ON public.deviations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = deviations.organization_id
        AND profile_id = auth.uid()
    )
  );

-- INSERT: cualquier miembro puede reportar un desvío
CREATE POLICY "deviations: insert"
  ON public.deviations FOR INSERT
  WITH CHECK (
    reported_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = deviations.organization_id
        AND profile_id = auth.uid()
    )
  );

-- UPDATE: solo owner/admin (canWrite)
CREATE POLICY "deviations: update"
  ON public.deviations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = deviations.organization_id
        AND profile_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = deviations.organization_id
        AND profile_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- DELETE: solo owner/admin (canWrite)
CREATE POLICY "deviations: delete"
  ON public.deviations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = deviations.organization_id
        AND profile_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Agregar acciones 'blocked' y 'unblocked' al CHECK de activity_log
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_action_check;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_action_check
  CHECK (action IN ('created', 'updated', 'deleted', 'placed', 'unplaced', 'discarded', 'restored', 'commented', 'blocked', 'unblocked'));
