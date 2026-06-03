"use client";

import { useState, useEffect } from "react";
import { createDeviation, listDeviations, resolveDeviation, deleteDeviation } from "@/app/(app)/deviations/actions";
import type { Deviation } from "@/types/database";

type Props = {
  entityType: "project" | "initiative";
  entityId: string;
  entityName: string;
  canWrite: boolean;
};

export function DeviationsThread({ entityType, entityId, entityName, canWrite }: Props) {
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [blockingDep, setBlockingDep] = useState("");
  const [affectedDep, setAffectedDep] = useState("");

  useEffect(() => {
    setLoading(true);
    listDeviations(entityType, entityId).then(data => {
      setDeviations(data);
      setLoading(false);
    });
  }, [entityType, entityId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await createDeviation({
      entityType, entityId, entityName,
      date,
      reason,
      blocking_dependency: blockingDep.trim() || null,
      affected_dependency: affectedDep.trim() || null,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setReason(""); setBlockingDep(""); setAffectedDep(""); setDate(today);
      setDeviations(await listDeviations(entityType, entityId));
    }
    setSubmitting(false);
  }

  async function handleResolve(id: string) {
    const result = await resolveDeviation(id, entityType, entityId, entityName);
    if (!result.error) setDeviations(await listDeviations(entityType, entityId));
  }

  async function handleDelete(id: string) {
    await deleteDeviation(id);
    setDeviations(prev => prev.filter(d => d.id !== id));
  }

  const sorted = [...deviations].sort((a, b) =>
    a.status === b.status ? 0 : a.status === "open" ? -1 : 1
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Lista */}
      <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
        {loading && <p className="text-xs text-gray-400 text-center py-3">Cargando…</p>}
        {!loading && sorted.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-3">Sin desvíos registrados.</p>
        )}
        {sorted.map(d => (
          <div
            key={d.id}
            className={`rounded-lg border p-3 flex flex-col gap-1.5 ${
              d.status === "resolved"
                ? "border-gray-100 bg-gray-50 opacity-60"
                : "border-orange-100 bg-orange-50/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-brand-black">{fmtDate(d.date)}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                d.status === "open"
                  ? "bg-orange-100 text-brand-orange"
                  : "bg-green-100 text-brand-green"
              }`}>
                {d.status === "open" ? "Abierto" : "Resuelto"}
              </span>
            </div>
            <p className="text-xs text-brand-black leading-snug">{d.reason}</p>
            {d.blocking_dependency && (
              <p className="text-[11px] text-brand-gray">
                <span className="font-semibold">Bloqueado por:</span> {d.blocking_dependency}
              </p>
            )}
            {d.affected_dependency && (
              <p className="text-[11px] text-brand-gray">
                <span className="font-semibold">Podría afectar:</span> {d.affected_dependency}
              </p>
            )}
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] text-gray-400">
                {d.reporter?.full_name ?? "Usuario"} · {fmtDateTime(d.created_at)}
              </span>
              {canWrite && (
                <div className="flex items-center gap-2">
                  {d.status === "open" && (
                    <button
                      onClick={() => handleResolve(d.id)}
                      className="text-[10px] font-semibold text-brand-green hover:underline"
                    >
                      Resolver
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="text-[10px] text-gray-300 hover:text-red-400"
                    title="Eliminar"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-gray-100 pt-2">
        <div className="text-[11px] font-bold text-brand-gray uppercase tracking-wider">Reportar desvío</div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange"
        />
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Razón del desvío o bloqueo… *"
          rows={2}
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
        />
        <input
          value={blockingDep}
          onChange={e => setBlockingDep(e.target.value)}
          placeholder="¿Qué dependencia lo bloqueó? (opcional)"
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange"
        />
        <input
          value={affectedDep}
          onChange={e => setAffectedDep(e.target.value)}
          placeholder="¿Qué podría verse afectado? (opcional)"
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange"
        />
        {error && <p className="text-[11px] text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !reason.trim()}
          className="self-end px-4 py-1.5 text-xs font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-50 text-white transition"
        >
          {submitting ? "Guardando…" : "Reportar"}
        </button>
      </form>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}
