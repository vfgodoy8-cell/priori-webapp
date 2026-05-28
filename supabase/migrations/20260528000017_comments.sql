-- Tabla de comentarios para iniciativas y proyectos
CREATE TABLE public.comments (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  author_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  initiative_id   uuid REFERENCES public.initiatives(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
  created_at      timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT comments_entity_check CHECK (
    (initiative_id IS NOT NULL AND project_id IS NULL) OR
    (initiative_id IS NULL AND project_id IS NOT NULL)
  )
);

CREATE INDEX comments_initiative_idx ON public.comments(initiative_id) WHERE initiative_id IS NOT NULL;
CREATE INDEX comments_project_idx    ON public.comments(project_id)    WHERE project_id    IS NOT NULL;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Miembros de la misma org pueden ver comentarios
CREATE POLICY "comments: select"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = comments.organization_id
        AND profile_id = auth.uid()
    )
  );

-- Miembros pueden insertar comentarios en su org
CREATE POLICY "comments: insert"
  ON public.comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = comments.organization_id
        AND profile_id = auth.uid()
    )
  );

-- Solo el autor puede borrar su comentario
CREATE POLICY "comments: delete"
  ON public.comments FOR DELETE
  USING (author_id = auth.uid());
