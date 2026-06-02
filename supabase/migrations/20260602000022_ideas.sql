-- Priori™ — Fase 5: tabla ideas ("Tengo una idea")
CREATE TABLE public.ideas (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  created_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title            text NOT NULL CHECK (char_length(title) > 0),
  problem          text NOT NULL CHECK (char_length(problem) > 0),
  current_situation text,
  expected_result  text,
  suggested_type   text CHECK (suggested_type IN ('mejora', 'nuevo_desarrollo', 'cambio_proceso')),
  status           text NOT NULL DEFAULT 'raw'
                     CHECK (status IN ('raw', 'refined', 'promoted', 'discarded')),
  raw_transcript   jsonb,
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX ideas_org_idx    ON public.ideas(organization_id, created_at DESC);
CREATE INDEX ideas_status_idx ON public.ideas(organization_id, status);

CREATE TRIGGER set_ideas_updated_at
  BEFORE UPDATE ON public.ideas
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier miembro de la org puede ver ideas
CREATE POLICY "ideas: select"
  ON public.ideas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = ideas.organization_id
        AND profile_id = auth.uid()
    )
  );

-- INSERT: cualquier miembro puede crear ideas (incluyendo role 'member')
CREATE POLICY "ideas: insert"
  ON public.ideas FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = ideas.organization_id
        AND profile_id = auth.uid()
    )
  );

-- UPDATE: solo owner/admin (canWrite)
CREATE POLICY "ideas: update"
  ON public.ideas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = ideas.organization_id
        AND profile_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = ideas.organization_id
        AND profile_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- DELETE: solo owner/admin (canWrite)
CREATE POLICY "ideas: delete"
  ON public.ideas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = ideas.organization_id
        AND profile_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
