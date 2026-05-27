# CLAUDE.md — Priori™ webapp

## Qué es este proyecto

Priori™ es una herramienta web de transparencia estratégica para equipos de software.
Permite clasificar iniciativas con la Matriz de Impacto vs Esfuerzo, simular escenarios con drag & drop
y planificar capacidad de equipos por Quarters (Q1–Q4).

La webapp es la evolución del archivo `priori-estimador-v2.html` (HTML estático validado en Galicia Seguros)
hacia un SaaS multi-tenant con persistencia, roles y organizaciones.

**Tagline:** "La claridad de priorizar bien."

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript 5 (strict) |
| Estilos | Tailwind CSS 3 |
| Auth + DB | Supabase |
| Deploy | Vercel |

---

## Estructura de carpetas

```
app/                    # App Router — layouts, pages, loading, error
  (auth)/               # Grupo de rutas públicas (login, signup)
  (app)/                # Grupo de rutas protegidas (dashboard, squad, cross)
components/             # Componentes reutilizables
  ui/                   # Primitivos: Button, Input, Modal, Badge…
  squad/                # Componentes del Modo Squad
  cross/                # Componentes del Modo Cross
lib/                    # Utilidades, helpers, clientes externos
  supabase/             # Cliente Supabase (server / client / middleware)
types/                  # Tipos TypeScript compartidos
```

---

## Convenciones de código

### TypeScript
- `strict: true` siempre. Sin `any` explícito; usar `unknown` cuando corresponde.
- Preferir `type` sobre `interface` salvo que se necesite `extends` o declaración de módulos.
- Exportar tipos desde `types/index.ts` o desde el módulo que los define.
- Props de componentes: `type Props = { ... }` en el mismo archivo, sin nombre genérico.

### Componentes
- Un componente por archivo. Nombre del archivo = nombre del componente en PascalCase.
- Solo Server Components por defecto. Agregar `"use client"` únicamente cuando sea necesario
  (interactividad, hooks de estado/efecto, browser APIs).
- Props opcionales con valor por defecto en la firma, no en desestructuración separada.

### Tailwind
- Clases en el JSX directamente. Sin `@apply` salvo en `globals.css` para casos muy repetidos.
- Paleta de marca disponible como utilidades `brand-*`:
  - `brand-orange` → `#E8621A` (color principal, CTAs, logo)
  - `brand-black`  → `#111111` (textos principales)
  - `brand-gray`   → `#6B6B6B` (textos secundarios)
  - `brand-green`  → `#1D9E75` (éxito, Quick Wins, disponibilidad OK)
  - `brand-blue`   → `#1E6FC5` (información, acciones secundarias)
- Orden de clases: layout → spacing → sizing → typography → color → state → responsive.

### Nomenclatura
- **Rutas:** kebab-case (`/modo-squad`, `/modo-cross`).
- **Archivos de componente:** PascalCase (`BurbujaProyecto.tsx`).
- **Archivos de utilidad/lib:** camelCase (`formatSprints.ts`).
- **Variables y funciones:** camelCase.
- **Constantes globales:** UPPER_SNAKE_CASE.
- **Tipos y enums:** PascalCase.

### Commits
- Prefijo convencional: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- Mensaje en español, imperativo, sin punto final.
- Ejemplo: `feat: agregar canvas de Modo Squad con drag & drop`

---

## Marca — reglas de uso

- El nombre del producto es **Priori™** — con ™ en contextos formales (documentos, UI principal).
- El wordmark es **priori** en minúscula bold — nunca en mayúscula.
- El logo son 3 barras horizontales en degradé de opacidad del naranja de marca:
  P1 larga (100%) → P2 media (65%) → P3 corta (30%).
- Nunca usar colores fuera de la paleta de marca para elementos propios de la UI.

---

## Dominio de negocio — conceptos clave

| Concepto | Descripción |
|---|---|
| **Proyecto / Iniciativa** | Unidad de trabajo a priorizar |
| **Impacto** | Ventas ($) o Clientes — configurable |
| **Esfuerzo** | Sprints estimados (1–24) |
| **Cuadrante** | P0 Descartada / P1 Quick Win / P2 Gran Proyecto / P3 Iniciativa Menor |
| **Squad** | Modo de vista en canvas con burbujas |
| **Cross** | Modo de vista en timeline Q1–Q4 |
| **Capacidad** | `personas × proyectos/persona × (% disponibilidad Q / 100)` |
| **Límite Squad** | `developers × proyectos/developer` (default: 3) |
| **Semáforo capacidad** | Verde < 90% ocup. · Amarillo 90–95% · Naranja 95–99% · Rojo ≥ 100% |
| **Display disponibilidad** | `"2/4 personas (50%)"` — fracción + porcentaje |

---

## Estado actual del desarrollo

### Completado (Fase 1–2)
- [x] Scaffold Next.js 14 + TypeScript + Tailwind + ESLint
- [x] Auth: login / signup / logout con email+password y Google OAuth
- [x] Middleware de rutas protegidas; callback OAuth
- [x] Multi-tenant: organizaciones, onboarding, membresías
- [x] Header con navegación Squad ↔ Cross
- [x] **Modo Squad** — canvas completo:
  - Zona circular dinámica "En Curso" con drag & drop
  - Burbujas con Ring Status (progreso de sprints), tooltip hover
  - Slicing: padre/slices con conexión visual (línea punteada + ⑂)
  - Progreso agregado en burbuja padre (suma de slices)
  - Overlay de Quarters (Vista Q): bandas Q1–Q4 con reposicionamiento
  - Toggle Canvas / Lista
  - Panel del Analista: crear/editar/archivar proyectos, config de squad
  - Semáforo de capacidad (verde/amarillo/naranja/rojo)
- [x] **Modo Cross** — timeline Q1–Q4:
  - CSS grid con tarjetas multi-quarter (grid-column span)
  - Drag & drop al timeline, detección de quarter por clientX
  - Tabla de capacidad por equipo y quarter
  - Equipos configurables (personas, proy/persona, % disponibilidad Q)
- [x] **Vista pública /share/[token]**: solo lectura, sin login
  - Tabla `shared_views` con token único y expiración opcional
  - Modal "Compartir" genera link público y lo copia al portapapeles
  - Canales: Teams, WhatsApp, Email usan el link público
- [x] Exportar PDF (html2canvas + jsPDF, captura `#priori-export-target`)
- [x] Migraciones SQL en `supabase/migrations/`

### Pendiente inmediato
- [ ] Deploy en Vercel (pendiente `vercel login` + `vercel link`)
- [ ] Drill-down Squad ↔ Cross (vincular proyectos Squad con iniciativas Cross)
- [ ] PDF server-side de mayor calidad (alternativa a html2canvas)

### Fase 3 — Colaboración y roles
- [ ] Roles: Analista / Stakeholder / Líder
- [ ] Comentarios por proyecto/iniciativa
- [ ] Historial de cambios
- [ ] Invitaciones por email
- [ ] Onboarding guiado

### Fase 4 — Priori™ AI
- [ ] Sugerencias de priorización asistidas por IA
- [ ] Detección de conflictos de capacidad predictiva

### Fase 5 — Integraciones
- [ ] Azure DevOps
- [ ] Jira
- [ ] GitHub Issues / Projects
- [ ] Linear

---

## Variables de entorno requeridas

```bash
# .env.local (nunca commitear)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

---

## Referencia

- Herramienta original: `priori-estimador-v2.html` (lógica de negocio de referencia)
- Contexto completo del producto: `priori-proyecto-contexto.md`
- Stack de referencia: proyecto Artentino (misma combinación Next.js + Supabase + Vercel)
