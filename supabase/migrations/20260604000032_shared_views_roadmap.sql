-- Priori™ — Extender shared_views para Modo Roadmap

-- 1. Ampliar el CHECK de mode
ALTER TABLE public.shared_views
  DROP CONSTRAINT shared_views_mode_check;

ALTER TABLE public.shared_views
  ADD CONSTRAINT shared_views_mode_check
    CHECK (mode IN ('squad', 'cross', 'roadmap'));

-- 2. Agregar product_id (nullable — solo se usa cuando mode = 'roadmap')
ALTER TABLE public.shared_views
  ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;
