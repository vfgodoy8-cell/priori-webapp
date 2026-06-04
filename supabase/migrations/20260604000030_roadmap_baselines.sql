-- Priori™ — Líneas base del Roadmap

CREATE TABLE public.roadmap_baselines (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  product_id       uuid REFERENCES public.products(id)       ON DELETE CASCADE NOT NULL,
  name             text,
  captured_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  captured_at      timestamptz DEFAULT now() NOT NULL,
  snapshot         jsonb NOT NULL,
  created_at       timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX baselines_product_idx
  ON public.roadmap_baselines(product_id, captured_at DESC);

ALTER TABLE public.roadmap_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap_baselines: select"
  ON public.roadmap_baselines FOR SELECT
  USING (public.my_role_in_org(roadmap_baselines.organization_id) IS NOT NULL);

CREATE POLICY "roadmap_baselines: insert"
  ON public.roadmap_baselines FOR INSERT
  WITH CHECK (
    captured_by = auth.uid() AND
    public.my_role_in_org(roadmap_baselines.organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "roadmap_baselines: delete"
  ON public.roadmap_baselines FOR DELETE
  USING (public.my_role_in_org(roadmap_baselines.organization_id) IN ('owner', 'admin'));
