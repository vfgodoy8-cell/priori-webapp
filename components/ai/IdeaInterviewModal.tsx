"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconBulb, IconX, IconCheck, IconChevronRight } from "@tabler/icons-react";
import { createIdea } from "@/app/(app)/ideas/actions";
import type { IdeaSuggestedType } from "@/types/database";

const IDEAS_QUESTIONS = [
  "¿Qué proceso, área o parte del trabajo querés mejorar o cambiar?",
  "¿Qué problema concreto te genera hoy esa situación? ¿Cómo lo estás resolviendo actualmente?",
  "¿A quién afecta este problema y con qué frecuencia ocurre?",
  "¿Cómo sería el escenario ideal si esto estuviera resuelto?",
  "¿Qué pasa si no se hace nada? ¿Hay alguna urgencia o fecha crítica?",
];

type ExtractedIdea = {
  title?: string;
  problem?: string;
  current_situation?: string;
  expected_result?: string;
  suggested_type?: IdeaSuggestedType;
};

type Message = { role: "user" | "assistant"; content: string };

type Props = { onClose: () => void };

const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange";

const TYPE_LABELS: Record<IdeaSuggestedType, string> = {
  mejora: "Mejora de proceso existente",
  nuevo_desarrollo: "Nuevo desarrollo",
  cambio_proceso: "Cambio de proceso",
};

export function IdeaInterviewModal({ onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [conversation, setConversation] = useState<Message[]>([
    { role: "assistant", content: IDEAS_QUESTIONS[0] },
  ]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedIdea>({});
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSend() {
    if (!answer.trim() || loading) return;
    setLoading(true);
    setError(null);
    const newConv: Message[] = [...conversation, { role: "user", content: answer.trim() }];
    setConversation(newConv);
    setAnswer("");

    try {
      const res = await fetch("/api/ai/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: newConv, step }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al conectar con la IA");
      }
      const data = await res.json() as {
        message: string; extracted: ExtractedIdea;
        complete: boolean; nextQuestion: string | null;
      };

      const merged = { ...extracted, ...data.extracted };
      setExtracted(merged);
      const aiMsg: Message = { role: "assistant", content: data.message };

      if (data.complete) {
        setConversation([...newConv, aiMsg]);
        setComplete(true);
      } else {
        const nextQ: Message = {
          role: "assistant",
          content: data.nextQuestion ?? IDEAS_QUESTIONS[Math.min(step + 1, IDEAS_QUESTIONS.length - 1)],
        };
        setConversation([...newConv, aiMsg, nextQ]);
        setStep(s => Math.min(s + 1, IDEAS_QUESTIONS.length - 1));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await createIdea({
        title: extracted.title?.trim() || "Sin título",
        problem: extracted.problem?.trim() || "",
        current_situation: extracted.current_situation?.trim() ?? null,
        expected_result: extracted.expected_result?.trim() ?? null,
        suggested_type: extracted.suggested_type ?? null,
        raw_transcript: conversation,
      });
      if (result.error) throw new Error(result.error);
      setSavedId(result.id ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-50 to-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <IconBulb size={16} className="text-brand-orange" />
            <span className="font-bold text-brand-black text-sm">Tengo una idea</span>
          </div>
          {!complete && !savedId && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-brand-gray">Pregunta {step + 1} de {IDEAS_QUESTIONS.length}</span>
              <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-orange rounded-full transition-all"
                  style={{ width: `${((step + 1) / IDEAS_QUESTIONS.length) * 100}%` }}
                />
              </div>
            </div>
          )}
          <button onClick={onClose} className="text-brand-gray hover:text-brand-black">
            <IconX size={18} />
          </button>
        </div>

        {/* Chat */}
        {!complete && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {conversation.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-brand-orange text-white rounded-tr-sm"
                      : "bg-gray-100 text-brand-black rounded-tl-sm"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-3.5 py-2.5 rounded-2xl bg-gray-100">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-gray animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                rows={2}
                disabled={loading}
                placeholder="Tu respuesta…"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
              <button
                onClick={handleSend}
                disabled={loading || !answer.trim()}
                className="px-4 rounded-xl bg-brand-orange hover:bg-orange-600 disabled:opacity-50 text-white transition flex items-center flex-shrink-0"
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Confirmación */}
        {complete && !savedId && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-brand-green">
                <IconCheck size={18} />
                <span className="text-sm font-bold">Entrevista completa. Revisá y ajustá:</span>
              </div>
              <div className="flex flex-col gap-3">
                <Field label="Título *">
                  <input className={inp} value={extracted.title ?? ""} onChange={e => setExtracted(p => ({ ...p, title: e.target.value }))} />
                </Field>
                <Field label="Problema">
                  <textarea rows={2} className={`${inp} resize-none`} value={extracted.problem ?? ""} onChange={e => setExtracted(p => ({ ...p, problem: e.target.value }))} />
                </Field>
                <Field label="Situación actual">
                  <textarea rows={2} className={`${inp} resize-none`} value={extracted.current_situation ?? ""} onChange={e => setExtracted(p => ({ ...p, current_situation: e.target.value }))} />
                </Field>
                <Field label="Resultado esperado">
                  <textarea rows={2} className={`${inp} resize-none`} value={extracted.expected_result ?? ""} onChange={e => setExtracted(p => ({ ...p, expected_result: e.target.value }))} />
                </Field>
                <Field label="Tipo">
                  <select className={inp} value={extracted.suggested_type ?? ""} onChange={e => setExtracted(p => ({ ...p, suggested_type: e.target.value as IdeaSuggestedType || undefined }))}>
                    <option value="">Sin clasificar</option>
                    {(Object.entries(TYPE_LABELS) as [IdeaSuggestedType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={onClose} className="px-4 py-2.5 text-sm text-brand-gray border border-gray-200 rounded-lg hover:text-brand-black transition">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !extracted.title?.trim()}
                className="flex-1 py-2.5 text-sm font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white transition"
              >
                {saving ? "Guardando…" : "Guardar idea"}
              </button>
            </div>
          </div>
        )}

        {/* Éxito */}
        {savedId && (
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-brand-green">
              <IconCheck size={20} />
              <span className="font-bold">Idea guardada</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-sm font-semibold text-brand-black">{extracted.title}</p>
              {extracted.problem && <p className="text-xs text-brand-gray mt-1 line-clamp-2">{extracted.problem}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push(`/squad?idea=${savedId}`)}
                className="w-full py-2.5 text-sm font-bold rounded-lg bg-brand-orange hover:bg-orange-600 text-white transition"
              >
                Convertir en proyecto →
              </button>
              <button
                onClick={() => { router.push("/ideas"); onClose(); }}
                className="w-full py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-brand-gray hover:text-brand-black transition"
              >
                Ver todas las ideas
              </button>
              <button onClick={onClose} className="text-xs text-brand-gray hover:text-brand-black py-1">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold text-brand-gray uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
