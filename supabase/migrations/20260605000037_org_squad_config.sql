-- ============================================================
-- Priori™ — Configuración del Modo Squad por organización
-- Mueve SquadConfig de localStorage a DB.
-- Defaults tomados de DEFAULT_CONFIG en lib/squad-logic.ts.
-- ============================================================

CREATE TABLE public.org_squad_config (
  organization_id uuid    PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  dev_n           int     NOT NULL DEFAULT 3  CHECK (dev_n >= 1),
  dev_p           int     NOT NULL DEFAULT 1  CHECK (dev_p >= 1),
  metric          text    NOT NULL DEFAULT 'money' CHECK (metric IN ('money', 'clients')),
  i_high          numeric NOT NULL DEFAULT 4000000,
  i_mid           numeric NOT NULL DEFAULT 2000000,
  e_high          int     NOT NULL DEFAULT 8  CHECK (e_high >= 1),
  e_mid           int     NOT NULL DEFAULT 4  CHECK (e_mid >= 1),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_org_squad_config_updated_at
  BEFORE UPDATE ON public.org_squad_config
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.org_squad_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_squad_config: select"
  ON public.org_squad_config FOR SELECT
  USING (public.my_role_in_org(organization_id) IS NOT NULL);

CREATE POLICY "org_squad_config: insert"
  ON public.org_squad_config FOR INSERT
  WITH CHECK (public.my_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE POLICY "org_squad_config: update"
  ON public.org_squad_config FOR UPDATE
  USING  (public.my_role_in_org(organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.my_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE POLICY "org_squad_config: delete"
  ON public.org_squad_config FOR DELETE
  USING (public.my_role_in_org(organization_id) IN ('owner', 'admin'));
