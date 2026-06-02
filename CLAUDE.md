# Priori™ — CLAUDE.md

**Fuente de verdad: el código de este repo y lo que está deployado en producción.**
Si la documentación no coincide con el código, gana el código.

## Reglas de trabajo

- No renombrar ni reescribir features, rutas, modos, componentes ni variables que ya existen,
  salvo pedido explícito. Ante la duda, preguntar antes de cambiar.
- Antes de cambios grandes, asegurate de que el working tree esté commiteado (snapshot recuperable).
  Proponé los cambios para revisar en el diff; no asumas que un dato viejo en docs reemplaza al código.
- No commitear secretos. Variables de entorno en `.env.local` (local) y en Vercel (prod).
  En documentación se listan los **nombres** de las variables, nunca los valores.
- Campos a completar en documentos legales: entre corchetes `[CAMPO]`.
- En Modo Roadmap, "producto" (tabla `products`) es una entidad distinta de "iniciativa" (tabla `initiatives`). El vínculo entre ambas es opcional (campo nullable). No los trates como sinónimos.

## Estado del proyecto

El estado real (stack, arquitectura, nombres de modos/vistas, dominio, rutas, schema,
qué está hecho y qué falta) vive en `priori-proyecto-contexto.md`, generado a partir del código.
Mantenelo actualizado al cerrar cada sesión, leyendo el repo — nunca a partir de memoria o de docs viejos.

@./priori-proyecto-contexto.md
