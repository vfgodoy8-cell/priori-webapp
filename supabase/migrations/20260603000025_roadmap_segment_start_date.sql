-- ============================================================
-- Priori™ — Roadmap: fecha de inicio anclada por segmento
-- ============================================================
-- Agrega start_date (date, nullable) a roadmap_segments.
-- NULL = posición calculada por reflow automático.
-- Valor = posición fija; ignora reflow y manual_start_sprint.
-- Precedencia en computeLayout: start_date > manual_start_sprint > reflow.
-- ============================================================

ALTER TABLE public.roadmap_segments
  ADD COLUMN IF NOT EXISTS start_date date;
