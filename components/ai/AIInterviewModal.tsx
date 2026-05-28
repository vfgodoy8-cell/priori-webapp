"use client";

import { useState } from "react";
import { IconSparkles, IconX, IconCheck, IconChevronRight } from "@tabler/icons-react";

const SQUAD_QUESTIONS = [
  "Que es la iniciativa y que problema resuelve para el negocio?",
  "A quien impacta principalmente? (clientes, ventas, operaciones internas)",
  "Cuanto valor genera? Podes mencionarlo en dolares o cantidad de clientes afectados.",
  "Cuantos sprints estimas que lleva implementarla?",
  "Hay alguna fecha critica de salida a produccion?",
  "De que otros proyectos o sistemas depende?",
];

const CROSS_QUESTIONS = [
  "Que es la iniciativa y que problema del negocio resuelve?",
  "A que equipo pertenece o cual es el equipo principal que la ejecuta?",
  "En que quarter necesitas que empiece? (Q1=Ene-Mar, Q2=Abr-Jun, Q3=Jul-Sep, Q4=Oct-Dic)",
  "Cuantos quarters dura aproximadamente?",
  "Tiene dependencias con otras iniciativas del programa?",
  "Quien es el stakeholder o responsable de esta iniciativa?",
];

type ExtractedSquad = {
  name?: string; description?: string; stakeholder?: string;
  impact_value?: number; impact_metric?: "revenue" | "customers";
  effort_sprints?: number; production_date?: string; dependencies?: string;
};

type ExtractedCross = {
  name?: string; description?: string; stakeholder?: string;
  team_name?: string; q_start?: number; duration_quarters?: number; dependencies?: string;
};

type Extracted = ExtractedSquad & ExtractedCross;

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  mode: "squad" | "cross";
  onConfirm: (data: Extracted) => void;
  onClose: () => void;
};

export function AIInterviewModal({ mode, onConfirm, onClose }: Props) {
  const questions = mode === "squad" ? SQUAD_QUESTIONS : CROSS_QUESTIONS;
  const [step, setStep] = useState(0);
  const [conversation, setConversation] = useState<Message[]>([
    { role: "assistant", content: questions[0] },
  ]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<Extracted>({});
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!answer.trim()) return;
    setLoading(true);
    setError(null);
    const newConversation: Message[] = [...conversation, { role: "user", content: answer.trim() }];
    setConversation(newConversation);
    setAnswer("");

    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, conversation: newConversation, step }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al conectar con la IA");
      }

      const data = await res.json() as {
        message: string; extracted: Extracted;
        complete: boolean; nextQuestion: string | null;
      };

      setExtracted(prev => ({ ...prev, ...data.extracted }));
      const aiMsg: Message = { role: "assistant", content: data.message };

      if (data.complete) {
        setConversation([...newConversation, aiMsg]);
        setExtracted(prev => ({ ...prev, ...data.extracted }));
        setComplete(true);
      } else {
        const nextQ: Message = { role: "assistant", content: data.nextQuestion ?? questions[Math.min(step + 1, questions.length - 1)] };
        setConversation([...newConversation, aiMsg, nextQ]);
        setStep(s => Math.min(s + 1, questions.length - 1));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-50 to-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <IconSparkles size={16} className="text-brand-orange" />
            <span className="font-bold text-brand-black text-sm">Cargar con Priori AI</span>
          </div>
          {!complete && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-brand-gray">Pregunta {step + 1} de {questions.length}</span>
              <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-orange rounded-full transition-all"
                  style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
              </div>
            </div>
          )}
          <button onClick={onClose} className="text-brand-gray hover:text-brand-black">
            <IconX size={18} />
          </button>
        </div>

        {/* Chat */}
        {!complete ? (
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
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-gray animate-bounce"
                          style={{ animationDelay: `${i*150}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={2} disabled={loading}
                placeholder="Tu respuesta..."
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange" />
              <button onClick={handleSend} disabled={loading || !answer.trim()}
                className="px-4 rounded-xl bg-brand-orange hover:bg-orange-600 disabled:opacity-50 text-white transition flex items-center gap-1 text-sm font-semibold flex-shrink-0">
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Confirmation screen */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-brand-green">
                <IconCheck size={18} />
                <span className="text-sm font-bold">Entrevista completa. Revisa y ajusta los datos:</span>
              </div>
              <ExtractedForm mode={mode} data={extracted} onChange={setExtracted} />
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={onClose} className="px-4 py-2.5 text-sm text-brand-gray border border-gray-200 rounded-lg hover:text-brand-black transition">
                Cancelar
              </button>
              <button onClick={() => onConfirm(extracted)}
                className="flex-1 py-2.5 text-sm font-bold rounded-lg bg-brand-orange hover:bg-orange-600 text-white transition">
                Crear ${mode === "squad" ? "proyecto" : "iniciativa"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange";
const Q_LABELS = ["Q1", "Q2", "Q3", "Q4"];

function ExtractedForm({ mode, data, onChange }: { mode: "squad" | "cross"; data: Extracted; onChange: (d: Extracted) => void }) {
  function set(k: keyof Extracted, v: unknown) { onChange({ ...data, [k]: v }); }

  if (mode === "squad") {
    return (
      <div className="flex flex-col gap-3">
        <Field label="Nombre *"><input className={inp} value={data.name ?? ""} onChange={e => set("name", e.target.value)} /></Field>
        <Field label="Stakeholder"><input className={inp} value={data.stakeholder ?? ""} onChange={e => set("stakeholder", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Impacto ($)"><input type="number" className={inp} value={data.impact_value ?? ""} onChange={e => set("impact_value", parseFloat(e.target.value)||0)} /></Field>
          <Field label="Metrica"><select className={inp} value={data.impact_metric ?? "revenue"} onChange={e => set("impact_metric", e.target.value)}>
            <option value="revenue">Ventas ($)</option><option value="customers">Clientes</option>
          </select></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Sprints"><input type="number" min="1" max="24" className={inp} value={data.effort_sprints ?? ""} onChange={e => set("effort_sprints", parseInt(e.target.value)||1)} /></Field>
          <Field label="Fecha prod."><input type="date" className={inp} value={data.production_date ?? ""} onChange={e => set("production_date", e.target.value||undefined)} /></Field>
        </div>
        <Field label="Dependencias"><input className={inp} value={data.dependencies ?? ""} onChange={e => set("dependencies", e.target.value)} /></Field>
        <Field label="Descripcion"><textarea rows={2} className={`${inp} resize-none`} value={data.description ?? ""} onChange={e => set("description", e.target.value)} /></Field>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Nombre *"><input className={inp} value={data.name ?? ""} onChange={e => set("name", e.target.value)} /></Field>
      <Field label="Stakeholder"><input className={inp} value={data.stakeholder ?? ""} onChange={e => set("stakeholder", e.target.value)} /></Field>
      <Field label="Equipo principal"><input className={inp} value={data.team_name ?? ""} onChange={e => set("team_name", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Quarter inicio"><select className={inp} value={data.q_start ?? 0} onChange={e => set("q_start", parseInt(e.target.value))}>
          {Q_LABELS.map((q,i) => <option key={i} value={i}>{q}</option>)}
        </select></Field>
        <Field label="Duracion (Quarters)"><input type="number" min="1" max="4" className={inp} value={data.duration_quarters ?? 1} onChange={e => set("duration_quarters", parseInt(e.target.value)||1)} /></Field>
      </div>
      <Field label="Dependencias"><input className={inp} value={data.dependencies ?? ""} onChange={e => set("dependencies", e.target.value)} /></Field>
      <Field label="Descripcion"><textarea rows={2} className={`${inp} resize-none`} value={data.description ?? ""} onChange={e => set("description", e.target.value)} /></Field>
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
