-- ============================================================
-- Priori(tm) -- Canales de negocio para Modo Roadmap
-- Tabla: channels (nueva)
-- ALTER: products gana channel_id (FK nullable)
-- Seed: 5 canales por defecto en orgs existentes
-- Onboarding: ver app/(app)/onboarding/actions.ts
-- ============================================================

-- ============================================================
-- channels
-- ============================================================
CREATE TABLE public.channels (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name            text NOT NULL CHECK (char_length(name) > 0),
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT channels_unique_name UNIQUE (organization_id, name)
);

CREATE INDEX channels_org_idx ON public.channels(organization_id);

CREATE TRIGGER set_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels: select"
  ON public.channels FOR SELECT
  USING (public.my_role_in_org(channels.organization_id) IS NOT NULL);

CREATE POLICY "channels: insert"
  ON public.channels FOR INSERT
  WITH CHECK (public.my_role_in_org(channels.organization_id) IN ('owner', 'admin'));

CREATE POLICY "channels: update"
  ON public.channels FOR UPDATE
  USING  (public.my_role_in_org(channels.organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.my_role_in_org(channels.organization_id) IN ('owner', 'admin'));

CREATE POLICY "channels: delete"
  ON public.channels FOR DELETE
  USING (public.my_role_in_org(channels.organization_id) IN ('owner', 'admin'));


-- ============================================================
-- products: agregar channel_id (business_area se mantiene)
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL;


-- ============================================================
-- Seed: 5 canales por defecto para cada org existente
-- ============================================================
INSERT INTO public.channels (organization_id, name, sort_order)
SELECT o.id, c.name, c.sort_order
FROM   public.organizations o
CROSS JOIN (VALUES
  ('Banco',       0),
  ('Mandarina',   1),
  ('Productores', 2),
  ('Andrea',      3),
  ('Affinity',    4)
) AS c(name, sort_order)
ON CONFLICT (organization_id, name) DO NOTHING;
