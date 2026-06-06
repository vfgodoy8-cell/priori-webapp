# Priori™ — Contexto del proyecto

> Generado el 2026-06-02, actualizado el 2026-06-06 (sesión 4 — fases A–H) desde el código fuente real. Todo dato aquí viene del repositorio,
> no de documentación externa ni archivos de contexto anteriores.

---

## Qué es Priori

Priori™ es una herramienta web de transparencia estratégica para equipos de software.
Permite clasificar proyectos usando la Matriz de Impacto vs Esfuerzo (Modo Squad), planificar
la capacidad de equipos por Quarters (Modo Cross) y visualizar roadmaps de producto (Modo Roadmap).

**Tagline / metadata del sitio:** "Transparencia estratégica para equipos de software.
Matriz de Impacto vs Esfuerzo, planificación por Quarters."

**Eslogan en el header:** "Transparencia Estratégica"

---

## Estado de producción

- App desplegada en Vercel (deploy automático desde `main`).
- URL de producción: definida por `NEXT_PUBLIC_SITE_URL` (env var en Vercel). No está hardcodeada en el código.
- Landing comercial en producción en priori.ar; `/` es pública y redirige a `/dashboard` para usuarios con sesión.

---

## Stack

| Paquete | Versión | Uso |
|---|---|---|
| next | 14.2.35 | Framework (App Router) |
| react | ^18 | UI |
| typescript | ^5 | Tipado |
| tailwindcss | ^3.4.1 | Estilos (con colores `brand-*` custom) |
| geist | ^1.7.1 | Tipografía (Geist Sans) |
| @supabase/supabase-js | ^2.106.2 | DB + Auth client |
| @supabase/ssr | ^0.10.3 | Auth SSR (cookies) |
| ai | ^6.0.192 | Vercel AI SDK core (streamText, generateText) |
| @ai-sdk/anthropic | ^3.0.81 | Proveedor Claude |
| @ai-sdk/openai | ^3.0.66 | Proveedor GPT / Azure |
| @ai-sdk/azure | ^3.0.67 | Proveedor Azure OpenAI |
| @ai-sdk/google | ^3.0.80 | Proveedor Gemini |
| @ai-sdk/groq | ^3.0.39 | Proveedor Groq |
| @ai-sdk/react | ^3.0.194 | Hooks React del AI SDK |
| resend | ^6.12.4 | Emails transaccionales |
| @react-pdf/renderer | ^4.5.1 | PDF server-side |
| @tabler/icons-react | ^3.44.0 | Iconografía |
| html2canvas | ^1.4.1 | En package.json (legacy, no se usa) |
| jspdf | ^4.2.1 | En package.json (legacy, no se usa) |

---

## Paleta de marca (tailwind.config.ts)

```ts
brand: {
  orange: "#E8621A",   // color principal
  black:  "#111111",
  gray:   "#6B6B6B",
  green:  "#1D9E75",
  blue:   "#1E6FC5",
}
```

---

## Estructura de carpetas

```
priori-webapp/
app/
  (auth)/               # Rutas públicas de auth (layout centrado, bg-gray-50)
    login/              # Login email + password + OAuth Google (supabase.auth.signInWithOAuth)
    signup/             # Registro
  (app)/                # Rutas protegidas (layout verifica auth, redirige a /login si no hay user)
    activity/           # Server actions para activity_log
    comments/           # Server actions para comments
    cross/              # Modo Cross: CrossView.tsx, CrossHeaderRight.tsx, actions.ts, page.tsx
    deviations/         # Server actions para deviations (Fase 5)
    dashboard/          # Dashboard home: stats Squad+Cross+Roadmap, alertas, timeline, actividad
                        # DashboardHeaderRight.tsx — botones de cabecera del dashboard
    groups/             # Server actions: getGroupsModalMeta, fetchGroupAdjustments,
                        # createGroup, updateGroupBasic, moveGroup, deleteGroup,
                        # createAdjustment, updateAdjustment, deleteAdjustment,
                        # upsertOrgCapacitySettings, setGroupLevelLabel, resetGroupLevelLabel
    onboarding/         # Crear org (page.tsx) + equipos default (teams/page.tsx)
                        # actions.ts: createOrganization + seed de 5 canales default
    settings/
      ai/               # AISettingsView.tsx — configurar proveedor IA (solo owner/admin)
      members/          # MembersView.tsx — gestión de miembros, invitaciones y nombres de roles
      actions.ts        # createInvitation, cancelInvitation, updateMemberRole, removeMember,
                        # setRoleLabel, resetRoleLabel (gestión de labels de roles custom)
    ideas/              # Fase 5: IdeasView.tsx, actions.ts, page.tsx — lista de ideas por estado
    share/              # Server actions de ShareModal (crear/eliminar shared_views)
    squad/              # Modo Squad: SquadView.tsx, SquadCanvas.tsx, AnalystPanel.tsx,
                        # BubbleCard.tsx, ProjectForm.tsx, ProjectList.tsx, ImpactModal.tsx,
                        # actions.ts (incluye getSquadConfig, upsertSquadConfig), page.tsx
    roadmap/            # Modo Roadmap: RoadmapView.tsx, actions.ts, page.tsx
                        # actions: CRUD products, segments, teamDeps, channels (listChannels,
                        # createChannel, updateChannel, deleteChannel),
                        # updateTeamsSortOrder, captureBaseline, listBaselines, deleteBaseline
  api/
    ai/
      analyze/          # POST streaming — chat con contexto Squad/Cross (AI SDK streamText)
      interview/        # POST JSON — entrevista guiada 6 preguntas → generateText → JSON
      ideas/            # POST JSON — entrevista discovery 5 preguntas → ficha de idea (Fase 5)
    auth/send-email/    # POST — hook Supabase para emails de auth en español (Resend)
    export/pdf/         # GET — PDF server-side (?mode=squad|cross) con @react-pdf/renderer
    invite/accept/      # POST — aceptar invitación por token
  auth/
    callback/           # OAuth callback (Supabase)
    logout/             # Logout + redirect a /login
  invite/[token]/       # Página pública: aceptar invitación (AcceptInviteButton.tsx)
                        # Muestra label de rol custom de la org
  share/[token]/        # Página pública: vista de solo lectura
                        # SquadReadOnly.tsx, CrossReadOnly.tsx, RoadmapReadOnly.tsx (nuevos)
                        # GanttReadOnly.tsx — Gantt estático sin drag para la vista pública
                        # roadmap-utils.ts — buildQuarterBands compartido
  icon.tsx              # Favicon dinámico PNG 32x32 (next/og, edge runtime)
  layout.tsx            # Root layout — metadata, Geist font, lang="es"
  page.tsx              # Raíz: redirige a /dashboard
components/
  ai/
    AIChatPanel.tsx         # Panel lateral izquierdo, streaming manual, sugerencias iniciales
    AIInterviewModal.tsx    # Modal 6 preguntas conversacionales → datos para crear proyecto/iniciativa
    IdeaInterviewModal.tsx  # Modal 5 preguntas discovery → guarda en ideas + opción convertir (Fase 5)
  ui/
    ActivityFeed.tsx        # Feed de actividad por entidad (entityId)
    CommentsThread.tsx      # Hilo de comentarios con form
    DeviationsThread.tsx    # Lista de desvíos open/resolved + form reportar (Fase 5)
                            # entityType acepta "project" | "initiative" | "product"
                            # Campo "Stakeholders afectados" en form y en cada card
    GroupsManagerModal.tsx  # Modal 4 tabs (Estructura, Capacidad, Ajustes, Configuración)
                            # Estructura: tree CRUD con jerarquía (parent_id, level 1–4)
                            # Capacidad: unidad de medida + preview heredado de ancestros
                            # Ajustes: CRUD capacity_adjustments por rango de fechas
                            # Configuración: org_capacity_settings + labels de nivel
    IdeaButton.tsx          # Botón "💡 Tengo una idea" con modal state propio (Fase 5, owner only)
    LogoutButton.tsx        # Botón de cierre de sesión
    ModoSwitcher.tsx        # Dropdown "Cambiar modo" — presente en headers de Squad, Cross, Roadmap
    NotificationBell.tsx    # Campanita con badge de alertas de vencimiento + dropdown
    OnboardingTour.tsx      # Tour guiado (localStorage, forceOpen prop)
    ShareModal.tsx          # Modal compartir/exportar (link público + PDF)
                            # mode: "squad" | "cross" | "roadmap"; prop productId? para roadmap
                            # Sección PDF oculta cuando mode = "roadmap"
    TeamPanel.tsx           # Panel modal CRUD de equipos (legacy Cross — puede quedar sin uso)
    TeamPanelTrigger.tsx    # Botón "⚙ Grupos" que abre GroupsManagerModal
                            # Props: teams: Group[], orgId: string, role?: AppRole
hooks/
  useWorkspaceState.ts  # Hook genérico: carga state desde user_workspace_state al montar,
                        # debounce 500ms + upsert onConflict al cambiar
                        # Firma: (context, orgId, userId, defaults) → [state, merge, loaded]
lib/
  supabase/
    client.ts            # createClient() — browser
    server.ts            # createClient() — server components + SSR cookies
    admin.ts             # createAdminClient() — service role, bypassea RLS (server-only)
  pdf/
    SquadPDF.tsx          # Componente @react-pdf/renderer para PDF Squad (A4 portrait)
    CrossPDF.tsx          # Componente @react-pdf/renderer para PDF Cross (A4 landscape)
  activity.ts            # logActivity(), ACTION_LABEL, ActivityAction type, ActivityLog type
  ai-context.ts          # buildSquadContext(), buildCrossContext() → SquadAIContext | CrossAIContext
  ai-providers.ts        # getAiSettings(), buildLanguageModel(), getModelForOrg() — factory multi-proveedor
  capacity.ts            # computeCapacity(), capacityDotClass(), CapacityStatus, CapacityIndicator (legacy)
  capacity-engine.ts     # Motor puro sin Supabase:
                         # resolveUnit(group, ancestorsById, orgSettings) — hereda unidad subiendo parent_id
                         # effectivePeopleInRange(group, adjustments, from, to) — personas × ajustes pct
                         # groupCapacity(group, ancestorsById, adjustments, orgSettings, from, to) → CapacityResult
                         # committedFromInitiatives(teamId, unit, initiatives, year, from, to) → CommittedResult
                         # computeAvailability(cap, committed) → AvailabilityResult
                         # quarterDateRange(year, q) → {from, to}
                         # DEFAULT_CAPACITY_SETTINGS, OrgCapacitySettingsLike, CapacityResult, etc.
  deadlines.ts           # DeadlineSeverity, DeadlineAlert, getDeadlineSeverity(), getDeadlineAlerts()
                         # Fuentes: production_date (Squad), end_date (Cross), target_launch_date / segmentos (Roadmap)
  email.ts               # sendInvitationEmail() via Resend
  group-labels.ts        # getOrgGroupLevelLabels(orgId) → Record<number,string>
                         # LEVEL_LABEL_DEFAULT: {1:"Grupo", 2:"Subgrupo", 3:"Equipo", 4:"Celula"}
  quadrant.ts            # computeQuadrant(impact, effort, iHigh?, eHigh?) — umbrales opcionales
                         # QUADRANT_META, DEFAULT_IMPACT_HIGH=4_000_000, DEFAULT_EFFORT_HIGH=8
  roadmap-logic.ts       # parseProductDate, sprintStartDate, dateToSprint, buildMonthHeaders,
                         # totalDisplaySprints, computeLayout (Kahn + greedy, detección de ciclos)
  role-labels.ts         # getOrgRoleLabels(orgId) — devuelve Record<AppRole, string> con overrides de org_role_labels
  roles.ts               # AppRole, ROLE_LABEL (defaults), ROLE_COLOR, ROLE_BG, ROLE_BORDER,
                         # canWrite(), canManageMembers()
  squad-logic.ts         # bubbleRadius(), posIn(), posOut(), posInBand(), separateBubbles(),
                         # deadlineStatus(), DL_COLOR, CAP_COLOR, squadLimit(),
                         # dateToQuarter(), quartersBetween(),
                         # loadConfig()/saveConfig()/DEFAULT_CONFIG — SquadConfig en localStorage por orgId
                         # SquadConfig también persiste en org_squad_config via upsertSquadConfig
types/
  database.ts            # Tipos TypeScript de todas las tablas + alias de conveniencia
                         # Group (tabla groups, ex-teams) · Team = Group (compat)
                         # OrgGroupLevelLabels, OrgCapacitySettings, CapacityAdjustment
                         # OrgSquadConfig, UserWorkspaceState
                         # UnitType = "hours"|"days"|"sprints"|"projects_per_person"|"story_points"
                         # ConsolidationPeriod = "sprint"|"month"|"quarter"
public/
  favicon.svg            # SVG favicon (3 barras Priori)
middleware.ts            # Auth: protege /dashboard, /onboarding, /squad, /cross, /settings, /ideas, /roadmap
                         # /invite/[token] y /share/[token] son públicas
next.config.mjs          # Vacío (config default de Next.js)
tailwind.config.ts       # Colores brand-* custom, font Geist Sans
```

---

## Rutas de la app

### Públicas (sin autenticación)

| Ruta | Descripción |
|---|---|
| `/` | Landing pública (redirige a `/dashboard` si hay sesión activa) |
| `/login` | Login con email/password + OAuth Google |
| `/signup` | Registro |
| `/auth/callback` | Callback OAuth de Supabase |
| `/auth/logout` | Logout, redirige a `/login` |
| `/invite/[token]` | Aceptar invitación a organización |
| `/share/[token]` | Vista de solo lectura (Squad, Cross o Roadmap) |
| `POST /api/auth/send-email` | Hook Supabase: envío de emails auth en español |
| `POST /api/invite/accept` | Aceptar token de invitación |

### Protegidas (requieren auth)

| Ruta | Descripción |
|---|---|
| `/dashboard` | Stats Squad + Cross + Roadmap, alertas de vencimiento, timeline, actividad reciente |
| `/squad` | Modo Squad — canvas de proyectos con drag and drop; acepta `?ini=<id>` y `?idea=<id>` |
| `/cross` | Modo Cross — timeline Q1-Q4 de iniciativas, drill-down a Squad |
| `/roadmap` | Modo Roadmap — Gantt por producto, filtros Canal/Producto/Año, panel de grupos |
| `/ideas` | Fase 5 — lista de ideas por estado (raw/refined/promoted/discarded) |
| `/onboarding` | Step 1: crear organización |
| `/onboarding/teams` | Step 2: configurar equipos |
| `/settings/members` | Miembros, roles, invitaciones, nombres de roles custom |
| `/settings/ai` | Configurar proveedor IA (solo owner/admin) |
| `POST /api/ai/analyze` | Chat streaming con contexto Squad o Cross |
| `POST /api/ai/interview` | Entrevista guiada IA → JSON (Squad o Cross) |
| `POST /api/ai/ideas` | Fase 5 — entrevista discovery 5 preguntas → ficha de idea |
| `GET /api/export/pdf` | PDF server-side (?mode=squad o cross) |

---

## Modos y vistas (nombres reales del código)

### Dashboard (`/dashboard`)

- **Stats en 3 columnas:** "Distribución Squad" (barras por cuadrante P0-P3), "Capacidad del Programa" (Q1-Q4), "Productos del Roadmap" (barras por canal)
- **Botones de acceso a modos:** orden Roadmap → Cross → Squad; colores degradé del logo (100% / 65% / 30% naranja)
- **Alertas de vencimiento:** sección antes de Actividad reciente, agrupada por severidad (rojo/naranja/amarillo)
- **Timeline del programa:** grid Q1-Q4 con count de iniciativas

### Modo Squad (`/squad`)

- **Header:** logo → separador → "Modo Squad" | IdeaButton · NotificationBell · ModoSwitcher · Equipo (link /settings/members) · org.name · LogoutButton
- **Dos sub-vistas:** "Canvas" y "Lista" (toggle en SquadView) — **persiste en `user_workspace_state`**
- **Toggle:** "Vista Q" — overlay de quarters sobre el canvas — **persiste en `user_workspace_state`**
- **Estados de proyectos:**
  - `squad_status = "curso"` → proyectos "En curso" (dentro del círculo en el canvas)
  - `squad_status = "backlog"` → proyectos en "Backlog" (arco exterior)
  - `status = "discarded"` → descartados (visibles fuera del canvas)
  - Proyectos P0 activos (cuadrante `p0`) se separan del canvas y no se muestran en él
- **Panel de edición:** AnalystPanel (deslizante derecha) con tabs: `form`, `items`, `config`, `comments`, `history`, `deviations` (⚠️)
- **SquadConfig:** persiste en `org_squad_config` (DB) y en localStorage como fallback. Bootstrap al montar: si hay config en DB, sync localStorage; si no, lee localStorage y upserta a DB. Los umbrales `iHigh/eHigh` de SquadConfig se usan en `computeQuadrant` para determinar cuadrante.
- **Drill-down desde Cross:** query param `?ini=<id>` filtra y resalta proyectos vinculados a una iniciativa
- **Prefill desde Idea:** query param `?idea=<id>` abre AnalystPanel con nombre y descripción precargados

### Modo Cross (`/cross`)

- **Header:** logo → separador → "Modo Cross" | IdeaButton · NotificationBell · ModoSwitcher · TeamPanelTrigger · org.name · LogoutButton
- **Título en página:** "Planificación del Programa" / subtítulo "Iniciativas multi-equipo · Capacidad por Quarter · Año 2026"
- **Timeline:** Q1 (Ene–Mar), Q2 (Abr–Jun), Q3 (Jul–Sep), Q4 (Oct–Dic)
- **Estados de iniciativas:** `q_start != null` → en el timeline · `q_start = null` → Backlog
- **Panel de edición:** deslizante derecha, tabs Comentarios / Historial / Desvíos
- **Tabla de capacidad:** usa `lib/capacity-engine.ts` (groupCapacity, committedFromInitiatives, computeAvailability); semáforo por color de ocupación
- **Drill-down a Squad:** `sq_project_ids` en initiatives; desde Cross → `/squad?ini=<id>`

### Modo Roadmap (`/roadmap`)

- **Header:** logo → separador → "Modo Roadmap" | IdeaButton · NotificationBell · ModoSwitcher · TeamPanelTrigger · org.name · LogoutButton
- **Toolbar (orden):** `[Canal ▾] [Producto ▾] [Año ▾] [+ Nuevo producto] [Canales] … [Compartir] [Manual]`
  - Canal, Año y Producto seleccionado **persisten en `user_workspace_state`** (contexto `"roadmap"`)
  - Año derivado dinámicamente: años con datos + año actual + año siguiente (sin hardcodear)
  - Botón "Canales" (solo canWrite) abre panel inline para renombrar/eliminar/crear canales
  - Botón **"Compartir"** (todos los roles): visible cuando hay producto seleccionado; abre `ShareModal` con `mode="roadmap"` y `productId`
- **Gantt:** posicionamiento `%` por sprint, reflow automático (Kahn + greedy), manual_mode, barras coloreadas por grupo
  - **Filtro de grupos visibles** (`products.visible_team_ids`):
    - `NULL/[]` → se muestran TODOS los grupos
    - `[ids...]` → exactamente esos grupos (tildado = visible, destildado = oculto sin excepciones)
    - Botón `▼` en header "Grupo" → dropdown con buscador + checkboxes + atajos "Con tareas" / "Todos"
    - Badge `N/M grupos` cuando `effectiveTeams.length < allTeams.length`
    - El layout (`computeLayout`) siempre usa TODOS los segmentos — el filtro es solo de presentación
  - **Reorder vertical de filas:** drag-and-drop HTML5 (icono `⠿`, indicador naranja); persiste en `groups.sort_order` vía `updateTeamsSortOrder`; los grupos ocultos se reinsertan al final del orden global
  - **Drag horizontal en modo manual:** barras arrastrables (cursor `ew-resize`), persiste `manual_start_sprint`; desactivar manual_mode no borra los sprints guardados
- **Panel lateral — dos estados:**
  - **Segmento activo** (`editingSegId` set): `SegmentPanel` — breadcrumb de jerarquía de grupo en header (A › B › Grupo), label, duración, inicio fijo, dependencias siempre visibles, sprint manual, stepper **Personas asignadas** (`assigned_people`, min 1, warning si > group.personas)
  - **Producto seleccionado sin segmento activo**: `ProductPanel` con:
    - Sección **"+ Nueva tarea"** (canEdit): select de grupos disponibles con indentación de jerarquía; excluye los ya usados por UNIQUE constraint; hint para crear grupo desde header
    - Tab **⚠️ Desvíos:** `DeviationsThread` con `entityType="product"` (incluye "Stakeholders afectados")
    - Tab **📐 Línea base:** captura snapshot del layout; historial listable y eliminable; comparativa pendiente
- **ProductForm:** select de Canal con opción "+ Agregar canal..." inline
- **Canales:** 5 por defecto al crear org; CRUD completo en el panel
- **Share Roadmap:** `ShareModal` genera token en `shared_views` con `mode="roadmap"` y `product_id`; página pública `/share/[token]` renderiza `RoadmapReadOnly` (ficha del producto + `GanttReadOnly` + lista de desvíos)

### Gestor de Grupos (`GroupsManagerModal`)

Abierto por `TeamPanelTrigger` (botón "⚙ Grupos") en headers de Cross y Roadmap.
Modal con 4 tabs:
- **Estructura:** tree CRUD de grupos con jerarquía hasta 4 niveles (labels configurables por org). Agregar hijo, editar nombre/descripción/personas, mover grupo (drag futuro), eliminar.
- **Capacidad:** selector de unidad de medida por grupo (hereda de ancestros si null). Preview de capacidad calculada usando `capacity-engine.ts`.
- **Ajustes:** CRUD de `capacity_adjustments` — rangos de fecha con kind `pct` o `people_delta`.
- **Configuración:** editar `org_capacity_settings` (sprint_weeks, hours_per_day, etc.) + labels de nivel (`org_group_level_labels`).

### ModoSwitcher (componente compartido)

`components/ui/ModoSwitcher.tsx` — client component, prop `current: "squad" | "cross" | "roadmap"`.
Muestra dropdown "Cambiar modo ▾" con los otros dos modos (íconos + nombres), cierra con click fuera.

### NotificationBell (componente compartido)

`components/ui/NotificationBell.tsx` — client component, prop `alerts: DeadlineAlert[]`.
Badge coloreado por severidad más grave (rojo > naranja > amarillo). Dropdown con alertas agrupadas por severidad, cada una linkeando al modo correspondiente.

### Cuadrantes de prioridad (lib/quadrant.ts)

`computeQuadrant(impact, effort, iHigh?, eHigh?)` — umbrales opcionales; si no se pasan, usa defaults.
- `DEFAULT_IMPACT_HIGH = 4_000_000`
- `DEFAULT_EFFORT_HIGH = 8` sprints

Los umbrales efectivos vienen de `SquadConfig.iHigh/eHigh` (que a su vez vienen de `org_squad_config`).

| Cuadrante | Nombre | Color |
|---|---|---|
| P1 | Quick Win | verde `#1D9E75` |
| P2 | Gran Proyecto | azul `#1E6FC5` |
| P3 | Iniciativa Menor | gris `#6B6B6B` |
| P0 | Descartada | naranja `#E8621A` |

### Roles (lib/roles.ts + lib/role-labels.ts)

El enum `member_role` y los permisos son fijos en DB. Los **labels** son configurables por org via `org_role_labels`.

| Role (DB) | Label default en UI | Color bg | Color borde |
|---|---|---|---|
| `owner` | Líder | `#FFF4EE` | `#FDDCB5` |
| `admin` | Analista | `#EAF1FB` | `#BDD5F5` |
| `member` | Stakeholder | `#F5F5F5` | `#E5E5E5` |

Color de texto: owner `#E8621A` · admin `#1E6FC5` · member `#6B6B6B`

`canWrite()` → owner o admin. `canManageMembers()` → owner o admin.
`member` tiene vistas en modo `readOnly` (sin drag, sin panel de edición).

`getOrgRoleLabels(orgId)` devuelve `Record<AppRole, string>` con defaults + overrides de `org_role_labels`. Se llama server-side en todos los page.tsx que muestran badges de rol (dashboard, squad, cross, invite).

### Alertas de vencimiento (lib/deadlines.ts)

| Severidad | Condición | Color |
|---|---|---|
| `red` | Fecha vencida | `#E24B4A` |
| `orange` | Faltan < 15 días | `#E8621A` |
| `yellow` | Faltan < 30 días | `#EF9F27` |

Fuentes de fecha:
- Squad: `projects.production_date`
- Cross: `initiatives.end_date`
- Roadmap: `products.target_launch_date`; si no tiene, se calcula desde el último sprint de los segmentos con `computeLayout`

`getDeadlineAlerts(orgId)` se llama en el `Promise.all` de cada page.tsx de modo y del dashboard.

---

## Priori AI (Fase 4)

### Proveedores soportados (lib/ai-providers.ts)

| Provider | Modelo por defecto | Modelo efectivo |
|---|---|---|
| `anthropic` | `claude-sonnet-4-6` | `model_id` de settings si está seteado, si no el default |
| `openai` | `gpt-4o` | `model_id` de settings si está seteado, si no el default |
| `azure` | `gpt-4o` | `model_id` + `azure_endpoint` de settings |
| `google` | `gemini-2.0-flash` | **Hardcodeado** `"gemini-2.0-flash"`, ignora `model_id` |
| `groq` | `llama-3.3-70b-versatile` | **Hardcodeado** `"llama-3.3-70b-versatile"`, ignora `model_id` |

### Endpoints

- `POST /api/ai/analyze` — streaming con `streamText()`, sistema contextual Squad o Cross (`runtime = "nodejs"`)
- `POST /api/ai/interview` — 6 preguntas conversacionales, `generateText()` → JSON estructurado (`runtime = "nodejs"`)
- `POST /api/ai/ideas` — 5 preguntas discovery (Fase 5), `generateText()` → ficha de idea (`runtime = "nodejs"`)

---

## Schema de Supabase

### Tablas core

| Tabla | Columnas clave |
|---|---|
| `profiles` | id (→ auth.users), full_name, avatar_url, created_at, updated_at |
| `organizations` | id, name, slug (UNIQUE), created_at, updated_at |
| `organization_members` | id, organization_id, profile_id, role (owner/admin/member), created_at |
| `org_role_labels` | organization_id + role (PK compuesta), label (text 1–40 chars), sin updated_at |

Enum en DB: `member_role` = `"owner" | "admin" | "member"` — **no cambió**

### Modo Squad

| Tabla | Columnas clave |
|---|---|
| `projects` | id, organization_id, name, description, impact_value (numeric), impact_metric (revenue/customers), effort_sprints (1–24), sprints_completed, squad_status (backlog/curso), status (active/discarded), stakeholder, production_date, dependencies, canvas_x, canvas_y, parent_id, slice_label, created_at, updated_at |
| `org_squad_config` | organization_id (PK → organizations), dev_n (default 3), dev_p (default 1), metric (money/clients), i_high (default 4000000), i_mid (default 2000000), e_high (default 8), e_mid (default 4), created_at, updated_at |

### Grupos (ex-equipos)

La tabla `teams` fue renombrada a `groups` (migración 33). Las FK existentes (`roadmap_segments.team_id`, etc.) **conservan su nombre** — inconsistencia aceptada.

| Tabla | Columnas clave |
|---|---|
| `groups` | id, organization_id, name, description (text nullable), personas, proy_per_persona (legacy), capacity_per_period (numeric nullable — inicializado desde proy_per_persona), q1_pct–q4_pct (legacy, migrado a capacity_adjustments), sort_order, **parent_id** (uuid nullable → groups ON DELETE RESTRICT), **level** (int 1–4, default 1), **unit** (text nullable: hours/days/sprints/projects_per_person/story_points), created_at, **updated_at** |
| `org_group_level_labels` | organization_id + level (PK compuesta, level 1–4), label (text 1–40) — overrides de labels de nivel |
| `org_capacity_settings` | organization_id (PK), sprint_weeks (default 2), hours_per_day (default 8), workdays_per_week (default 5), default_unit (default 'sprints'), consolidation_period (default 'sprint'), created_at, updated_at |
| `capacity_adjustments` | id, organization_id, group_id (→ groups), start_date, end_date (>= start_date), kind ('pct' o 'people_delta'), value (pct: 0–100; people_delta: entero ±), note (text nullable), created_at, updated_at |

### Modo Cross

| Tabla | Columnas clave |
|---|---|
| `initiatives` | id, organization_id, name, description, stakeholder, impact_value, impact_metric, effort_sprints (1–24), duration_quarters (1–4), q_start (0–3 o null=backlog), team_ids (string[]), team_allocations (Record\<uuid, number\>), sq_project_ids (string[]), start_date, end_date, status (active/discarded), created_at, updated_at |

### Colaboración

| Tabla | Columnas clave |
|---|---|
| `comments` | id, organization_id, author_id, initiative_id OR project_id (CHECK: exactamente uno), body (max 2000), created_at |
| `activity_log` | id, organization_id, actor_id, entity_type (initiative/project), entity_id, entity_name, action (created/updated/deleted/placed/unplaced/discarded/restored/commented/blocked/unblocked), metadata (jsonb), created_at — INSERT-only |

### Sharing e invitaciones

| Tabla | Columnas clave |
|---|---|
| `shared_views` | id, organization_id, created_by, mode (squad/cross/**roadmap**), **product_id** (uuid nullable → products ON DELETE CASCADE), token (UNIQUE), expires_at (null = sin vencimiento), created_at |
| `invitations` | id, organization_id, invited_by, email, role, token (UNIQUE), expires_at (+7 días), accepted_at (null = pendiente), created_at |

### IA

| Tabla | Columnas clave |
|---|---|
| `ai_settings` | id, organization_id (UNIQUE), provider (anthropic/openai/azure/google/groq), api_key, model_id (nullable), azure_endpoint (nullable), created_at, updated_at |

### Workspace

| Tabla | Columnas clave |
|---|---|
| `user_workspace_state` | id, organization_id (→ organizations), profile_id (→ profiles), context ('squad'/'cross'/'roadmap'/'dashboard'), state (jsonb), updated_at · UNIQUE(organization_id, profile_id, context) |

RLS especial: `profile_id = auth.uid()` + `my_role_in_org IS NOT NULL`. Upsert desde browser client.

### Fase 5 — Implementadas

| Tabla | Columnas clave |
|---|---|
| `ideas` | id, organization_id, created_by (→ profiles, ON DELETE SET NULL), title, problem, current_situation, expected_result, suggested_type (mejora/nuevo_desarrollo/cambio_proceso, nullable), status (raw/refined/promoted/discarded, default raw), raw_transcript (jsonb), created_at, updated_at |
| `deviations` | id, organization_id, project_id OR initiative_id OR product_id (polimórfico, CHECK exactamente uno de los tres), reported_by (→ profiles, ON DELETE SET NULL), date, reason, blocking_dependency (text nullable), affected_dependency (text nullable), **affected_stakeholders** (text nullable), status (open/resolved, default open), source (text nullable), external_ref (text nullable), created_at, updated_at |

**RLS Fase 5:** SELECT para cualquier miembro · INSERT para cualquier miembro · UPDATE/DELETE solo owner/admin

### Fase 5 — Modo Roadmap

| Tabla | Columnas clave |
|---|---|
| `channels` | id, organization_id, name (text, UNIQUE por org), sort_order (int default 0), created_at, updated_at |
| `products` | id, organization_id, name, description, business_area (legacy, no usar), **channel_id** (uuid nullable → channels ON DELETE SET NULL), initiative_id (→ initiatives ON DELETE SET NULL, nullable), start_date (date NOT NULL), target_launch_date (date nullable), manual_mode (bool default false), **visible_team_ids** (uuid[] nullable — NULL = mostrar todos), status (active/discarded), sort_order, created_at, updated_at |
| `roadmap_segments` | id, organization_id, product_id (→ products ON DELETE CASCADE), team_id (→ groups ON DELETE CASCADE), label, duration_sprints (1–52), depends_on (uuid[] default '{}'), manual_start_sprint (int nullable), start_date (date nullable — ancla de inicio fijo), **assigned_people** (int default 1 CHECK >= 1), sort_order, created_at, updated_at · UNIQUE(product_id, team_id) |
| `team_dependencies` | id, organization_id, team_id (→ groups), depends_on_team_id (→ groups), description, created_at · CHECK(team_id != depends_on_team_id) · UNIQUE(team_id, depends_on_team_id) |
| `roadmap_baselines` | id, organization_id, product_id (→ products ON DELETE CASCADE), name (text nullable), captured_by (→ profiles ON DELETE SET NULL), captured_at (timestamptz), snapshot (jsonb — array de {segment_id, team_id, team_name, start_sprint, duration_sprints}), created_at |

**RLS roadmap_baselines:** SELECT cualquier miembro · INSERT/DELETE owner o admin

**Canales por defecto al crear org:** "Banco", "Mandarina", "Productores", "Andrea", "Affinity" (seed en `onboarding/actions.ts`)

**RLS Roadmap:** SELECT `my_role_in_org IS NOT NULL` · INSERT/UPDATE/DELETE `IN ('owner','admin')`

### Labels de roles

| Tabla | Columnas clave |
|---|---|
| `org_role_labels` | organization_id + role PK, label (text 1–40 chars) |

RLS: SELECT cualquier miembro · INSERT/UPDATE/DELETE owner o admin. Sin trigger `updated_at`.

### Funciones SQL helper (SECURITY DEFINER)

Definidas en `20260526000003_rls_consolidado.sql`:
- `public.my_role_in_org(org_id uuid) → text` — rol del usuario actual en una org dada
- `public.is_in_same_org(target_profile_id uuid) → boolean` — si dos perfiles comparten alguna org

### Migraciones aplicadas en Supabase

```
20260526000000_initial_schema.sql
20260526000001_fix_rls_recursion.sql
20260526000002_fix_is_in_same_org.sql
20260526000003_rls_consolidado.sql
20260526000004_fix_org_insert_policy.sql
20260526000005_projects.sql
20260526000006_add_sprints_completed.sql
20260526000007_add_canvas_position.sql
20260526000008_squad_status.sql
20260526000009_cross_tables.sql
20260527000010_seed_tls.sql
20260527000011_project_slices.sql
20260527000012_shared_views.sql
20260527000013_invitations.sql
20260527000014_initiative_dates_and_allocations.sql
20260527000015_fix_proy_per_persona.sql
20260528000016_recalculate_duration_quarters.sql
20260528000017_comments.sql
20260528000018_activity_log.sql
20260528000019_ai_settings.sql
20260528000020_ai_settings_google.sql
20260528000021_ai_settings_groq.sql
20260602000022_ideas.sql
20260602000023_deviations.sql
20260602000024_roadmap.sql
20260603000025_roadmap_segment_start_date.sql
20260603000026_products_target_launch_date.sql
20260604000027_channels.sql
20260604000028_org_role_labels.sql
20260604000029_deviations_product.sql        ← product_id + affected_stakeholders + CHECK
20260604000030_roadmap_baselines.sql         ← tabla roadmap_baselines
20260604000031_products_visible_team_ids.sql ← products.visible_team_ids uuid[]
20260604000032_shared_views_roadmap.sql      ← shared_views.mode += 'roadmap' + product_id
```

**Migraciones pendientes de aplicar en Supabase SQL Editor (en orden):**
```
20260605000033_groups_rename_and_hierarchy.sql  ← teams→groups + parent_id/level/unit
20260605000034_org_group_level_labels.sql       ← labels de nivel configurables
20260605000035_org_capacity_settings.sql        ← config de capacidad por org
20260605000036_capacity_adjustments.sql         ← ajustes por rango de fechas + seed q1-q4_pct
20260605000037_org_squad_config.sql             ← config Squad en DB (ex-localStorage)
20260605000038_user_workspace_state.sql         ← estado de workspace por usuario
20260605000039_segments_assigned_people.sql     ← assigned_people en roadmap_segments
```

### RLS

- Todas las tablas tienen RLS habilitado.
- Las server actions usan `createAdminClient()` (service role key, bypassea RLS) — nunca expuesto al cliente.
- El cliente browser usa `createClient()` con cookies de sesión del usuario.
- Excepción: `user_workspace_state` puede usarse desde el browser client (RLS por `auth.uid()`).

---

## Variables de entorno

| Variable | Scope | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Anon key de Supabase |
| `SUPABASE_SECRET_KEY` | server | Service role key (bypassea RLS) |
| `SUPABASE_HOOK_SECRET` | server | Secret para validar el hook de email auth — **pendiente configurar en Vercel** |
| `RESEND_API_KEY` | server | API key de Resend |
| `RESEND_FROM_EMAIL` | server | Email remitente (fallback: `noreply@priori.app`) |
| `NEXT_PUBLIC_SITE_URL` | public | URL base del sitio para links en emails |
| `VERCEL_URL` | auto | Inyectada por Vercel — fallback si `NEXT_PUBLIC_SITE_URL` no está |

---

## Middleware (middleware.ts)

Rutas **protegidas** (requieren auth): `/dashboard`, `/onboarding`, `/squad`, `/cross`, `/settings`, `/ideas`, `/roadmap`

Rutas **públicas** (sin restricción): `/login`, `/signup`, `/invite/[token]`, `/share/[token]`, assets estáticos

Lógica: sin user en ruta protegida → `/login`. Con user en ruta auth → `/dashboard`.

---

## Lo que está implementado

- Auth completo: signup/login con email + OAuth Google, confirmación por email, middleware de rutas protegidas
- Multi-tenant: organizaciones, onboarding (crear org + equipos default + canales default), membresías con roles
- **Modo Squad:** canvas con drag and drop, cuadrantes P0-P3, Vista Q (overlay quarters), toggle Canvas/Lista, slicing (proyectos padre/slice con canvas_x/canvas_y), semáforo de capacidad en SquadConfig
- **Modo Cross:** timeline Q1-Q4 con CSS Grid span, drag desde backlog a quarters, tabla de capacidad con semáforo, grupos configurables
- **Modo Roadmap:**
  - Gantt por producto, reflow automático (Kahn + greedy), manual_mode, detección de ciclos
  - Filtros: Canal → Producto → Año (dinámico) — persisten en `user_workspace_state`
  - Canales de negocio: CRUD completo, 5 canales default por org, select en ProductForm con "+ Agregar canal..." inline
  - **SegmentPanel:** breadcrumb de jerarquía en header, label, duración, inicio fijo, dependencias siempre visibles, sprint manual, stepper de personas asignadas (`assigned_people`)
  - **ProductPanel:** sección "Nueva tarea" (select de grupo con indentación), tabs Desvíos y Línea base
  - **Filtro de grupos por producto:** `visible_team_ids` en `products`; dropdown con buscador + checkboxes + atajos; badge N/M; layout usa todos los segmentos independientemente del filtro
  - **Líneas base:** tabla `roadmap_baselines`; snapshot inmutable del layout; comparativa pendiente
  - **Reorder vertical:** drag-and-drop HTML5, persiste en `groups.sort_order`
  - **Drag horizontal en modo manual:** persiste `manual_start_sprint` en tiempo real
  - **Share por link público:** `ShareModal` con `mode="roadmap"` y `productId`; página `/share/[token]` renderiza `RoadmapReadOnly` (ficha + GanttReadOnly + desvíos); respeta `visible_team_ids`; sin PDF
- Drill-down bidireccional Squad ↔ Cross: `sq_project_ids` en initiatives, `?ini=` en /squad
- Vista pública `/share/[token]`: solo lectura con token expiable opcional
- **Header unificado en los 3 modos:** `ModoSwitcher` dropdown ("Cambiar modo ▾"), `NotificationBell` campanita, `IdeaButton`, `TeamPanelTrigger` ("⚙ Grupos", Cross y Roadmap), org.name, LogoutButton
- **Dashboard renovado:**
  - 3 columnas de stats: Distribución Squad, Capacidad del Programa, Productos del Roadmap (por canal)
  - Botones de modo con degradé del logo: Roadmap 100% / Cross 65% / Squad 30% naranja
  - Sección "Alertas de vencimiento" agrupada por severidad
- **Alertas de vencimiento (`lib/deadlines.ts`):** rojo/naranja/amarillo; campanita en los 3 modos; sección en dashboard
- Roles: owner/admin/member — canWrite y canManageMembers en todas las server actions
- **Labels de roles configurables por org:** tabla `org_role_labels`, UI en `/settings/members`, propagados a: dashboard, Squad, Cross, invite, email
- Columnas de tabla miembros en orden: Rol → Nombre → Email
- Comentarios por proyecto/iniciativa; Historial de actividad; CommentsThread + ActivityFeed en AnalystPanel y panel Cross
- OnboardingTour de 5 pasos; Invitaciones por email; Email de confirmación via Supabase Hook → Resend
- PDF server-side con @react-pdf/renderer; ShareModal con link público + PDF (Squad/Cross); solo link para Roadmap
- Favicon SVG + PNG dinámico
- **Priori AI:** 5 proveedores, chat streaming, entrevista guiada, entrevista de ideas
- **Fase 5 — "Tengo una idea":** tabla `ideas`, IdeaInterviewModal, IdeaButton, `/ideas`, conversión a proyecto
- **Fase 5 — Agenda de Desvíos:** tabla `deviations`, DeviationsThread en Squad/Cross/Roadmap, `affected_stakeholders`
- **Gestor de Grupos (sesión 4):**
  - Tabla `groups` (ex-`teams`) con jerarquía: `parent_id`, `level` (1–4), `unit`, `capacity_per_period`
  - `GroupsManagerModal`: 4 tabs (Estructura, Capacidad, Ajustes, Configuración); abierto por `TeamPanelTrigger`
  - `app/(app)/groups/actions.ts`: CRUD completo de grupos, ajustes, config de org, labels de nivel
  - `lib/capacity-engine.ts`: motor puro de capacidad; usado en tabla Cross
  - `lib/group-labels.ts`: `getOrgGroupLevelLabels(orgId)` con defaults {1:Grupo, 2:Subgrupo, 3:Equipo, 4:Celula}
  - `org_capacity_settings`: sprint_weeks, hours_per_day, workdays_per_week, default_unit, consolidation_period
  - `capacity_adjustments`: ajustes por rango de fechas (kind pct/people_delta); seed migra q1-q4_pct
- **Squad config en DB (sesión 4):**
  - Tabla `org_squad_config`; bootstrap localStorage → DB al crear; sync DB → localStorage al cargar
  - `getSquadConfig` + `upsertSquadConfig` en `squad/actions.ts`
  - `computeQuadrant` recibe `iHigh/eHigh` desde SquadConfig en page.tsx, SquadCanvas y BubbleCard
- **Workspace state (sesión 4):**
  - Tabla `user_workspace_state` (context: squad/cross/roadmap/dashboard, state jsonb)
  - `hooks/useWorkspaceState.ts`: carga al montar, debounce 500ms, upsert desde browser client
  - Squad: persiste `view` (canvas/lista) y `quarterOverlay`
  - Roadmap: persiste `selectedChannelId`, `selectedYear`, `selectedId` (producto)
- **Personas asignadas por segmento (sesión 4):**
  - `roadmap_segments.assigned_people` (int default 1)
  - SegmentPanel con stepper + warning si > group.personas + breadcrumb de jerarquía

---

## Pendiente

- **Migraciones pendientes de aplicar en Supabase SQL Editor (en orden):** ver sección "Migraciones pendientes" en Schema.
- **`SUPABASE_HOOK_SECRET`:** agregar en Vercel → Settings → Environment Variables para activar el hook de email auth.
- **Dominio `priori.ar`:** confirmar propagación DNS (tilde verde en Vercel → Domains), luego actualizar `NEXT_PUBLIC_SITE_URL=https://priori.ar` en Vercel (+redeploy) y en Supabase (Authentication → URL Configuration): Site URL + Redirect URL sin borrar la de `.vercel.app`. Probar login Google + email de invitación.
- **Modo Roadmap — pendiente de UI:** drag para redimensionar barras (`duration_sprints`), vista cross-producto de capacidad, logActivity para products (requiere ampliar CHECK de `activity_log.entity_type`), team_dependencies UI, vista comparativa de líneas base (delta actual vs snapshot).
- **Gestor de Grupos — pendiente:** UI de drag para mover grupos entre niveles, vista de capacidad cross-grupo, ciclos en moveGroup con detección en client-side.
- **Roles — Opción B (permisos configurables reales):** reemplazar el enum `member_role` por roles custom por org. Impacto alto; planificar solo si aparece un caso concreto que los 3 roles actuales no puedan modelar.
- **Fase 6 — Integraciones:** Azure DevOps, Jira, GitHub Issues/Projects, Linear (`deviations.source` y `external_ref` ya están preparados).

---

## Protección legal e IP

**Marca (INPI):**
- Marca "Priori" DENOMINATIVA presentada en clase 42 (Niza) el 03/06/2026, titular Valentín Godoy (persona física, 100%).
- 7 términos de servicios seleccionados (núcleo SaaS/desarrollo/mantenimiento/actualización de software + PaaS/hosting/consultoría).
- Arancel pagado: 100 UMAPI ($38.192, UMAPI a $381,92).
- Nro de acta: [NRO ACTA INPI] — completar desde el comprobante.
- Próximo hito: publicación en Boletín de Marcas (~2-3 meses), 30 días de oposiciones. Seguimiento en portaltramites.inpi.gob.ar → MIS TRÁMITES.

**Depósito DNDA (obra inédita software):**
- Expediente: EX-2026-55249104- -APN-DNDA#MJ, iniciado por TAD el 03/06/2026.
- Tasa $1.400 pagada (Fondo Cooperador DNDA-CESSI, alias CAMARACESSI).
- Obra depositada: snapshot del repo en tag git `v-deposito-dnda-2026-06`.
- PENDIENTE: entregar sobre cerrado de papel madera en DNDA, Moreno 1230, CABA, lun-vie 9:30-14:30.
- Renovación obligatoria a los 3 años (mediados de 2029). Si no se renueva, la obra se destruye (Decreto 972/2024).

**Dominio priori.ar:**
- Registrado en NIC.ar el 25/05/2026, vencimiento 24/05/2027 (agendar renovación).
- Delegado el 03/06/2026 a ns1.vercel-dns.com / ns2.vercel-dns.com.
- priori.ar conectado a Production en Vercel; www.priori.ar redirige 308 al apex.

**Pendiente legal crítico:**
- Revisión de la cláusula de PI del contrato de empleo con abogado laboralista ANTES de cualquier presentación interna de Priori en Galicia Seguros.

---

## Identidad de marca

| | |
|---|---|
| **Nombre** | Priori™ |
| **Tagline en metadata** | Transparencia estratégica para equipos de software |
| **Eslogan en header** | Transparencia Estratégica |
| **Color principal** | Naranja `#E8621A` |
| **Paleta completa** | Negro `#111111` · Gris `#6B6B6B` · Verde `#1D9E75` · Azul `#1E6FC5` |
| **Logo** | 3 barras horizontales en degradé de opacidad naranja (100% / 65% / 30%) |
| **Wordmark** | "priori" en minúscula, bold |
| **Dominio objetivo** | priori.ar (registrado y delegado a Vercel) |

---

## Notas para Claude en este proyecto

- Para archivos `.ts/.tsx` usar Node.js (`fs.writeFileSync`) — nunca PowerShell `Set-Content` (corrompe UTF-8).
- Las server actions usan `createAdminClient()` para bypassear RLS. Excepción: `useWorkspaceState` usa browser client directamente (RLS por `auth.uid()`).
- **La tabla es `groups`, no `teams`** (renombrada en migración 33). Todas las queries deben usar `.from("groups")`. Las FK antiguas en otras tablas (`team_id`, `team_ids`, etc.) conservan su nombre — NO cambiarlas.
- `Team = Group` en `types/database.ts` — alias de compatibilidad. Usar `Group` en código nuevo.
- `SquadConfig` (devN, devP, metric, iHigh, iMid, eHigh, eMid) persiste tanto en `localStorage` (clave `priori_cfg_<orgId>`) como en `org_squad_config` en DB. Bootstrap: si DB tiene config → sync localStorage; si no → lee localStorage y upserta a DB. NO asumir que solo está en localStorage.
- `computeQuadrant(impact, effort, iHigh?, eHigh?)` — acepta umbrales opcionales. Siempre pasar `config.iHigh` y `config.eHigh` desde los componentes (SquadCanvas, BubbleCard, page.tsx para filtrar p0).
- `groups.q1_pct–q4_pct` son legacy — migrados a `capacity_adjustments` pero las columnas siguen en la tabla. No usar para lógica nueva.
- `lib/capacity-engine.ts` es el motor de capacidad. Funciones puras, sin Supabase. Usar en Cross y cualquier vista que necesite calcular capacidad/ocupación. NO duplicar la lógica en componentes.
- `hooks/useWorkspaceState.ts` persiste estado de UI por usuario+org+contexto. Usar para cualquier toggle o filtro que el usuario quiera recuperar al volver.
- Para Google y Groq el `model_id` de `ai_settings` es **ignorado** — el modelo está hardcodeado en `lib/ai-providers.ts`.
- `html2canvas` y `jspdf` están en `package.json` pero no se usan — los PDFs se generan server-side con `@react-pdf/renderer`.
- `lib/squad-logic.ts` concentra la lógica de la matriz, capacidad y posicionamiento del canvas del Modo Squad.
- `activity_log` es INSERT-only: el tipo `Update` en `database.ts` es `Record<never, never>`.
- `IdeaButton` está gateado a `role === "owner"` en la UI — la política INSERT de `ideas` en DB permite cualquier member.
- `deviations.source` y `external_ref` están preparados para la integración con Jira/Azure DevOps (Fase 6) — no tienen lógica aún.
- La conversión idea → proyecto usa `?idea=<id>` en la URL de Squad; el `AnalystPanel` usa `internalPrefill` para evitar el problema de `defaultValue` en inputs no controlados.
- `products.business_area` es legacy — fue reemplazado por `channel_id`. No borrar hasta confirmar que no hay datos usados.
- `getOrgRoleLabels(orgId)` es server-only (usa `createAdminClient`). Siempre llamar desde page.tsx y pasar como prop a client components — nunca importar en componentes client.
- `getOrgGroupLevelLabels(orgId)` es server-only. Defaults: {1:"Grupo", 2:"Subgrupo", 3:"Equipo", 4:"Celula"}.
- `getDeadlineAlerts(orgId)` es server-only. Se agrega al `Promise.all` de cada page.tsx de modo. Retorna array vacío si no hay alertas (no lanzar error).
- Los canales de Roadmap se crean con 5 defaults al hacer onboarding. El seed en migrations (`20260604000027`) aplica a orgs existentes con `ON CONFLICT DO NOTHING`.
- `ModoSwitcher` y `NotificationBell` son client components en `components/ui/` — compartidos por los 3 modos.
- `DeviationEntityType = "project" | "initiative" | "product"` — exportado desde `app/(app)/deviations/actions.ts`. El componente `DeviationsThread` usa este tipo para el prop `entityType`.
- `logActivity` NO se llama para desvíos de producto (`entityType === "product"`): el CHECK de `activity_log.entity_type` acepta solo `"initiative" | "project"`. Queda como TODO para Fase 6.
- `RoadmapView` tiene `localTeams` (estado local inicializado desde props `initialTeams`). El reorder actualiza `localTeams` optimistamente y persiste en `groups.sort_order`.
- El drag horizontal de barras en Roadmap usa `SPRINT_PX = 40` como px/sprint constante. El delta de `clientX` entre mousedown y mousemove no depende del scroll horizontal del contenedor.
- `roadmap_baselines.snapshot` es inmutable — la tabla no tiene `updated_at`. Para corregir una línea base hay que eliminarla y crear otra.
- El `ProductPanel` aparece cuando `editingSegId === null && selectedProduct !== null`. Al clickear un segmento, `SegmentPanel` toma su lugar; al cerrar el `SegmentPanel`, vuelve el `ProductPanel`.
- `visible_team_ids` en `products`: `NULL/[]` → todos los grupos; `[ids...]` → exactamente esos (sin excepciones, sin "red de seguridad"). El filtro es solo de presentación — `computeLayout` recibe todos los segmentos siempre. `effectiveTeams` se computa en `RoadmapView` y se pasa al `GanttGrid` como prop `teams`.
- `GanttGrid` recibe: `teams` (ya filtrados = effectiveTeams), `allTeams` (todos, para el dropdown del filtro), `visibleTeamIds` (la config guardada), `onUpdateVisibleTeams`. El buscador en el dropdown filtra la lista visible pero no modifica `draftIds`.
- `applyFilter` en `GanttGrid`: si `draftIds.length === 0` o `draftIds.length === allTeams.length` → guarda `null` (sin filtro); si es selección parcial → guarda los ids.
- `ShareModal`: `mode: "squad" | "cross" | "roadmap"`, prop `productId?: string`. La sección PDF está envuelta en `{mode !== "roadmap" && (...)}`.
- La página pública `/share/[token]` para Roadmap carga todo server-side con `createAdminClient`, computa el layout con `computeLayout` para obtener la fecha de publicación estimada (`max(end_sprint)` → `sprintStartDate`), y respeta `visible_team_ids` del producto.
- `app/share/[token]/roadmap-utils.ts` exporta `buildQuarterBands` — compartido entre `GanttReadOnly` y el helper visual. No duplicar esta función en `RoadmapView` (ahí se define inline en el archivo).
- `SharedView.product_id` es `null` para mode squad/cross, y debe ser non-null para mode roadmap. No hay CHECK de DB que lo exija, es una convención de código.
- `roadmap_segments.assigned_people` default 1. El SegmentPanel muestra stepper con warning si el valor supera `group.personas`.
- `TeamPanelTrigger` ya NO abre `TeamPanel` — abre `GroupsManagerModal`. `TeamPanel.tsx` puede quedar sin uso activo.
