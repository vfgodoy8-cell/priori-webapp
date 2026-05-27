"use client";

import type { Project } from "@/types/database";
import { computeQuadrant, QUADRANT_META } from "@/lib/quadrant";

type Warning = { level: "ok" | "caution" | "danger"; text: string };

function buildWarnings(current: Project, incoming: Project, allProjects: Project[]): Warning[] {
  const qCur = computeQuadrant(current.impact_value, current.effort_sprints);
  const qInc = computeQuadrant(incoming.impact_value, incoming.effort_sprints);
  const mCur = QUADRANT_META[qCur];
  const mInc = QUADRANT_META[qInc];
  const ws: Warning[] = [];

  const pDiff = Number(mInc.priority[1]) - Number(mCur.priority[1]);
  if (pDiff < 0) ws.push({ level: "ok", text: `Entrante con mayor prioridad (${mInc.priority} ${mInc.label} vs ${mCur.priority} ${mCur.label})` });
  else if (pDiff === 0) ws.push({ level: "caution", text: `Mismo cuadrante: ambos son "${mCur.label}"` });
  else ws.push({ level: "danger", text: `En curso tiene mayor prioridad (${mCur.priority} ${mCur.label} vs ${mInc.priority} ${mInc.label})` });

  const done = current.sprints_completed ?? 0;
  if (done > 0) {
    const pct = Math.round((done / current.effort_sprints) * 100);
    ws.push({ level: pct >= 50 ? "danger" : "caution", text: `${done}/${current.effort_sprints} sprints completados (${pct}%) — se perdería progreso` });
  } else {
    ws.push({ level: "ok", text: "Sin sprints completados — sin progreso en riesgo" });
  }

  const deps = allProjects.filter(p =>
    p.dependencies?.toLowerCase().includes(current.name.toLowerCase())
  );
  if (deps.length) ws.push({ level: "danger", text: `${deps.length} proyecto${deps.length > 1 ? "s dependen" : " depende"} de este: ${deps.map(p => p.name).join(", ")}` });
  else ws.push({ level: "ok", text: "Ningún proyecto activo depende de este" });

  ws.push({ level: "caution", text: `Stakeholder afectado: ${current.stakeholder || "Sin stakeholder"}` });

  if (current.production_date) {
    const df = Math.round((new Date(current.production_date).getTime() - Date.now()) / 86400000);
    if (df < 0) ws.push({ level: "danger", text: `Fecha de producción ya vencida (${current.production_date})` });
    else if (df < 14) ws.push({ level: "danger", text: `Sale a producción en ${df} días — urgente` });
    else if (df < 30) ws.push({ level: "caution", text: `Sale a producción en ${df} días (${current.production_date})` });
    else ws.push({ level: "ok", text: `Fecha de producción: ${current.production_date} — margen disponible` });
  }

  return ws;
}

const ICON: Record<string, string> = { ok: "✅", caution: "⚠️", danger: "🔴" };
const TEXT_COLOR: Record<string, string> = { ok: "#6B6B6B", caution: "#8a6000", danger: "#8a1f1f" };

type Props = {
  incoming: Project;
  cursoProjects: Project[];
  allProjects: Project[];
  sqLim: number;
  devN: number;
  onSwap: (outgoingId: string) => void;
  onCancel: () => void;
};

export function ImpactModal({ incoming, cursoProjects, allProjects, sqLim, devN, onSwap, onCancel }: Props) {
  const qInc = computeQuadrant(incoming.impact_value, incoming.effort_sprints);
  const mInc = QUADRANT_META[qInc];

  return (
    <div
      className="fixed inset-0 z-[400] bg-black/40 flex items-start justify-center overflow-y-auto py-6 px-3"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-[460px] w-full my-auto shadow-xl">
        <div className="text-base font-bold text-brand-black mb-1">Análisis de impacto</div>
        <div className="text-xs text-brand-gray mb-4 leading-relaxed">
          Los {devN} developers ya tienen <strong>{sqLim} proyecto{sqLim !== 1 ? "s" : ""}</strong> en paralelo.
          Para agregar &ldquo;<strong>{incoming.name}</strong>&rdquo;, revisá el impacto de pausar cada uno:
        </div>

        {/* Incoming card */}
        <div className="flex items-center gap-3 p-3 rounded-lg mb-4" style={{ background: mInc.bg, border: `1px solid ${mInc.color}44` }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${mInc.color}22` }}>
            {mInc.priority}
          </div>
          <div>
            <div className="text-sm font-bold text-brand-black">{incoming.name}</div>
            <div className="text-xs text-brand-gray mt-0.5">
              {incoming.stakeholder} · {mInc.label} · {incoming.effort_sprints} sprints
              {incoming.production_date ? ` · Producción: ${incoming.production_date}` : ""}
            </div>
          </div>
        </div>

        <div className="text-xs font-bold text-brand-gray uppercase tracking-wider mb-2">
          Elegí qué proyecto mover al backlog
        </div>

        <div className="flex flex-col gap-3">
          {cursoProjects.map((cur) => {
            const ws = buildWarnings(cur, incoming, allProjects);
            const dangerCount = ws.filter(w => w.level === "danger").length;
            const qCur = computeQuadrant(cur.impact_value, cur.effort_sprints);
            const mCur = QUADRANT_META[qCur];

            return (
              <div
                key={cur.id}
                className="border border-gray-100 rounded-xl overflow-hidden cursor-pointer hover:border-brand-orange transition"
                onClick={() => onSwap(cur.id)}
              >
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#F4F4F4" }}>
                  <div>
                    <div className="text-sm font-bold text-brand-black">{cur.name}</div>
                    <div className="text-xs text-brand-gray mt-0.5">
                      {cur.stakeholder} · {cur.sprints_completed ?? 0}/{cur.effort_sprints} sprints
                      {cur.production_date ? ` · Producción: ${cur.production_date}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {dangerCount > 0 && (
                      <span className="text-[10px] bg-red-50 text-red-800 px-2 py-0.5 rounded-full font-semibold">
                        {dangerCount} riesgo{dangerCount > 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${mCur.color}22`, color: mCur.color }}>
                      {mCur.priority} {mCur.label}
                    </span>
                  </div>
                </div>
                <div className="px-4 py-3 flex flex-col gap-1.5 bg-white">
                  {ws.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                      <span className="flex-shrink-0 mt-px">{ICON[w.level]}</span>
                      <span style={{ color: TEXT_COLOR[w.level] }}>{w.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <button
            onClick={onCancel}
            className="text-xs text-brand-gray hover:text-brand-black px-4 py-2 border border-gray-200 rounded-lg"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
