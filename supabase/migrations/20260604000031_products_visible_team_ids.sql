-- Priori™ — Configuración de equipos visibles por producto en el Gantt

ALTER TABLE public.products
  ADD COLUMN visible_team_ids uuid[] DEFAULT NULL;

-- NULL = sin configurar (comportamiento automático)
-- []   = no se usa (equivale a NULL)
-- [uuid, ...] = exactamente esos equipos (más los que tengan segmento, que siempre se muestran)
