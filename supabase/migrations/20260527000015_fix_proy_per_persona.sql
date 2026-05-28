-- Corregir proy_per_persona a valores razonables (máximo 3)
-- Equipos con valores > 3 generan capacidades absurdas (ej: 16×16=256)
UPDATE public.teams
SET proy_per_persona = 3
WHERE proy_per_persona > 3;
