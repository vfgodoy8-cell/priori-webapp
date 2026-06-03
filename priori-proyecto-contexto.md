# Priori™ — Contexto del proyecto

> Generado el 2026-06-02, actualizado el 2026-06-03 desde el código fuente real. Todo dato aquí viene del repositorio,
> no de documentación externa ni archivos de contexto anteriores.

---

## Qué es Priori

Priori™ es una herramienta web de transparencia estratégica para equipos de software.
Permite clasificar proyectos usando la Matriz de Impacto vs Esfuerzo (Modo Squad) y planificar
la capacidad de equipos por Quarters (Modo Cross).

**Tagline / metadata del sitio:** "Transparencia estratégica para equipos de software.
Matriz de Impacto vs Esfuerzo, planificación por Quarters."

**Eslogan en el header:** "Transparencia Estratégica"

---

## Estado de producción

- App desplegada en Vercel (deploy automático desde `main`).
- URL de producción: definida por `NEXT_PUBLIC_SITE_URL` (env var en Vercel). No está hardcodeada en el código.
- Dominio `priori.ar` pendiente de configurar en DNS/Vercel.

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
| html2canvas | ^1.4.1 | En package.json (puede ser legacy) |
| jspdf | ^4.2.1 | En package.json (puede ser legacy) |

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
    dashboard/          # Dashboard home: stats Squad+Cross, timeline resumen, actividad reciente
                        # DashboardHeaderRight.tsx — botones de cabecera del dashboard
    onboarding/         # Crear org (page.tsx) + equipos default (teams/page.tsx)
    settings/
      ai/               # AISettingsView.tsx — configurar proveedor IA (solo owner/admin)
      members/          # MembersView.tsx — gestión de miembros e invitaciones
    ideas/              # Fase 5: IdeasView.tsx, actions.ts, page.tsx — lista de ideas por estado
    share/              # Server actions de ShareModal (crear/eliminar shared_views)
    squad/              # Modo Squad: SquadView.tsx, SquadCanvas.tsx, AnalystPanel.tsx,
                        # BubbleCard.tsx, ProjectForm.tsx, ProjectList.tsx, ImpactModal.tsx,
                        # actions.ts, page.tsx
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
  share/[token]/        # Página pública: vista de solo lectura (SquadReadOnly.tsx o CrossReadOnly.tsx)
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
    IdeaButton.tsx          # Botón "💡 Tengo una idea" con modal state propio (Fase 5, owner only)
    LogoutButton.tsx        # Botón de cierre de sesión
    OnboardingTour.tsx      # Tour guiado (localStorage, forceOpen prop)
    ShareModal.tsx          # Modal compartir/exportar (link público + PDF)
    TeamPanel.tsx           # Panel modal CRUD de equipos (Cross)
    TeamPanelTrigger.tsx    # Botón que abre TeamPanel
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
  capacity.ts            # computeCapacity(), capacityDotClass(), CapacityStatus, CapacityIndicator
  email.ts               # sendInvitationEmail() via Resend
  quadrant.ts            # computeQuadrant(), QUADRANT_META, DEFAULT_IMPACT_HIGH=4_000_000, DEFAULT_EFFORT_HIGH=8
  roles.ts               # AppRole, ROLE_LABEL, ROLE_COLOR, ROLE_BG, ROLE_BORDER, canWrite(), canManageMembers()
  squad-logic.ts         # bubbleRadius(), posIn(), posOut(), posInBand(), separateBubbles(),
                         # deadlineStatus(), DL_COLOR, CAP_COLOR, squadLimit(),
                         # dateToQuarter(), quartersBetween(),
                         # loadConfig()/saveConfig()/DEFAULT_CONFIG — SquadConfig en localStorage por orgId
types/
  database.ts            # Tipos TypeScript de todas las tablas + alias de conveniencia
public/
  favicon.svg            # SVG favicon (3 barras Priori)
middleware.ts            # Auth: protege /dashboard, /onboarding, /squad, /cross, /settings, /ideas
                         # /invite/[token] y /share/[token] son públicas
next.config.mjs          # Vacío (config default de Next.js)
tailwind.config.ts       # Colores brand-* custom, font Geist Sans
```

---

## Rutas de la app

### Públicas (sin autenticación)

| Ruta | Descripción |
|---|---|
| `/` | Redirige a `/dashboard` |
| `/login` | Login con email/password + OAuth Google |
| `/signup` | Registro |
| `/auth/callback` | Callback OAuth de Supabase |
| `/auth/logout` | Logout, redirige a `/login` |
| `/invite/[token]` | Aceptar invitación a organización |
| `/share/[token]` | Vista de solo lectura (Squad o Cross) |
| `POST /api/auth/send-email` | Hook Supabase: envío de emails auth en español |
| `POST /api/invite/accept` | Aceptar token de invitación |

### Protegidas (requieren auth)

| Ruta | Descripción |
|---|---|
| `/dashboard` | Stats Squad + Cross, timeline resumen, actividad reciente |
| `/squad` | Modo Squad — canvas de proyectos con drag and drop; acepta `?ini=<id>` (filtro iniciativa Cross) y `?idea=<id>` (prefill form desde una idea) |
| `/cross` | Modo Cross — timeline Q1-Q4 de iniciativas, también carga proyectos Squad para drill-down |
| `/ideas` | Fase 5 — lista de ideas por estado (raw/refined/promoted/discarded); botón "Tengo una idea" (owner) |
| `/onboarding` | Step 1: crear organización |
| `/onboarding/teams` | Step 2: configurar equipos |
| `/settings/members` | Miembros, roles e invitaciones |
| `/settings/ai` | Configurar proveedor IA (solo owner/admin) |
| `POST /api/ai/analyze` | Chat streaming con contexto Squad o Cross |
| `POST /api/ai/interview` | Entrevista guiada IA → JSON (Squad o Cross) |
| `POST /api/ai/ideas` | Fase 5 — entrevista discovery 5 preguntas → ficha de idea |
| `GET /api/export/pdf` | PDF server-side (?mode=squad o cross) |

---

## Modos y vistas (nombres reales del código)

### Modo Squad (`/squad`)

- **Título en UI:** "Modo Squad"
- **Dos sub-vistas:** "Canvas" y "Lista" (toggle en SquadView)
- **Toggle:** "Vista Q" — overlay de quarters sobre el canvas
- **Estados de proyectos:**
  - `squad_status = "curso"` → proyectos "En curso" (dentro del círculo en el canvas)
  - `squad_status = "backlog"` → proyectos en "Backlog" (arco exterior)
  - `status = "discarded"` → descartados (visibles fuera del canvas)
  - Proyectos P0 activos (cuadrante `p0`) se separan del canvas y no se muestran en él
- **Panel de edición:** AnalystPanel (deslizante derecha) con tabs: `form`, `items`, `config`, `comments`, `history`, `deviations` (⚠️)
- **Drill-down desde Cross:** query param `?ini=<id>` filtra y resalta proyectos vinculados a una iniciativa
- **Prefill desde Idea:** query param `?idea=<id>` abre AnalystPanel con nombre y descripción precargados desde la idea
- **Botón 💡:** "Tengo una idea" en el header (solo owner) — abre IdeaInterviewModal
- **Botón IA:** "Priori AI" (abre AIChatPanel)
- **Botón en AnalystPanel:** "Cargar con IA" (abre AIInterviewModal)

### Modo Cross (`/cross`)

- **Título en página:** "Planificación del Programa" / subtítulo "Iniciativas multi-equipo · Capacidad por Quarter · Año 2026"
- **Timeline:** Q1 (Ene–Mar), Q2 (Abr–Jun), Q3 (Jul–Sep), Q4 (Oct–Dic)
- **Estados de iniciativas:**
  - `q_start != null` → en el timeline
  - `q_start = null` → en "Backlog del Programa"
- **Panel de edición:** "Panel del programa" (deslizante derecha, en CrossView.tsx)
  - Incluye tabs "💬 Comentarios", "📋 Historial" y "⚠️ Desvíos" al editar una iniciativa existente
- **Tabla de capacidad:** por equipo y quarter, semáforo de colores
- **FAB:** botón "+" (nueva iniciativa) + botón IA secundario (AIInterviewModal)
- **Botón 💡:** "Tengo una idea" en el header (solo owner) — abre IdeaInterviewModal
- **Botón IA:** "Priori AI" (abre AIChatPanel)
- **Drill-down a Squad:** `sq_project_ids` en initiatives; desde Cross se puede navegar a `/squad?ini=<id>`

### Cuadrantes de prioridad (lib/quadrant.ts)

Umbrales por defecto (no configurables por usuario aún):
- `DEFAULT_IMPACT_HIGH = 4_000_000`
- `DEFAULT_EFFORT_HIGH = 8` sprints

| Cuadrante | Nombre | Color |
|---|---|---|
| P1 | Quick Win | verde `#1D9E75` |
| P2 | Gran Proyecto | azul `#1E6FC5` |
| P3 | Iniciativa Menor | gris `#6B6B6B` |
| P0 | Descartada | naranja `#E8621A` |

### Roles (lib/roles.ts)

| Role (DB) | Label en UI | Color bg | Color borde |
|---|---|---|---|
| `owner` | Líder | `#FFF4EE` | `#FDDCB5` |
| `admin` | Analista | `#EAF1FB` | `#BDD5F5` |
| `member` | Stakeholder | `#F5F5F5` | `#E5E5E5` |

Color de texto: owner `#E8621A` · admin `#1E6FC5` · member `#6B6B6B`

`canWrite()` → owner o admin. `canManageMembers()` → owner o admin.
`member` tiene vistas en modo `readOnly` (sin drag, sin panel de edición).

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

### Preguntas de la entrevista (modo Squad)
1. Qué es la iniciativa y qué problema resuelve para el negocio
2. A quién impacta principalmente (clientes, ventas, operaciones internas)
3. Cuánto valor genera ($ o clientes afectados)
4. Cuántos sprints lleva (cada sprint = 2 semanas)
5. Hay fecha crítica de salida a producción
6. De qué otros proyectos o sistemas depende

### Preguntas de la entrevista (modo Cross)
1. Qué es y qué problema del negocio resuelve
2. A qué equipo pertenece o cuál es el equipo principal que la ejecuta
3. En qué quarter necesita que empiece (Q1 = Ene-Mar … Q4 = Oct-Dic)
4. Cuántos quarters dura aproximadamente
5. Tiene dependencias con otras iniciativas del programa
6. Quién es el stakeholder o responsable

---

## Schema de Supabase

### Tablas core

| Tabla | Columnas clave |
|---|---|
| `profiles` | id (→ auth.users), full_name, avatar_url, created_at, updated_at |
| `organizations` | id, name, slug (UNIQUE), created_at, updated_at |
| `organization_members` | id, organization_id, profile_id, role (owner/admin/member), created_at |

Enum en DB: `member_role` = `"owner" | "admin" | "member"`

### Modo Squad

| Tabla | Columnas clave |
|---|---|
| `projects` | id, organization_id, name, description, impact_value (numeric), impact_metric (revenue/customers), effort_sprints (1–24), sprints_completed, squad_status (backlog/curso), status (active/discarded), stakeholder, production_date, dependencies, canvas_x, canvas_y, parent_id, slice_label, created_at, updated_at |

### Modo Cross

| Tabla | Columnas clave |
|---|---|
| `teams` | id, organization_id, name, description (text nullable, agregado en Fase 5), personas, proy_per_persona, q1_pct–q4_pct (0–100), sort_order, created_at |
| `initiatives` | id, organization_id, name, description, stakeholder, impact_value, impact_metric, effort_sprints (1–24), duration_quarters (1–4), q_start (0–3 o null=backlog), team_ids (string[]), team_allocations (Record\<uuid, number\>), sq_project_ids (string[]), start_date, end_date, status (active/discarded), created_at, updated_at |

### Colaboración

| Tabla | Columnas clave |
|---|---|
| `comments` | id, organization_id, author_id, initiative_id OR project_id (CHECK: exactamente uno), body (max 2000), created_at |
| `activity_log` | id, organization_id, actor_id, entity_type (initiative/project), entity_id, entity_name, action (created/updated/deleted/placed/unplaced/discarded/restored/commented/**blocked/unblocked**), metadata (jsonb), created_at — `Update: Record<never, never>` (INSERT-only) |

### Sharing e invitaciones

| Tabla | Columnas clave |
|---|---|
| `shared_views` | id, organization_id, created_by, mode (squad/cross), token (UNIQUE), expires_at (null = sin vencimiento), created_at |
| `invitations` | id, organization_id, invited_by, email, role, token (UNIQUE), expires_at (+7 días), accepted_at (null = pendiente), created_at |

### IA

| Tabla | Columnas clave |
|---|---|
| `ai_settings` | id, organization_id (UNIQUE), provider (anthropic/openai/azure/google/groq), api_key, model_id (nullable), azure_endpoint (nullable), created_at, updated_at |

### Fase 5 — Implementadas

| Tabla | Columnas clave |
|---|---|
| `ideas` | id, organization_id, created_by (→ profiles, ON DELETE SET NULL), title, problem, current_situation, expected_result, suggested_type (mejora/nuevo_desarrollo/cambio_proceso, nullable), status (raw/refined/promoted/discarded, default raw), raw_transcript (jsonb), created_at, updated_at |
| `deviations` | id, organization_id, project_id OR initiative_id (polimórfico, CHECK exactamente uno), reported_by (→ profiles, ON DELETE SET NULL), date, reason, blocking_dependency (text nullable), affected_dependency (text nullable), status (open/resolved, default open), source (text nullable), external_ref (text nullable), created_at, updated_at |

**RLS Fase 5:** SELECT para cualquier miembro · INSERT para cualquier miembro (`created_by/reported_by = auth.uid()`) · UPDATE/DELETE solo owner/admin (`canWrite`)

### Fase 5 — Modo Roadmap (migración `20260602000024` aplicada en Supabase)

| Tabla | Columnas clave |
|---|---|
| `products` | id, organization_id, name, description, business_area, initiative_id (→ initiatives ON DELETE SET NULL, nullable), start_date (date NOT NULL DEFAULT CURRENT_DATE — sprint 0 relativo al producto), manual_mode (bool default false), status (active/discarded), sort_order, created_at, updated_at |
| `roadmap_segments` | id, organization_id, product_id (→ products ON DELETE CASCADE), team_id (→ teams ON DELETE CASCADE), label, duration_sprints (1–52), depends_on (uuid[] default '{}' — IDs de otros segmentos, sin FK de array), manual_start_sprint (int nullable — posición fija en manual_mode), sort_order, created_at, updated_at · UNIQUE(product_id, team_id) |
| `team_dependencies` | id, organization_id, team_id (→ teams), depends_on_team_id (→ teams), description, created_at · CHECK(team_id != depends_on_team_id) · UNIQUE(team_id, depends_on_team_id) |

**RLS Roadmap:** SELECT `my_role_in_org IS NOT NULL` · INSERT/UPDATE/DELETE `IN ('owner','admin')` · `team_dependencies` sin UPDATE (se borra y recrea)

### Funciones SQL helper (SECURITY DEFINER)

Definidas en `20260526000003_rls_consolidado.sql`:
- `public.my_role_in_org(org_id uuid) → text` — rol del usuario actual en una org dada
- `public.is_in_same_org(target_profile_id uuid) → boolean` — si dos perfiles comparten alguna org

### Migraciones aplicadas

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
20260602000024_roadmap.sql          ← escrita, aún no aplicada en Supabase
```

### RLS

- Todas las tablas tienen RLS habilitado.
- Las server actions usan `createAdminClient()` (service role key, bypassea RLS) — nunca expuesto al cliente.
- El cliente browser usa `createClient()` con cookies de sesión del usuario.

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

Rutas **protegidas** (requieren auth): `/dashboard`, `/onboarding`, `/squad`, `/cross`, `/settings`, `/ideas`

Rutas **públicas** (sin restricción): `/login`, `/signup`, `/invite/[token]`, `/share/[token]`, assets estáticos

Lógica: sin user en ruta protegida → `/login`. Con user en ruta auth → `/dashboard`.

---

## Lo que está implementado

- Auth completo: signup/login con email + OAuth Google, confirmación por email, middleware de rutas protegidas
- Multi-tenant: organizaciones, onboarding (crear org + equipos default), membresías con roles
- **Modo Squad:** canvas con drag and drop, cuadrantes P0-P3, Vista Q (overlay quarters), toggle Canvas/Lista, slicing (proyectos padre/slice con canvas_x/canvas_y), semáforo de capacidad en SquadConfig (localStorage)
- **Modo Cross:** timeline Q1-Q4 con CSS Grid span, drag desde backlog a quarters, tabla de capacidad con semáforo, equipos configurables (personas, proy_per_persona, % disponibilidad por Q)
- Drill-down bidireccional Squad ↔ Cross: `sq_project_ids` en initiatives, `?ini=` en /squad, highlight de proyectos vinculados
- Vista pública `/share/[token]`: solo lectura con token expiable opcional
- Roles: owner/admin/member — canWrite y canManageMembers en todas las server actions
- Comentarios por proyecto/iniciativa (tabla `comments` con RLS)
- Historial de actividad (tabla `activity_log`, logActivity en todas las mutations)
- CommentsThread + ActivityFeed integrados en AnalystPanel (Squad) y panel de Cross
- OnboardingTour de 5 pasos (localStorage + botón Ayuda)
- Invitaciones por email: generación de token, página `/invite/[token]`, email via Resend
- Email de confirmación de Auth via Supabase Hook → `/api/auth/send-email` → Resend
- PDF server-side con @react-pdf/renderer: GET `/api/export/pdf?mode=squad|cross`
- ShareModal con link público + exportar PDF
- Favicon SVG (3 barras) + favicon PNG dinámico (app/icon.tsx)
- **Priori AI:**
  - Tabla `ai_settings` por organización
  - 5 proveedores: Anthropic, OpenAI, Azure, Google (gemini-2.0-flash hardcoded), Groq (llama-3.3-70b-versatile hardcoded)
  - `POST /api/ai/analyze` — chat streaming con contexto completo (Squad o Cross)
  - `POST /api/ai/interview` — entrevista 6 pasos → JSON → prellenar form
  - AIChatPanel en Squad y Cross
  - AIInterviewModal en Squad (AnalystPanel) y Cross (FAB secundario)
- **Fase 5 — "Tengo una idea":**
  - Tabla `ideas` con RLS; tipos `Idea`, `IdeaStatus`, `IdeaSuggestedType` en `types/database.ts`
  - `POST /api/ai/ideas` — entrevista discovery 5 preguntas → síntesis (title, problem, current_situation, expected_result, suggested_type)
  - `IdeaInterviewModal`: chat → confirmación editable → guarda en DB → éxito con "Convertir en proyecto"
  - `IdeaButton` (💡): botón reutilizable con modal state propio; aparece en headers de Squad, Cross y Dashboard (solo owner)
  - `/ideas`: lista de ideas por estado con tabs (raw/refined/promoted/discarded), acciones de refinado y descarte
  - Conversión idea → proyecto: `/squad?idea=<id>` prellena nombre y descripción en AnalystPanel via `internalPrefill`
  - actions: `createIdea`, `listIdeas`, `updateIdeaStatus`
- **Fase 5 — Agenda de Desvíos:**
  - Tabla `deviations` con RLS y trigger `updated_at`; tipos `Deviation`, `DeviationStatus` en `types/database.ts`
  - `activity_log.action` ganó `"blocked"` y `"unblocked"` (ALTER sobre el CHECK constraint)
  - `lib/activity.ts` actualizado con los nuevos tipos y labels
  - `DeviationsThread`: lista open/resolved + form reportar (fecha, razón, dependencia bloqueante, dependencia afectada); resolve/delete solo canWrite
  - Tab ⚠️ en AnalystPanel (Squad) — solo cuando hay proyecto en edición
  - Tab ⚠️ en CrossPanelTabs (Cross) — solo cuando hay iniciativa en edición; respeta `canWrite` del rol
  - actions: `createDeviation`, `listDeviations`, `resolveDeviation`, `deleteDeviation`
- **Fase 5 — Modo Roadmap (UI inicial):**
  - Migración `20260602000024_roadmap.sql` aplicada en Supabase
  - Tipos: `Product`, `ProductStatus`, `RoadmapSegment`, `TeamDependency` en `types/database.ts`; `teams` gana `description`
  - `lib/roadmap-logic.ts`: `parseProductDate`, `sprintStartDate`, `dateToSprint`, `buildMonthHeaders`, `totalDisplaySprints`, `computeLayout` (Kahn + greedy, detección de ciclos, manual_mode)
  - `app/(app)/roadmap/actions.ts`: CRUD products (`listProducts`, `createProduct`, `updateProduct`, `discardProduct`, `deleteProduct`), segments (`loadProductSegments`, `addSegment`, `updateSegment`, `removeSegment`), teamDeps (`listTeamDependencies`, `createTeamDependency`, `deleteTeamDependency`)
  - `app/(app)/roadmap/page.tsx` + `RoadmapView.tsx`: Gantt con posicionamiento `%` por sprint, product selector, panel lateral de edición, toggle manual_mode, empty state
  - `middleware.ts`: `/roadmap` agregado a rutas protegidas
  - Dashboard: botón "Modo Roadmap" en header + QuickLink (grid 4 columnas)

---

## Pendiente

- **Dominio `priori.ar`:** registrado en NIC.ar (25/05/2026) y delegado a ns1/ns2.vercel-dns.com (03/06/2026). Pendiente: confirmar propagación (tilde verde en Vercel → Domains), luego actualizar `NEXT_PUBLIC_SITE_URL=https://priori.ar` en Vercel (+redeploy) y en Supabase (Authentication → URL Configuration): Site URL `https://priori.ar` + agregar `https://priori.ar/auth/callback` a Redirect URLs sin borrar la de `.vercel.app`. Probar login Google + email de invitación.
- **`SUPABASE_HOOK_SECRET`:** agregar en Vercel → Settings → Environment Variables para activar el hook de email auth
- **Umbrales configurables por org:** `DEFAULT_IMPACT_HIGH` y `DEFAULT_EFFORT_HIGH` están hardcodeados en `lib/quadrant.ts`; la UI de configuración aún no existe
- **Fase 5 — Modo Roadmap (UI inicial implementada, deploy fallido):** migración aplicada en Supabase. Ruta `/roadmap` operativa en local. Deploy a Vercel falló — hay que investigar el error en el dashboard de Vercel antes de la próxima sesión. Pendiente además: drag para redimensionar barras, vista cross-producto de capacidad, logActivity para products, team_dependencies UI, mejoras de UX del panel lateral.
- **Fase 6 — Integraciones:** Azure DevOps, Jira, GitHub Issues/Projects, Linear

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
- Obra depositada: snapshot del repo en tag git `v-deposito-dnda-2026-06` (zip generado con `git archive`, hash SHA-256 en el manifiesto).
- Pendrive contiene: zip + MANIFIESTO-DEPOSITO-DNDA.pdf.
- PENDIENTE: entregar sobre cerrado de papel madera (firmado en cierres, carátulas por fuera) en DNDA, Moreno 1230, CABA, lun-vie 9:30-14:30.
- Renovación obligatoria a los 3 años (mediados de 2029, ventana de 30 días post-vencimiento, mismo documento de referencia: CUIT del titular). Si no se renueva, la obra se destruye (Decreto 972/2024).

**Dominio priori.ar:**
- Registrado en NIC.ar el 25/05/2026, vencimiento 24/05/2027 (agendar renovación).
- Delegado el 03/06/2026 a ns1.vercel-dns.com / ns2.vercel-dns.com.
- priori.ar conectado a Production en Vercel; www.priori.ar redirige 308 al apex.
- PENDIENTE: confirmar propagación (tilde verde en Vercel → Domains), luego actualizar `NEXT_PUBLIC_SITE_URL=https://priori.ar` en Vercel (+redeploy) y en Supabase (Authentication → URL Configuration): Site URL `https://priori.ar` y agregar `https://priori.ar/auth/callback` a Redirect URLs sin borrar la de `.vercel.app`. Probar login Google + email de invitación.

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
| **Dominio objetivo** | priori.ar (registrado y delegado a Vercel, propagación en curso) |

---

## Notas para Claude en este proyecto

- Para archivos `.ts/.tsx` usar Node.js (`fs.writeFileSync`) — nunca PowerShell `Set-Content` (corrompe UTF-8).
- Las server actions usan `createAdminClient()` para bypassear RLS.
- `SquadConfig` (devN, devP, metric, iHigh, iMid, eHigh, eMid) vive en `localStorage` con clave `priori_cfg_<orgId>` — no está en Supabase.
- Para Google y Groq el `model_id` de `ai_settings` es **ignorado** — el modelo está hardcodeado en `lib/ai-providers.ts`.
- `html2canvas` y `jspdf` están en `package.json` pero los PDFs se generan server-side con `@react-pdf/renderer`.
- Los cuadrantes de la Matriz usan umbrales fijos: impacto ≥ `4_000_000` = alto; esfuerzo ≥ `8` sprints = alto.
- `lib/squad-logic.ts` concentra la lógica de la matriz, capacidad y posicionamiento del canvas del Modo Squad.
- `activity_log` es INSERT-only: el tipo `Update` en `database.ts` es `Record<never, never>`.
- `IdeaButton` está gateado a `role === "owner"` en la UI — la política INSERT de `ideas` en DB permite cualquier member, el gate es de la fase de testeo.
- `deviations.source` y `external_ref` están preparados para la integración con Jira/Azure DevOps (Fase 6) — no tienen lógica aún.
- La conversión idea → proyecto usa `?idea=<id>` en la URL de Squad; el `AnalystPanel` usa `internalPrefill` (estado interno copiado de `prefillData` al disparar `openRequest`) para evitar el problema de `defaultValue` en inputs no controlados.
