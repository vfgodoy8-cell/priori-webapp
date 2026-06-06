-- Priori™ — Personas asignadas por segmento de Roadmap
ALTER TABLE public.roadmap_segments
  ADD COLUMN assigned_people int NOT NULL DEFAULT 1 CHECK (assigned_people >= 1);
