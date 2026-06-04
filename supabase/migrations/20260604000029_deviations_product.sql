-- Priori™ — Extender deviations al Modo Roadmap (producto)

-- 1. Nueva columna product_id (polimórfica, nullable)
ALTER TABLE public.deviations
  ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

-- 2. Nuevo campo affected_stakeholders
ALTER TABLE public.deviations
  ADD COLUMN affected_stakeholders text;

-- 3. Reemplazar el CHECK polimórfico
--    Antes: exactamente uno entre project_id / initiative_id
--    Ahora: exactamente uno entre project_id / initiative_id / product_id
ALTER TABLE public.deviations
  DROP CONSTRAINT deviations_entity_check;

ALTER TABLE public.deviations
  ADD CONSTRAINT deviations_entity_check CHECK (
    (CASE WHEN project_id    IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN initiative_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN product_id    IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

-- 4. Índice parcial para product_id
CREATE INDEX deviations_product_idx
  ON public.deviations(product_id)
  WHERE product_id IS NOT NULL;
