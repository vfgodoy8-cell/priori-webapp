-- Agrega canvas_x/canvas_y a projects para persistir posición en el canvas Squad
alter table public.projects
  add column if not exists canvas_x numeric default null,
  add column if not exists canvas_y numeric default null;
