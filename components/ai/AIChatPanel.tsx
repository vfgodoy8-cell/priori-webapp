"use client";

import { useState, useRef, useEffect } from "react";
import { IconSparkles, IconSend, IconX } from "@tabler/icons-react";
import type { AIContext } from "@/lib/ai-context";

type Message = { id: string; role: "user" | "assistant"; content: string };

type Props = {
  open: boolean;
  onClose: () => void;
  context: AIContext;
};

const SQUAD_SUGGESTIONS = [
  "Que proyectos deberia priorizar esta semana?",
  "Hay conflictos de capacidad en el squad?",
  "Cual es el ROI mas alto del backlog?",
];
const CROSS_SUGGESTIONS = [
  "Que equipos estan mas cargados este quarter?",
  "Hay iniciativas que deberia mover de quarter?",
  "Como queda la capacidad si agrego una iniciativa en Q2?",
];

export function AIChatPanel({ open, onClose, context }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput("");
    setError(null);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };

    const next = [...messages, userMsg];
    setMessages([...next, assistantMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          contextJson: JSON.stringify(context),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al conectar con la IA" }));
        throw new Error(err.error ?? "Error desconocido");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const final = accumulated;
        setMessages(prev => [
          ...prev.slice(0, -1),
          { ...assistantMsg, content: final },
        ]);
      }
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg.includes("AI no configurada")
        ? "Configura tu API key en Settings → Configuracion IA para usar Priori AI."
        : msg);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  const suggestions = context.mode === "squad" ? SQUAD_SUGGESTIONS : CROSS_SUGGESTIONS;

  return (
    <>
      {open && <div className="fixed inset-0 z-[250] bg-black/20" onClick={onClose} />}
      <div className={`fixed top-0 left-0 z-[300] h-full w-[400px] bg-white border-r border-gray-100 shadow-2xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
          <div className="flex items-center gap-2">
            <IconSparkles size={16} className="text-brand-orange" />
            <h3 className="text-[15px] font-bold text-brand-black">Priori AI</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-brand-orange uppercase tracking-wide">Beta</span>
          </div>
          <button onClick={onClose} className="text-brand-gray hover:text-brand-black transition">
            <IconX size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col gap-3 mt-4">
              <p className="text-sm text-brand-gray text-center leading-relaxed">
                Hola! Soy Priori AI. Tengo el contexto completo de tu {context.mode === "squad" ? "Squad" : "programa Cross"}.
              </p>
              <div className="flex flex-col gap-2">
                {suggestions.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-gray-200 hover:border-brand-orange hover:bg-orange-50 text-brand-gray hover:text-brand-black transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <IconSparkles size={12} className="text-brand-orange" />
                </div>
              )}
              <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-brand-orange text-white rounded-tr-sm"
                  : "bg-gray-100 text-brand-black rounded-tl-sm"
              }`}>
                {m.content || (loading && m.role === "assistant" && (
                  <span className="flex gap-1 items-center py-0.5">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-gray animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Preguntale a Priori AI... (Enter para enviar)"
              rows={2}
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange disabled:opacity-60"
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 disabled:opacity-50 text-white transition flex-shrink-0">
              <IconSend size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
