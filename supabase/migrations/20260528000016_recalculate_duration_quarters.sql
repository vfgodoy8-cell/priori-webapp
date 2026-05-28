-- Recalcular duration_quarters a partir de effort_sprints
-- Formula: CEIL(effort_sprints / 6), maximo 4
-- Un quarter = 3 meses = 6 sprints de 2 semanas
UPDATE public.initiatives
SET duration_quarters = LEAST(CEIL(effort_sprints::numeric / 6), 4)
WHERE effort_sprints IS NOT NULL;
