-- Fix: INSERT en organizations bloqueado por RLS
--
-- Causa: "with check (auth.uid() is not null)" no evalúa correctamente
-- el contexto de autenticación en todos los casos.
--
-- Solución: usar "to authenticated with check (true)" — el rol
-- 'authenticated' ya garantiza que el usuario está logueado.

drop policy if exists "organizations: insert autenticado" on public.organizations;

create policy "organizations: insert autenticado"
  on public.organizations
  for insert
  to authenticated
  with check (true);
