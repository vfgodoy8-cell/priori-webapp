-- ============================================================
-- Priori™ — Roadmap: fecha de salida objetivo del producto
-- ============================================================
-- Agrega target_launch_date (date, nullable) a products.
-- NULL = sin fecha de salida definida.
-- Se muestra como badge en el Gantt del producto.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS target_launch_date date;
