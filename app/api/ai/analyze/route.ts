import { NextRequest, NextResponse } from "next/server";
import { streamText, type ModelMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModelForOrg } from "@/lib/ai-providers";
import type { SquadAIContext, CrossAIContext } from "@/lib/ai-context";

export const runtime = "nodejs";

function buildSystemPrompt(ctx: SquadAIContext | CrossAIContext): string {
  if (ctx.mode === "squad") {
    const { capacity, projects } = ctx;
    const pList = projects.map(p =>
      `  - ${p.name} [${p.priority} ${p.quadrant}] ${p.impact.toLocaleString("es-AR")} ${p.metric} | ${p.sprints}sp (${p.pct}% completado) | ${p.status}${p.stakeholder ? " | " + p.stakeholder : ""}`
    ).join("\n");
    return `Sos Priori AI, un analista experto en priorizacion de proyectos de software. Respondes en espanol, de forma concisa y practica.

## Contexto del Squad
Capacidad: ${capacity.devN} devs x ${capacity.devP} proy/dev = ${capacity.limit} proyectos max
En curso: ${capacity.inCourse} de ${capacity.limit} (${Math.round(capacity.inCourse/capacity.limit*100)}% ocupacion)

## Proyectos activos (${projects.length})
${pList || "Sin proyectos activos."}

## Tu rol
- Identificar conflictos de capacidad y proyectos solapados
- Sugerir orden de prioridad basado en ROI (impacto/esfuerzo)
- Detectar riesgos y dependencias criticas
- Responder preguntas sobre la cartera con datos concretos
- Ser directo: usa los datos del contexto para fundamentar cada respuesta`;
  } else {
    const { teams, placed, backlog } = ctx;
    const tList = teams.map(t =>
      `  - ${t.name}: capacidad ${t.capacity.map((c,i)=>`Q${i+1}:${c}`).join(" ")} | utilizacion ${t.utilization.map((u,i)=>`Q${i+1}:${u}%`).join(" ")}`
    ).join("\n");
    const iList = placed.map(i =>
      `  - ${i.priority} ${i.name} | Q${i.qStart+1}–Q${i.qStart+i.duration} | ${i.sprintsTotal}sp | Equipos: ${i.teams.join(", ")}`
    ).join("\n");
    const bList = backlog.map(i => `  - ${i.priority} ${i.name} (${i.sprints}sp)`).join("\n");
    return `Sos Priori AI, un experto en gestion de programas multi-equipo. Respondes en espanol.

## Equipos y capacidad
${tList || "Sin equipos."}

## Iniciativas en el timeline (${placed.length})
${iList || "Sin iniciativas asignadas."}

## Backlog del programa (${backlog.length})
${bList || "Backlog vacio."}

## Tu rol
- Detectar sobrecargas de equipo por quarter
- Sugerir redistribucion de iniciativas entre quarters
- Identificar dependencias y riesgos de planning
- Responder con datos concretos del programa`;
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: m } = await admin.from("organization_members")
    .select("organization_id").eq("profile_id", user.id).single();
  if (!m) return NextResponse.json({ error: "No org" }, { status: 403 });

  const orgId = (m as { organization_id: string }).organization_id;

  let model;
  try {
    model = await getModelForOrg(orgId);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  const { messages, contextJson } = await req.json() as {
    messages: Array<{ role: string; content: string }>;
    contextJson?: string;
  };

  let systemPrompt = "Sos Priori AI, un asistente de priorizacion estrategica. Respondes en espanol.";
  if (contextJson) {
    try {
      const ctx = JSON.parse(contextJson);
      systemPrompt = buildSystemPrompt(ctx);
    } catch {}
  }

  const result = streamText({ model, messages: (messages ?? []) as ModelMessage[], system: systemPrompt });
  return result.toTextStreamResponse();
}
