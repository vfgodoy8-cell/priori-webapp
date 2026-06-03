-- ============================================================
-- Priori™ — Seed demo Modo Roadmap: 10 productos de seguros
-- ============================================================
-- Idempotente: borra y recrea los 10 productos de demo con sus
-- segmentos para la primera organización existente.
--
-- Requiere >= 3 equipos en la org (usa los primeros 3 por sort_order).
-- Los productos con start_dates escalonados a lo largo de 2026
-- ejercitan el reflow automático (Kahn + greedy).
--
-- CÓMO CORRERLO
-- ─────────────
-- Opción A — Supabase Dashboard (recomendada):
--   1. Abrí https://supabase.com/dashboard → tu proyecto → SQL Editor
--   2. "New query" → pegá el contenido de este archivo → Run
--
-- Opción B — Supabase CLI (si está instalado y linkeado):
--   npx supabase db execute --file supabase/seed-roadmap-demo.sql
--
-- Opción C — psql directo:
--   psql "$(npx supabase db url)" -f supabase/seed-roadmap-demo.sql
--
-- Para limpiar el seed: volvé a correrlo (es idempotente).
-- ============================================================

do $$
declare
  v_org_id     uuid;
  v_org_name   text;
  v_team_count int;
  v_t1         uuid;   -- primer  equipo (sort_order ASC)
  v_t2         uuid;   -- segundo equipo
  v_t3         uuid;   -- tercer  equipo

  -- IDs de productos (pre-generados para no necesitar RETURNING)
  v_p_hogar    uuid := gen_random_uuid();
  v_p_auto     uuid := gen_random_uuid();
  v_p_vida     uuid := gen_random_uuid();
  v_p_ap       uuid := gen_random_uuid();
  v_p_art      uuid := gen_random_uuid();
  v_p_robo     uuid := gen_random_uuid();
  v_p_caucion  uuid := gen_random_uuid();
  v_p_sep      uuid := gen_random_uuid();
  v_p_micro    uuid := gen_random_uuid();
  v_p_bolso    uuid := gen_random_uuid();

  -- IDs de segmentos (pre-generados para poder referenciarlos en depends_on)
  -- Hogar (3)
  vs_h1  uuid := gen_random_uuid();
  vs_h2  uuid := gen_random_uuid();
  vs_h3  uuid := gen_random_uuid();
  -- Auto (3)
  vs_a1  uuid := gen_random_uuid();
  vs_a2  uuid := gen_random_uuid();
  vs_a3  uuid := gen_random_uuid();
  -- Vida (3)
  vs_v1  uuid := gen_random_uuid();
  vs_v2  uuid := gen_random_uuid();
  vs_v3  uuid := gen_random_uuid();
  -- Accidentes Personales (2)
  vs_ap1 uuid := gen_random_uuid();
  vs_ap2 uuid := gen_random_uuid();
  -- ART (3)
  vs_ar1 uuid := gen_random_uuid();
  vs_ar2 uuid := gen_random_uuid();
  vs_ar3 uuid := gen_random_uuid();
  -- Robo (3)
  vs_r1  uuid := gen_random_uuid();
  vs_r2  uuid := gen_random_uuid();
  vs_r3  uuid := gen_random_uuid();
  -- Caución (2)
  vs_c1  uuid := gen_random_uuid();
  vs_c2  uuid := gen_random_uuid();
  -- Sepelio (3)
  vs_s1  uuid := gen_random_uuid();
  vs_s2  uuid := gen_random_uuid();
  vs_s3  uuid := gen_random_uuid();
  -- Microseguros (3, fan-out desde análisis)
  vs_m1  uuid := gen_random_uuid();
  vs_m2  uuid := gen_random_uuid();
  vs_m3  uuid := gen_random_uuid();
  -- Bolso Protegido (3)
  vs_b1  uuid := gen_random_uuid();
  vs_b2  uuid := gen_random_uuid();
  vs_b3  uuid := gen_random_uuid();

begin

  -- ── Resolver primera organización ────────────────────────────
  select id, name into v_org_id, v_org_name
  from public.organizations
  order by created_at
  limit 1;

  if v_org_id is null then
    raise exception 'No hay organizaciones. Creá una en /onboarding primero.';
  end if;

  -- ── Verificar equipos ─────────────────────────────────────────
  select count(*) into v_team_count
  from public.teams
  where organization_id = v_org_id;

  if v_team_count < 3 then
    raise exception
      'La org "%" necesita >= 3 equipos (tiene %). Configuralos en /onboarding/teams.',
      v_org_name, v_team_count;
  end if;

  -- Tomar los primeros 3 equipos ordenados por sort_order
  select id into v_t1 from public.teams
    where organization_id = v_org_id order by sort_order limit 1 offset 0;
  select id into v_t2 from public.teams
    where organization_id = v_org_id order by sort_order limit 1 offset 1;
  select id into v_t3 from public.teams
    where organization_id = v_org_id order by sort_order limit 1 offset 2;

  -- ── Borrar seed anterior (idempotente) ────────────────────────
  -- ON DELETE CASCADE en roadmap_segments → se borran automáticamente.
  delete from public.products
  where organization_id = v_org_id
    and name in (
      'Hogar', 'Auto', 'Vida', 'Accidentes Personales',
      'ART', 'Robo', 'Caución', 'Sepelio', 'Microseguros', 'Bolso Protegido'
    );

  -- ── Productos ─────────────────────────────────────────────────
  -- start_date escalonado cada ~2 semanas para distribuir el Gantt en 2026.
  -- business_area: Personas / Empresas / Digital

  insert into public.products
    (id, organization_id, name, description, business_area, start_date, sort_order)
  values
    (v_p_hogar,
     v_org_id,
     'Hogar',
     'Seguro multirriesgo para inmuebles y contenido del hogar',
     'Personas', '2026-01-05', 0),

    (v_p_auto,
     v_org_id,
     'Auto',
     'Seguro automotor con cobertura de responsabilidad civil y todo riesgo',
     'Personas', '2026-01-19', 1),

    (v_p_vida,
     v_org_id,
     'Vida',
     'Seguro de vida individual con cobertura por fallecimiento e invalidez',
     'Personas', '2026-02-02', 2),

    (v_p_ap,
     v_org_id,
     'Accidentes Personales',
     'Cobertura de accidentes 24/7 para personas y grupos familiares',
     'Personas', '2026-02-16', 3),

    (v_p_art,
     v_org_id,
     'ART',
     'Aseguradora de Riesgos del Trabajo — obligatoria para empleadores',
     'Empresas', '2026-03-02', 4),

    (v_p_robo,
     v_org_id,
     'Robo',
     'Cobertura de robo y hurto para bienes personales y empresariales',
     'Personas', '2026-03-16', 5),

    (v_p_caucion,
     v_org_id,
     'Caución',
     'Garantías para licitaciones, contratos y cumplimiento de obligaciones',
     'Empresas', '2026-04-06', 6),

    (v_p_sep,
     v_org_id,
     'Sepelio',
     'Servicio de sepelio y repatriación con red de funerarias adheridas',
     'Personas', '2026-05-04', 7),

    (v_p_micro,
     v_org_id,
     'Microseguros',
     'Seguros accesibles de bajo costo para segmentos emergentes',
     'Digital', '2026-06-01', 8),

    (v_p_bolso,
     v_org_id,
     'Bolso Protegido',
     'Cobertura de objetos personales contra robo y daño accidental',
     'Digital', '2026-07-06', 9);

  -- ── Segmentos ─────────────────────────────────────────────────
  -- Cada producto usa t1/t2/t3 como máximo una vez (UNIQUE product_id+team_id).
  -- depends_on ejercita distintos patrones de grafo para el motor Kahn:
  --   cadena lineal (Hogar, Vida, ART, Robo, Sepelio, Bolso)
  --   bifurcación desde raíz (Auto: t2→{t1,t3})
  --   convergencia al final (Microseguros: {t1,t2}←t3 como raíz)

  -- ── Hogar: cadena t1 → t2 → t3 ──────────────────────────────
  insert into public.roadmap_segments
    (id, organization_id, product_id, team_id, label, duration_sprints, depends_on, sort_order)
  values
    (vs_h1, v_org_id, v_p_hogar, v_t1, 'Relevamiento técnico',  3, ARRAY[]::uuid[],    0),
    (vs_h2, v_org_id, v_p_hogar, v_t2, 'Desarrollo backend',    5, ARRAY[vs_h1]::uuid[], 1),
    (vs_h3, v_org_id, v_p_hogar, v_t3, 'Testing y QA',          2, ARRAY[vs_h2]::uuid[], 2);

  -- ── Auto: t2 (análisis) → {t1, t3} en paralelo ───────────────
  insert into public.roadmap_segments
    (id, organization_id, product_id, team_id, label, duration_sprints, depends_on, sort_order)
  values
    (vs_a1, v_org_id, v_p_auto, v_t2, 'Análisis de cobertura', 2, ARRAY[]::uuid[],    0),
    (vs_a2, v_org_id, v_p_auto, v_t1, 'Motor de cotización',   6, ARRAY[vs_a1]::uuid[], 1),
    (vs_a3, v_org_id, v_p_auto, v_t3, 'Integración DNRPA',     4, ARRAY[vs_a1]::uuid[], 2);

  -- ── Vida: cadena t3 → t1 → t2 ───────────────────────────────
  insert into public.roadmap_segments
    (id, organization_id, product_id, team_id, label, duration_sprints, depends_on, sort_order)
  values
    (vs_v1, v_org_id, v_p_vida, v_t3, 'Diseño actuarial',          3, ARRAY[]::uuid[],    0),
    (vs_v2, v_org_id, v_p_vida, v_t1, 'Plataforma de pólizas',     8, ARRAY[vs_v1]::uuid[], 1),
    (vs_v3, v_org_id, v_p_vida, v_t2, 'Portal de beneficiarios',   4, ARRAY[vs_v2]::uuid[], 2);

  -- ── Accidentes Personales: t3 → t1 ─────────────────────────
  insert into public.roadmap_segments
    (id, organization_id, product_id, team_id, label, duration_sprints, depends_on, sort_order)
  values
    (vs_ap1, v_org_id, v_p_ap, v_t3, 'Análisis regulatorio',      3, ARRAY[]::uuid[],      0),
    (vs_ap2, v_org_id, v_p_ap, v_t1, 'Motor de indemnizaciones',  5, ARRAY[vs_ap1]::uuid[], 1);

  -- ── ART: cadena t2 → t1 → t3 ────────────────────────────────
  insert into public.roadmap_segments
    (id, organization_id, product_id, team_id, label, duration_sprints, depends_on, sort_order)
  values
    (vs_ar1, v_org_id, v_p_art, v_t2, 'Arquitectura de servicios', 4, ARRAY[]::uuid[],      0),
    (vs_ar2, v_org_id, v_p_art, v_t1, 'Desarrollo ART',            6, ARRAY[vs_ar1]::uuid[], 1),
    (vs_ar3, v_org_id, v_p_art, v_t3, 'Reporting de siniestros',   3, ARRAY[vs_ar2]::uuid[], 2);

  -- ── Robo: cadena t1 → t2 → t3 ───────────────────────────────
  insert into public.roadmap_segments
    (id, organization_id, product_id, team_id, label, duration_sprints, depends_on, sort_order)
  values
    (vs_r1, v_org_id, v_p_robo, v_t1, 'Diseño UX/UI',             2, ARRAY[]::uuid[],    0),
    (vs_r2, v_org_id, v_p_robo, v_t2, 'Backend de siniestros',    4, ARRAY[vs_r1]::uuid[], 1),
    (vs_r3, v_org_id, v_p_robo, v_t3, 'Pruebas de aceptación',    2, ARRAY[vs_r2]::uuid[], 2);

  -- ── Caución: t3 → t1 ────────────────────────────────────────
  insert into public.roadmap_segments
    (id, organization_id, product_id, team_id, label, duration_sprints, depends_on, sort_order)
  values
    (vs_c1, v_org_id, v_p_caucion, v_t3, 'Relevamiento legal',       3, ARRAY[]::uuid[],    0),
    (vs_c2, v_org_id, v_p_caucion, v_t1, 'Plataforma de garantías',  6, ARRAY[vs_c1]::uuid[], 1);

  -- ── Sepelio: cadena t2 → t1 → t3 ────────────────────────────
  insert into public.roadmap_segments
    (id, organization_id, product_id, team_id, label, duration_sprints, depends_on, sort_order)
  values
    (vs_s1, v_org_id, v_p_sep, v_t2, 'Prototipo y validación',  2, ARRAY[]::uuid[],    0),
    (vs_s2, v_org_id, v_p_sep, v_t1, 'Integración funerarias',  4, ARRAY[vs_s1]::uuid[], 1),
    (vs_s3, v_org_id, v_p_sep, v_t3, 'QA y certificación',      2, ARRAY[vs_s2]::uuid[], 2);

  -- ── Microseguros: t3 (raíz) → {t1, t2} en paralelo ──────────
  insert into public.roadmap_segments
    (id, organization_id, product_id, team_id, label, duration_sprints, depends_on, sort_order)
  values
    (vs_m1, v_org_id, v_p_micro, v_t3, 'Análisis de segmento',   3, ARRAY[]::uuid[],      0),
    (vs_m2, v_org_id, v_p_micro, v_t1, 'App de emisión digital', 5, ARRAY[vs_m1]::uuid[], 1),
    (vs_m3, v_org_id, v_p_micro, v_t2, 'Portal de agentes',      4, ARRAY[vs_m1]::uuid[], 2);

  -- ── Bolso Protegido: cadena t2 → t1 → t3 ────────────────────
  insert into public.roadmap_segments
    (id, organization_id, product_id, team_id, label, duration_sprints, depends_on, sort_order)
  values
    (vs_b1, v_org_id, v_p_bolso, v_t2, 'Diseño de producto',         2, ARRAY[]::uuid[],    0),
    (vs_b2, v_org_id, v_p_bolso, v_t1, 'Integración canal retail',   5, ARRAY[vs_b1]::uuid[], 1),
    (vs_b3, v_org_id, v_p_bolso, v_t3, 'Pruebas end-to-end',         3, ARRAY[vs_b2]::uuid[], 2);

  raise notice
    'Seed Roadmap completado — org: "%" | 10 productos | 28 segmentos | equipos: %, %, %',
    v_org_name,
    (select name from public.teams where id = v_t1),
    (select name from public.teams where id = v_t2),
    (select name from public.teams where id = v_t3);

end;
$$;
