-- ============================================================
-- Seed de datos de prueba para organización TLS
-- Basado en priori-estimador-v2.html
-- ============================================================

do $$
declare
  v_org_id  uuid;
  v_sd_id   uuid;   -- Software Delivery
  v_arq_id  uuid;   -- Arquitectura
  v_inf_id  uuid;   -- Infraestructura
  v_seg_id  uuid;   -- Seg. Informatica
  v_qa_id   uuid;   -- QA
  v_da_id   uuid;   -- Data & Analytics
begin

  -- Resolver org TLS
  select id into v_org_id
  from public.organizations
  where name = 'TLS'
  limit 1;

  if v_org_id is null then
    raise exception 'Organización TLS no encontrada. Creala en /onboarding primero.';
  end if;

  -- Limpiar datos previos (idempotente)
  delete from public.initiatives where organization_id = v_org_id;
  delete from public.teams       where organization_id = v_org_id;
  delete from public.projects    where organization_id = v_org_id;

  -- ==========================================
  -- EQUIPOS
  -- ==========================================

  insert into public.teams
    (organization_id, name, personas, proy_per_persona, q1_pct, q2_pct, q3_pct, q4_pct, sort_order)
  values (v_org_id, 'Software Delivery', 8, 1, 80, 80, 60, 70, 0)
  returning id into v_sd_id;

  insert into public.teams
    (organization_id, name, personas, proy_per_persona, q1_pct, q2_pct, q3_pct, q4_pct, sort_order)
  values (v_org_id, 'Arquitectura', 4, 1, 50, 70, 70, 50, 1)
  returning id into v_arq_id;

  insert into public.teams
    (organization_id, name, personas, proy_per_persona, q1_pct, q2_pct, q3_pct, q4_pct, sort_order)
  values (v_org_id, 'Infraestructura', 5, 1, 70, 60, 80, 70, 2)
  returning id into v_inf_id;

  insert into public.teams
    (organization_id, name, personas, proy_per_persona, q1_pct, q2_pct, q3_pct, q4_pct, sort_order)
  values (v_org_id, 'Seg. Informatica', 3, 1, 30, 30, 80, 40, 3)
  returning id into v_seg_id;

  insert into public.teams
    (organization_id, name, personas, proy_per_persona, q1_pct, q2_pct, q3_pct, q4_pct, sort_order)
  values (v_org_id, 'QA', 6, 1, 70, 70, 60, 80, 4)
  returning id into v_qa_id;

  insert into public.teams
    (organization_id, name, personas, proy_per_persona, q1_pct, q2_pct, q3_pct, q4_pct, sort_order)
  values (v_org_id, 'Data & Analytics', 3, 1, 60, 80, 60, 50, 5)
  returning id into v_da_id;

  -- ==========================================
  -- PROYECTOS SQUAD
  -- ==========================================

  insert into public.projects
    (organization_id, name, stakeholder, impact_value, impact_metric,
     effort_sprints, sprints_completed, squad_status, production_date, status)
  values
    (v_org_id, 'Portal clientes',  'Banco ABC',  5000000, 'revenue', 3,  2, 'curso',   '2026-07-15', 'active'),
    (v_org_id, 'API pagos',        'Fintech SA', 4500000, 'revenue', 2,  1, 'curso',   '2026-06-01', 'active'),
    (v_org_id, 'Modulo reportes',  'Retail XYZ', 1500000, 'revenue', 4,  0, 'backlog', '2026-09-01', 'active'),
    (v_org_id, 'Migracion DB',     'Interno',     800000, 'revenue', 2,  0, 'backlog', '2026-10-01', 'active'),
    (v_org_id, 'App mobile',       'Banco ABC',  6000000, 'revenue', 12, 0, 'backlog', '2026-12-01', 'active'),
    (v_org_id, 'SSO integracion',  'Fintech SA', 3000000, 'revenue', 3,  0, 'backlog', '2026-08-15', 'active');

  -- Dependencia: App mobile → Portal clientes
  update public.projects
  set dependencies = 'Portal clientes'
  where organization_id = v_org_id and name = 'App mobile';

  -- ==========================================
  -- INICIATIVAS CROSS
  -- q_start: 0=Q1, 1=Q2, 2=Q3, 3=Q4, null=sin asignar
  -- ==========================================

  insert into public.initiatives
    (organization_id, name, stakeholder, impact_value, impact_metric,
     effort_sprints, duration_quarters, q_start, team_ids, status)
  values
    (v_org_id,
     'Transformacion Digital Core', 'Direccion General',
     9000000, 'revenue', 8, 2, 0,
     jsonb_build_array(v_sd_id::text, v_arq_id::text, v_inf_id::text),
     'active'),

    (v_org_id,
     'Plataforma de Pagos', 'Fintech SA',
     6500000, 'revenue', 4, 1, 1,
     jsonb_build_array(v_sd_id::text, v_seg_id::text),
     'active'),

    (v_org_id,
     'Migracion a Cloud', 'Infraestructura',
     5000000, 'revenue', 16, 3, null,
     jsonb_build_array(v_arq_id::text, v_inf_id::text, v_seg_id::text),
     'active'),

    (v_org_id,
     'Plataforma de Datos', 'Data Office',
     4000000, 'revenue', 6, 2, 2,
     jsonb_build_array(v_sd_id::text, v_da_id::text),
     'active'),

    (v_org_id,
     'Auditoria Compliance', 'Compliance',
     3000000, 'revenue', 3, 1, 2,
     jsonb_build_array(v_seg_id::text, v_qa_id::text),
     'active'),

    (v_org_id,
     'Portal Autogestion', 'Canales',
     2500000, 'revenue', 5, 1, null,
     jsonb_build_array(v_sd_id::text, v_qa_id::text),
     'active');

  raise notice 'Seed completado — org: % (id: %)', 'TLS', v_org_id;
  raise notice 'Teams: SD=%, ARQ=%, INF=%, SEG=%, QA=%, DA=%',
    v_sd_id, v_arq_id, v_inf_id, v_seg_id, v_qa_id, v_da_id;

end;
$$;
