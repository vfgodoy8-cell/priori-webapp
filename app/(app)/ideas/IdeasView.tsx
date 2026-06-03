"use client";

import { useState } from "react";
import Link from "next/link";
import { IdeaInterviewModal } from "@/components/ai/IdeaInterviewModal";
import { updateIdeaStatus } from "./actions";
import type { Idea, IdeaStatus } from "@/types/database";
import { type AppRole, canWrite } from "@/lib/roles";

const STATUS_LABELS: Record<IdeaStatus, string> = {
  raw: "Sin refinar",
  refined: "Refinada",
  promoted: "Promovida",
  discarded: "Descartada",
};

const STATUS_COLORS: Record<IdeaStatus, { bg: string; color: string; border: string }> = {
  raw:       { bg: "#F5F5F5",  color: "#6B6B6B", border: "#E5E5E5" },
  refined:   { bg: "#EFF6FF",  color: "#1E6FC5", border: "#BDD5F5" },
  promoted:  { bg: "#F0FBF7",  color: "#1D9E75", border: "#A7E3CE" },
  discarded: { bg: "#FFF4EE",  color: "#E8621A", border: "#FDDCB5" },
};

const TYPE_LABELS: Record<string, string> = {
  mejora:            "Mejora",
  nuevo_desarrollo:  "Nuevo desarrollo",
  cambio_proceso:    "Cambio de proceso",
};

const TABS: { key: IdeaStatus | "all"; label: string }[] = [
  { key: "all",      label: "Todas" },
  { key: "raw",      label: "Sin refinar" },
  { key: "refined",  label: "Refinadas" },
  { key: "promoted", label: "Promovidas" },
  { key: "discarded",label: "Descartadas" },
];

type Props = {
  ideas: Idea[];
  role: AppRole;
};

export function IdeasView({ ideas, role }: Props) {
  const [tab, setTab] = useState<IdeaStatus | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const filtered = tab === "all" ? ideas : ideas.filter(i => i.status === tab);

  async function handleStatus(id: string, status: IdeaStatus) {
    setPending(id);
    await updateIdeaStatus(id, status);
    setPending(null);
  }

  return (
    <>
      {/* Title row */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Mejoras e Ideas</h1>
          <p className="text-xs text-brand-gray mt-0.5">
            {ideas.length} idea{ideas.length !== 1 ? "s" : ""} registrada{ideas.length !== 1 ? "s" : ""}
          </p>
        </div>
        {role === "owner" && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-brand-orange hover:bg-orange-600 text-white transition"
          >
            💡 Tengo una idea
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              tab === t.key
                ? "bg-white text-brand-black font-medium shadow-sm"
                : "text-brand-gray hover:text-brand-black"
            }`}
          >
            {t.label}
            {t.key !== "all" && (
              <span className="ml-1.5 text-xs text-brand-gray">
                ({ideas.filter(i => i.status === t.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-brand-gray text-sm">
          {tab === "all" ? "Todavía no hay ideas registradas." : `No hay ideas en estado "${STATUS_LABELS[tab as IdeaStatus]}".`}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(idea => {
            const sc = STATUS_COLORS[idea.status];
            const isLoading = pending === idea.id;
            return (
              <div key={idea.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3 shadow-sm">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-black">{idea.title}</p>
                    {idea.problem && (
                      <p className="text-xs text-brand-gray mt-0.5 line-clamp-2">{idea.problem}</p>
                    )}
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                  >
                    {STATUS_LABELS[idea.status]}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-[11px] text-brand-gray">
                  {idea.suggested_type && (
                    <span className="bg-gray-100 rounded px-1.5 py-0.5">{TYPE_LABELS[idea.suggested_type] ?? idea.suggested_type}</span>
                  )}
                  {idea.author?.full_name && <span>{idea.author.full_name}</span>}
                  <span>{new Date(idea.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
                </div>

                {/* Actions */}
                {canWrite(role) && (
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                    {idea.status === "raw" && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleStatus(idea.id, "refined")}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-blue-200 text-brand-blue hover:bg-blue-50 disabled:opacity-50 transition"
                      >
                        Marcar como refinada
                      </button>
                    )}
                    {idea.status === "refined" && (
                      <>
                        <Link
                          href={`/squad?idea=${idea.id}`}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-orange hover:bg-orange-600 text-white transition"
                        >
                          Convertir en proyecto →
                        </Link>
                        <button
                          disabled={isLoading}
                          onClick={() => handleStatus(idea.id, "promoted")}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-green-200 text-brand-green hover:bg-green-50 disabled:opacity-50 transition"
                        >
                          Marcar como promovida
                        </button>
                      </>
                    )}
                    {idea.status !== "discarded" && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleStatus(idea.id, "discarded")}
                        className="text-xs text-brand-gray hover:text-red-600 px-2 py-1 ml-auto disabled:opacity-50 transition"
                      >
                        Descartar
                      </button>
                    )}
                    {idea.status === "discarded" && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleStatus(idea.id, "raw")}
                        className="text-xs text-brand-gray hover:text-brand-black px-2 py-1 disabled:opacity-50 transition"
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && <IdeaInterviewModal onClose={() => setShowModal(false)} />}
    </>
  );
}
