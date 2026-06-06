-- ============================================================
-- Priori™ — Ajustes de capacidad por rango de fechas
-- Reemplaza la disponibilidad por Q (q1_pct–q4_pct) con un modelo
-- flexible: vacaciones, licencias, reservas, etc.
-- kind='pct': value 0–100 (% de capacidad disponible)
-- kind='people_delta': value entero ± (personas a sumar/restar)
-- ============================================================

CREATE TABLE public.capacity_adjustments (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id        uuid        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  start_date      date        NOT NULL,
  end_date        date        NOT NULL CHECK (end_date >= start_date),
  kind            text        NOT NULL CHECK (kind IN ('pct', 'people_delta')),
  value           numeric     NOT NULL
    CHECK (
      (kind = 'pct' AND value BETWEEN 0 AND 100) OR
      (kind = 'people_delta')
    ),
  note            text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX capacity_adjustments_org_idx   ON public.capacity_adjustments(organization_id);
CREATE INDEX capacity_adjustments_group_idx ON public.capacity_adjustments(group_id, start_date, end_date);

CREATE TRIGGER set_capacity_adjustments_updated_at
  BEFORE UPDATE ON public.capacity_adjustments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.capacity_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capacity_adjustments: select"
  ON public.capacity_adjustments FOR SELECT
  USING (public.my_role_in_org(organization_id) IS NOT NULL);

CREATE POLICY "capacity_adjustments: insert"
  ON public.capacity_adjustments FOR INSERT
  WITH CHECK (public.my_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE POLICY "capacity_adjustments: update"
  ON public.capacity_adjustments FOR UPDATE
  USING  (public.my_role_in_org(organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.my_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE POLICY "capacity_adjustments: delete"
  ON public.capacity_adjustments FOR DELETE
  USING (public.my_role_in_org(organization_id) IN ('owner', 'admin'));

-- ============================================================
-- Seed: migrar q1_pct–q4_pct → ajustes del año actual
-- Solo para grupos con algún qN_pct != 100
-- ============================================================

INSERT INTO public.capacity_adjustments
  (organization_id, group_id, start_date, end_date, kind, value, note)
SELECT
  g.organization_id, g.id,
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 1, 1),
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 3, 31),
  'pct', g.q1_pct,
  'Migrado desde q1_pct'
FROM public.groups g
WHERE g.q1_pct <> 100;

INSERT INTO public.capacity_adjustments
  (organization_id, group_id, start_date, end_date, kind, value, note)
SELECT
  g.organization_id, g.id,
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 4, 1),
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 6, 30),
  'pct', g.q2_pct,
  'Migrado desde q2_pct'
FROM public.groups g
WHERE g.q2_pct <> 100;

INSERT INTO public.capacity_adjustments
  (organization_id, group_id, start_date, end_date, kind, value, note)
SELECT
  g.organization_id, g.id,
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 7, 1),
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 9, 30),
  'pct', g.q3_pct,
  'Migrado desde q3_pct'
FROM public.groups g
WHERE g.q3_pct <> 100;

INSERT INTO public.capacity_adjustments
  (organization_id, group_id, start_date, end_date, kind, value, note)
SELECT
  g.organization_id, g.id,
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 10, 1),
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 12, 31),
  'pct', g.q4_pct,
  'Migrado desde q4_pct'
FROM public.groups g
WHERE g.q4_pct <> 100;
