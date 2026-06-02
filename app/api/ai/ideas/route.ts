import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModelForOrg } from "@/lib/ai-providers";

export const runtime = "nodejs";

const IDEAS_QUESTIONS = [
  "¿Qué proceso, área o parte del trabajo querés mejorar o cambiar?",
  "¿Qué problema concreto te genera hoy esa situación? ¿Cómo lo estás resolviendo actualmente?",
  "¿A quién afecta este problema y con qué frecuencia ocurre?",
  "¿Cómo sería el escenario ideal si esto estuviera resuelto?",
  "¿Qué pasa si no se hace nada? ¿Hay alguna urgencia o fecha crítica?",
] as const;

const EXTRACTED_FIELDS = `{
  "title": "título corto y descriptivo de la idea",
  "problem": "descripción clara del problema que resuelve",
  "current_situation": "cómo se resuelve hoy o qué pasa sin la solución",
  "expected_result": "escenario ideal si la idea se implementa",
  "suggested_type": "mejora | nuevo_desarrollo | cambio_proceso"
}`;

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

  const { conversation, step } = await req.json() as {
    conversation: Array<{ role: string; content: string }>;
    step: number;
  };

  const isLastStep = step >= IDEAS_QUESTIONS.length - 1;
  const conversationText = conversation
    .map(m => `${m.role === "user" ? "Usuario" : "Priori AI"}: ${m.content}`)
    .join("\n");

  const systemPrompt = `Sos Priori AI ayudando a capturar y refinar una idea de mejora o innovación.
Pregunta actual (${step + 1}/${IDEAS_QUESTIONS.length}): ${IDEAS_QUESTIONS[step]}
${isLastStep ? "Esta es la última pregunta. Sintetizá toda la información recabada." : ""}

Historial:
${conversationText || "(inicio de entrevista)"}

Extraé la información de las respuestas y devolvé ÚNICAMENTE JSON válido con este formato exacto:
{
  "message": "tu respuesta natural y empática en español",
  "extracted": ${EXTRACTED_FIELDS},
  "complete": ${isLastStep ? "true si tenés suficiente información para la síntesis" : "false"},
  "nextQuestion": ${isLastStep ? "null" : `"${IDEAS_QUESTIONS[step + 1]}"`}
}

Para suggested_type usá: "mejora" si optimiza algo existente, "nuevo_desarrollo" si es algo nueva, "cambio_proceso" si implica cambiar cómo se trabaja.
No agregues ningún texto fuera del JSON.`;

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
      nextQuestion: step + 1 < IDEAS_QUESTIONS.length ? IDEAS_QUESTIONS[step + 1] : null,
    };
  }

  return NextResponse.json(parsed);
}
