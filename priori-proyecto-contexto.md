# Priori™ — Contexto del proyecto

## Qué es Priori

Priori™ es una herramienta web de priorización visual de proyectos para equipos de software. Permite clasificar proyectos e iniciativas usando la Matriz de Impacto vs Esfuerzo, simular escenarios de priorización con drag & drop, analizar el impacto de cada decisión antes de tomarla, y planificar la capacidad de equipos a lo largo del año por Quarters.

**Tagline:** "La claridad de priorizar bien."

---

## Estado actual

- La herramienta existe y funciona como archivo HTML estático (`priori-estimador-v2.html`)
- Fue validada internamente en Galicia Seguros (compañía de seguros líder en Argentina)
- Está en proceso de salir al mercado como producto comercial propio
- Toda la documentación, contratos, caso de éxito y sistema de logo están generados

---

## La herramienta — funcionalidades actuales

**Tecnología:** HTML5 + CSS3 + JavaScript vanilla. Sin backend, sin base de datos, sin dependencias externas salvo Tabler Icons (CDN), html2canvas y jsPDF (CDN).

**Modo Squad**
- Canvas de burbujas con drag & drop
- Clasificación automática por Matriz de Impacto vs Esfuerzo (4 cuadrantes: Quick win P1, Gran proyecto P2, Iniciativa menor P3, Descartada P0)
- Tamaño de burbuja = sprints estimados (1 a 24)
- Color de burbuja = cuadrante
- Punto de urgencia por fecha de salida a producción (verde / amarillo / rojo)
- Límite de capacidad = developers × proyectos/developer (configurable, default 3)
- Modal de análisis de impacto al superar el límite (cuadrante, sprints completados, dependencias, stakeholder, fecha de producción)
- Edición de proyectos con contorno naranja en burbuja activa
- Franja de proyectos descartados con opción de restaurar

**Modo Programa**
- Timeline Q1–Q4 (Ene-Mar / Abr-Jun / Jul-Sep / Oct-Dic)
- Iniciativas drag & drop desde backlog a Quarters
- Duración 1 a 4 Quarters, cards fantasma en Quarters de continuación
- Validación de capacidad al asignar (alerta si equipo sobreocupado)
- Tabla de capacidad: usado/disponible, % ocupación, semáforo verde(<70%) / amarillo(<90%) / rojo(≥90%)
- Capacidad = personas × proyectos/persona × (% disponibilidad Q / 100)
- Equipos configurables: nombre, personas, proyectos/persona, Q1%–Q4%
- Drill-down: botón en cada iniciativa abre Modo Squad en contexto de esa iniciativa, con banner "Volver al Programa"

**Compartir y exportar**
- Barra visible en todo momento con botón "Compartir / Exportar"
- Estado serializado en Base64 en URL (?state=...)
- Canales: Teams, WhatsApp, correo, copiar enlace
- Exportar PDF: Vista Squad o Programa (html2canvas + jsPDF)
- Carga automática de estado desde URL al abrir

**Configuración (panel ⚙)**
- Métrica de impacto: Ventas ($) o Clientes
- Umbrales de impacto: alto ≥ $4M, medio ≥ $2M (configurables)
- Umbrales de esfuerzo: alto ≥ 8sp, medio ≥ 4sp (configurables)
- Developers y proyectos por developer (Modo Squad)
- Equipos del programa con disponibilidad por Quarter (Modo Programa)

**Equipos preconfigurados por defecto**
Software Delivery (8p), Arquitectura (4p), Infraestructura (5p), Seg. Informática (3p), QA (6p), Data & Analytics (3p)

---

## Identidad de marca

| | |
|---|---|
| **Nombre** | Priori™ |
| **Tagline** | La claridad de priorizar bien. |
| **Color principal** | Naranja #E8621A |
| **Logo** | 3 barras horizontales (P1 larga, P2 media, P3 corta) en degradé de opacidad |
| **Wordmark** | "priori" en minúscula, bold |
| **Dominio objetivo** | priori.app (verificar disponibilidad en namecheap.com) |
| **Registro de marca** | INPI Clase 42 — en proceso |

---

## Modelo de negocio

**Fase 1 (actual):** Licencia anual por empresa
- Pequeña: USD 3.000–5.000/año (hasta 3 squads)
- Mediana: USD 8.000–12.000/año (squads ilimitados + Programa)
- Enterprise: a consultar (on-premise, SSO, personalización)

**Fase 2 (con webapp):** SaaS por equipo

---

## Documentación generada

Todos los documentos existen en dos versiones: brand Galicia Seguros (uso interno) y brand Priori puro (clientes externos).

| Documento | Descripción |
|---|---|
| `priori-estimador-v2.html` | Herramienta completa (versión Priori, sin logo Galicia) |
| `priori-documentacion-funcional.docx` | Documentación técnica completa (11 secciones) |
| `priori-presentacion.pptx` | Presentación del producto (6 slides) |
| `priori-caso-exito.docx` | Caso de éxito — compañía de seguros líder en Argentina (anónima) |
| `priori-caso-exito-landing.html` | Landing page lista para publicar |
| `priori-contrato-licencia-v1.docx` | Contrato de licencia (12 cláusulas, ley argentina, monotributista) |
| `priori-nota-uso-interno.docx` | Nota de puesta a disposición para Galicia (protección de PI) |
| `priori-nombre-comercial-plan-accion.docx` | Plan de registro de marca + dominios |
| `priori-roadmap-tecnico-webapp.docx` | Hoja de ruta técnica webapp (12 semanas) |
| `priori-logo-*.svg` | Sistema de logo completo (6 variantes SVG) |

---

## Roadmap técnico — Webapp v1

**Stack:** Next.js 14 (App Router) + Supabase (DB + Auth) + Vercel

**Fases:**
- Fase 1 (sem 1–3): Auth, rutas protegidas, DB schema, deploy en Vercel
- Fase 2 (sem 4–8): Migración del core funcional (Squad + Programa + compartir + PDF) con persistencia en Supabase
- Fase 3 (sem 9–12): Organizaciones, roles (Analista / Stakeholder / Líder), invitaciones, pulido

**Costo infraestructura:** USD 0/mes hasta los primeros 5–10 clientes (planes gratuitos de Supabase y Vercel)

**Referencia de stack:** mismo que el proyecto Artentino (https://artentino.vercel.app)

---

## Contexto legal y de PI

- Desarrollado 100% fuera del horario laboral con recursos propios
- El autor tiene contrato de dependencia con Galicia Seguros con cláusulas de PI
- Se entrega a Galicia solo el HTML estático mediante Nota de Puesta a Disposición
- La nota establece explícitamente que no hay cesión de PI
- **Pendiente urgente:** registrar el código en la DNDA (dnda.gob.ar) antes de presentar en Galicia
- **Pendiente:** registrar marca "Priori" en INPI Clase 42
- **Pendiente:** consulta con abogado laboralista sobre cláusula PI del contrato

---

## Instrucciones para Claude en este proyecto

- El archivo de código principal es `priori-estimador-v2.html`. Cualquier modificación funcional se hace sobre ese archivo.
- Toda la lógica de negocio (matriz, capacidad, análisis de impacto) está en JavaScript vanilla dentro del HTML.
- El nombre del producto es **Priori™** — siempre con tilde, siempre en minúscula en el wordmark ("priori"), con ™ en contextos formales.
- La documentación Word se construye con la librería `docx` de npm. Las PPT con `pptxgenjs`.
- Los documentos existen en dos versiones: `galicia-*` (con logo Galicia) y `priori-*` (brand Priori puro).
- Cuando se genere código o documentación nueva, respetar la paleta: naranja #E8621A, negro #111111, gris #6B6B6B, verde #1D9E75, azul #1E6FC5.
- Los campos a completar en documentos legales se marcan entre corchetes: `[CAMPO]`.
