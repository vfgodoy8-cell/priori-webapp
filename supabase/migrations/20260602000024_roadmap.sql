-- ============================================================
-- Priori™ — Fase 5: Modo Roadmap
-- Tablas: products, roadmap_segments, team_dependencies
-- ALTER: teams gana campo description
-- ============================================================

-- ── Campo description en teams ──────────────────────────────
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS description text;


-- ============================================================
-- products
-- ============================================================
CREATE TABLE public.products (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name            text NOT NULL CHECK (char_length(name) > 0),
  description     text,
  business_area   text,
  initiative_id   uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  start_date      date NOT NULL DEFAULT CURRENT_DATE,
  manual_mode     boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'discarded')),
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX products_org_idx ON public.products(organization_id);

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products: select"
  ON public.products FOR SELECT
  USING (public.my_role_in_org(products.organization_id) IS NOT NULL);

CREATE POLICY "products: insert"
  ON public.products FOR INSERT
  WITH CHECK (public.my_role_in_org(products.organization_id) IN ('owner', 'admin'));

CREATE POLICY "products: update"
  ON public.products FOR UPDATE
  USING  (public.my_role_in_org(products.organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.my_role_in_org(products.organization_id) IN ('owner', 'admin'));

CREATE POLICY "products: delete"
  ON public.products FOR DELETE
  USING (public.my_role_in_org(products.organization_id) IN ('owner', 'admin'));


-- ============================================================
-- roadmap_segments
-- Una fila por (product, team) — UNIQUE(product_id, team_id)
-- depends_on: array de IDs de otros segmentos (mismo producto u otros)
-- manual_start_sprint: posición fija cuando manual_mode está activo
-- ============================================================
CREATE TABLE public.roadmap_segments (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id     uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  product_id          uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  team_id             uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  label               text NOT NULL DEFAULT '',
  duration_sprints    integer NOT NULL DEFAULT 1
                        CHECK (duration_sprints BETWEEN 1 AND 52),
  depends_on          uuid[] NOT NULL DEFAULT '{}',
  manual_start_sprint integer CHECK (manual_start_sprint >= 0),
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT roadmap_segments_unique_product_team UNIQUE (product_id, team_id)
);

CREATE INDEX roadmap_segments_product_idx ON public.roadmap_segments(product_id);
CREATE INDEX roadmap_segments_org_idx     ON public.roadmap_segments(organization_id);
CREATE INDEX roadmap_segments_team_idx    ON public.roadmap_segments(team_id);

CREATE TRIGGER set_roadmap_segments_updated_at
  BEFORE UPDATE ON public.roadmap_segments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.roadmap_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap_segments: select"
  ON public.roadmap_segments FOR SELECT
  USING (public.my_role_in_org(roadmap_segments.organization_id) IS NOT NULL);

CREATE POLICY "roadmap_segments: insert"
  ON public.roadmap_segments FOR INSERT
  WITH CHECK (public.my_role_in_org(roadmap_segments.organization_id) IN ('owner', 'admin'));

CREATE POLICY "roadmap_segments: update"
  ON public.roadmap_segments FOR UPDATE
  USING  (public.my_role_in_org(roadmap_segments.organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.my_role_in_org(roadmap_segments.organization_id) IN ('owner', 'admin'));

CREATE POLICY "roadmap_segments: delete"
  ON public.roadmap_segments FOR DELETE
  USING (public.my_role_in_org(roadmap_segments.organization_id) IN ('owner', 'admin'));


-- ============================================================
-- team_dependencies
-- Dependencias entre equipos a nivel de programa (no por segmento).
-- Un equipo no puede depender de sí mismo.
-- ============================================================
CREATE TABLE public.team_dependencies (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  team_id           uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  depends_on_team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  description       text,
  created_at        timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT team_dependencies_no_self CHECK (team_id != depends_on_team_id),
  CONSTRAINT team_dependencies_unique  UNIQUE (team_id, depends_on_team_id)
);

CREATE INDEX team_dependencies_team_idx ON public.team_dependencies(team_id);
CREATE INDEX team_dependencies_org_idx  ON public.team_dependencies(organization_id);

ALTER TABLE public.team_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_dependencies: select"
  ON public.team_dependencies FOR SELECT
  USING (public.my_role_in_org(team_dependencies.organization_id) IS NOT NULL);

CREATE POLICY "team_dependencies: insert"
  ON public.team_dependencies FOR INSERT
  WITH CHECK (public.my_role_in_org(team_dependencies.organization_id) IN ('owner', 'admin'));

CREATE POLICY "team_dependencies: delete"
  ON public.team_dependencies FOR DELETE
  USING (public.my_role_in_org(team_dependencies.organization_id) IN ('owner', 'admin'));
