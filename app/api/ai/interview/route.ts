import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModelForOrg } from "@/lib/ai-providers";

export const runtime = "nodejs";

const SQUAD_QUESTIONS = [
  "Que es la iniciativa y que problema resuelve para el negocio?",
  "A quien impacta principalmente? (clientes, ventas, operaciones internas)",
  "Cuanto valor genera? Podes mencionarlo en dolares o cantidad de clientes afectados.",
  "Cuantos sprints estimas que lleva implementarla? (cada sprint = 2 semanas)",
  "Hay alguna fecha critica de salida a produccion?",
  "De que otros proyectos o sistemas depende?",
] as const;

const CROSS_QUESTIONS = [
  "Que es la iniciativa y que problema del negocio resuelve?",
  "A que equipo pertenece o cual es el equipo principal que la ejecuta?",
  "En que quarter necesitas que empiece? (Q1 = Ene-Mar, Q2 = Abr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dic)",
  "Cuantos quarters dura aproximadamente?",
  "Tiene dependencias con otras iniciativas del programa?",
  "Quien es el stakeholder o responsable de esta iniciativa?",
] as const;

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
  try { model = await getModelForOrg(orgId); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 422 }); }

  const { mode, conversation, step } = await req.json() as {
    mode: "squad" | "cross";
    conversation: Array<{ role: string; content: string }>;
    step: number;
  };

  const questions = mode === "squad" ? SQUAD_QUESTIONS : CROSS_QUESTIONS;
  const isLastStep = step >= questions.length - 1;
  const conversationText = conversation.map(m => `${m.role === "user" ? "Usuario" : "Priori AI"}: ${m.content}`).join("\n");

  const squadFields = `{
  "name": "nombre del proyecto o iniciativa",
  "description": "descripcion breve del objetivo",
  "stakeholder": "cliente o area responsable",
  "impact_value": 0,
  "impact_metric": "revenue o customers",
  "effort_sprints": 0,
  "production_date": "YYYY-MM-DD o null",
  "dependencies": "dependencias tecnicas o null"
}`;

  const crossFields = `{
  "name": "nombre de la iniciativa",
  "description": "descripcion breve",
  "stakeholder": "responsable de negocio",
  "team_name": "nombre del equipo principal",
  "q_start": 0,
  "duration_quarters": 1,
  "dependencies": "dependencias o null"
}`;

  const systemPrompt = `Sos Priori AI realizando una entrevista para capturar un proyecto.
Modo: ${mode === "squad" ? "Squad (proyecto de equipo)" : "Cross (iniciativa del programa)"}
Pregunta actual (${step + 1}/${questions.length}): ${questions[step]}
${isLastStep ? "Esta es la ultima pregunta. Al responder, completa todos los campos posibles." : ""}

Historial:
${conversationText || "(inicio de entrevista)"}

Extrae la informacion de las respuestas y devuelve UNICAMENTE JSON valido con este formato exacto:
{
  "message": "tu respuesta natural y amigable al usuario en espanol",
  "extracted": ${mode === "squad" ? squadFields : crossFields},
  "complete": ${isLastStep ? "true si ya tienes suficiente informacion" : "false"},
  "nextQuestion": ${isLastStep ? "null si complete es true, si no la siguiente pregunta" : `"${step + 1 < questions.length ? questions[step + 1] : null}"`}
}

No agregues ningun texto fuera del JSON.`;

  const { text } = await generateText({ model, prompt: systemPrompt });
  
  let parsed;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    parsed = {
      message: text,
      extracted: {},
      complete: false,
      nextQuestion: step + 1 < questions.length ? questions[step + 1] : null,
    };
  }

  return NextResponse.json(parsed);
}
