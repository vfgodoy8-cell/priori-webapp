-- Historial de cambios por entidad (iniciativa / proyecto)
CREATE TABLE public.activity_log (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  actor_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type     text NOT NULL CHECK (entity_type IN ('initiative', 'project')),
  entity_id       uuid NOT NULL,
  entity_name     text NOT NULL,
  action          text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'placed', 'unplaced', 'discarded', 'restored', 'commented')),
  metadata        jsonb,
  created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX activity_log_org_idx    ON public.activity_log(organization_id, created_at DESC);
CREATE INDEX activity_log_entity_idx ON public.activity_log(entity_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log: select"
  ON public.activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = activity_log.organization_id
        AND profile_id = auth.uid()
    )
  );
