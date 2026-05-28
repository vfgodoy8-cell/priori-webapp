"use client";

import { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { Team, Initiative } from "@/types/database";
import { computeQuadrant, QUADRANT_META } from "@/lib/quadrant";
import {
  createInitiative,
  updateInitiative,
  deleteInitiative,
  placeInitiative,
  unplaceInitiative,
  createTeam,
  updateTeam,
  deleteTeam,
} from "./actions";
import { ShareModal } from "@/components/ui/ShareModal";
import { type AppRole, ROLE_LABEL, ROLE_COLOR, ROLE_BG, ROLE_BORDER } from "@/lib/roles";

const Q_LABELS = ["Q1", "Q2", "Q3", "Q4"];
const Q_SUB = ["Ene – Mar", "Abr – Jun", "Jul – Sep", "Oct – Dic"];

function teamCap(team: Team, q: number): number {
  const pcts = [team.q1_pct, team.q2_pct, team.q3_pct, team.q4_pct];
  return Math.floor(team.personas * team.proy_per_persona * (pcts[q] / 100));
}

function teamUsed(initiatives: Initiative[], teamId: string, q: number): number {
  return initiatives.filter(
    (i) =>
      i.q_start !== null &&
      i.status === "active" &&
      Array.isArray(i.team_ids) &&
      i.team_ids.includes(teamId) &&
      i.q_start <= q &&
      i.q_start + i.duration_quarters - 1 >= q
  ).length;
}

function capColor(pct: number): string {
  return pct >= 100 ? "#E24B4A" : pct >= 95 ? "#E8621A" : pct >= 90 ? "#EF9F27" : "#1D9E75";
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 py-2.5 text-sm font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white transition"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}

type PanelTab = "form" | "teams";

type Props = {
  orgId: string;
  initialTeams: Team[];
  initialInitiatives: Initiative[];
  role: AppRole;
};

export function CrossView({ orgId, initialTeams, initialInitiatives, role }: Props) {
  const readOnly = role === "member";
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [initiatives, setInitiatives] = useState<Initiative[]>(initialInitiatives);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverQ, setDragOverQ] = useState<number | null>(null);
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("form");
  const [editIni, setEditIni] = useState<Initiative | undefined>();
  const [newTeamName, setNewTeamName] = useState("");
  const [showShare, setShowShare] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const iniAction = editIni ? updateInitiative : createInitiative;
  const [iniState, iniFormAction] = useFormState(iniAction, { error: null });

  // Quadrant preview state
  const [prevImp, setPrevImp] = useState(0);
  const [prevSp, setPrevSp] = useState(0);
  useEffect(() => {
    setPrevImp(editIni?.impact_value ?? 0);
    setPrevSp(editIni?.effort_sprints ?? 0);
  }, [editIni]);
  const qPrev = prevImp > 0 || prevSp > 0 ? computeQuadrant(prevImp, prevSp) : null;
  const mPrev = qPrev ? QUADRANT_META[qPrev] : null;

  // Reset form on successful save
  useEffect(() => {
    if (iniState.error === null && formRef.current?.dataset.submitted === "true") {
      formRef.current.dataset.submitted = "";
      setEditIni(undefined);
      formRef.current.reset();
      setPrevImp(0);
      setPrevSp(0);
    }
  }, [iniState]);

  function getQFromEvent(e: React.DragEvent<HTMLDivElement>): number {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    return Math.min(3, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * 4)));
  }

  function handleGridDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOverQ(getQFromEvent(e));
  }

  function handleGridDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!dragId) return;
    const q = getQFromEvent(e);
    const ini = initiatives.find((i) => i.id === dragId);
    if (!ini) { setDragId(null); setDragOverQ(null); return; }

    let targetQ = q;
    if (q + ini.duration_quarters > 4) {
      targetQ = 4 - ini.duration_quarters;
      setWarnMsg(`"${ini.name}" no cabe desde Q${q + 1} — movida a Q${targetQ + 1}.`);
    } else {
      setWarnMsg(null);
    }

    handleDrop(targetQ, ini);
    setDragId(null);
    setDragOverQ(null);
  }

  function handleDrop(q: number, ini: Initiative) {
    const overCapTeams = ini.team_ids?.filter((tid) => {
      for (let d = 0; d < ini.duration_quarters; d++) {
        const qc = q + d;
        if (qc > 3) continue;
        const team = teams.find((t) => t.id === tid);
        if (!team) continue;
        if (teamUsed(initiatives, tid, qc) + 1 > teamCap(team, qc)) return true;
      }
      return false;
    }) ?? [];

    if (overCapTeams.length > 0) {
      const names = overCapTeams.map((tid) => teams.find((t) => t.id === tid)?.name ?? tid).join(", ");
      if (!confirm(`Capacidad superada en: ${names}. ¿Asignar de todas formas?`)) return;
    }

    setInitiatives((prev) => prev.map((i) => (i.id === ini.id ? { ...i, q_start: q } : i)));
    placeInitiative(ini.id, q);
  }

  function handleUnplace(ini: Initiative) {
    setInitiatives((prev) => prev.map((i) => (i.id === ini.id ? { ...i, q_start: null } : i)));
    unplaceInitiative(ini.id);
  }

  function openEdit(ini: Initiative) {
    setEditIni(ini);
    setPanelTab("form");
    setPanelOpen(true);
  }

  function handleDelete(id: string) {
    setInitiatives((prev) => prev.filter((i) => i.id !== id));
    deleteInitiative(id);
  }

  function handleTeamUpdate(id: string, field: string, value: string | number) {
    setTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
    updateTeam(id, { [field]: value } as Partial<Team>);
  }

  function handleTeamDelete(id: string) {
    setTeams((prev) => prev.filter((t) => t.id !== id));
    deleteTeam(id);
  }

  const backlog = initiatives.filter((i) => i.q_start === null && i.status === "active");

  return (
    <div className="flex flex-col gap-4">
      {/* Share bar */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <span className="text-xs font-bold text-brand-gray uppercase tracking-wide">Compartir vista</span>
        <button
          onClick={() => setShowShare(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-white transition"
        >
          ↗ Compartir / Exportar
        </button>
        <span className="ml-auto">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: ROLE_BG[role],
              color: ROLE_COLOR[role],
              border: `1px solid ${ROLE_BORDER[role]}`,
            }}
          >
            {ROLE_LABEL[role]}
          </span>
        </span>
      </div>

      {showShare && <ShareModal mode="cross" onClose={() => setShowShare(false)} />}

      {/* Timeline */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* Quarter headers */}
        <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200">
          {Q_LABELS.map((q, qi) => (
            <div
              key={q}
              className={`px-4 py-3 flex flex-col gap-0.5 ${qi < 3 ? "border-r border-gray-200" : ""}`}
            >
              <span className="text-sm font-bold text-brand-black">{q}</span>
              <span className="text-xs text-brand-gray">{Q_SUB[qi]}</span>
            </div>
          ))}
        </div>

        {/* Q grid — single CSS-grid container; cards span columns */}
        <div
          ref={gridRef}
          className="relative min-h-[240px]"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridAutoFlow: "row", alignContent: "start" }}
          onDragOver={readOnly ? undefined : handleGridDragOver}
          onDragLeave={readOnly ? undefined : (e) => { if (!gridRef.current?.contains(e.relatedTarget as Node)) setDragOverQ(null); }}
          onDrop={readOnly ? undefined : handleGridDrop}
        >
          {/* Column dividers + drag-hover highlight */}
          {[0, 1, 2, 3].map((q) => (
            <div
              key={q}
              className="absolute inset-y-0 pointer-events-none transition-colors duration-150"
              style={{
                left: `${q * 25}%`,
                width: "25%",
                background: dragOverQ === q ? "rgba(232,98,26,0.06)" : "transparent",
                borderRight: q < 3 ? "1px solid #E5E7EB" : undefined,
              }}
            />
          ))}

          {initiatives.filter((i) => i.q_start !== null && i.status === "active").length === 0 && (
            <div className="col-span-4 flex items-center justify-center py-10 select-none">
              <p className="text-xs text-gray-300">Arrastrá iniciativas al timeline</p>
            </div>
          )}

          {[...initiatives]
            .filter((i) => i.q_start !== null && i.status === "active")
            .sort((a, b) => {
              if (a.q_start! !== b.q_start!) return a.q_start! - b.q_start!;
              return b.duration_quarters - a.duration_quarters;
            })
            .map((ini) => {
              const qd = QUADRANT_META[computeQuadrant(ini.impact_value, ini.effort_sprints)];
              const tNames = (ini.team_ids ?? [])
                .map((tid) => teams.find((t) => t.id === tid)?.name.split(" ")[0] ?? "?")
                .slice(0, 3);
              const span = Math.min(ini.duration_quarters, 4 - ini.q_start!);
              return (
                <div
                  key={ini.id}
                  draggable={!readOnly}
                  onDragStart={readOnly ? undefined : () => setDragId(ini.id)}
                  className={`rounded-lg p-2.5 border-[1.5px] select-none hover:shadow-md transition-shadow m-1.5 ${readOnly ? "cursor-default" : "cursor-grab"}`}
                  style={{
                    gridColumn: `${ini.q_start! + 1} / span ${span}`,
                    background: qd.bg,
                    borderColor: `${qd.color}55`,
                    borderRight: ini.duration_quarters > 1 ? `2px dashed ${qd.color}99` : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="text-xs font-bold text-brand-black leading-snug">
                      {qd.priority} {ini.name}
                    </div>
                    {ini.duration_quarters > 1 && (
                      <span className="text-[10px] font-bold flex-shrink-0 ml-1" style={{ color: qd.color }}>
                        ↔ {ini.duration_quarters}Q
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-brand-gray mt-1">
                    {ini.stakeholder} · {ini.effort_sprints}sp
                  </div>
                  {tNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {tNames.map((n) => (
                        <span key={n} className="text-[9px] px-1.5 py-0.5 rounded bg-black/[.07] text-brand-gray font-semibold">
                          {n}
                        </span>
                      ))}
                    </div>
                  )}
                  {!readOnly && (
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => openEdit(ini)} className="text-[10px] text-gray-400 hover:text-brand-orange px-1" title="Editar">✏️</button>
                      <button onClick={() => handleUnplace(ini)} className="text-[10px] text-gray-400 hover:text-brand-orange px-1" title="Quitar del Quarter">✕</button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Warning bar */}
      {warnMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-brand-orange">
          <span className="flex-shrink-0">⚠</span>
          <span>{warnMsg}</span>
          <button onClick={() => setWarnMsg(null)} className="ml-auto text-gray-400 hover:text-brand-orange">×</button>
        </div>
      )}

      {/* Capacity table */}
      {teams.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-bold text-brand-black">Capacidad por equipo</span>
            <span className="text-xs text-brand-gray">Verde &lt;90% · Amarillo 90-95% · Naranja 95-99% · Rojo ≥100%</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10px] text-brand-gray uppercase tracking-wide font-semibold px-4 py-2 border-b border-gray-100 min-w-[160px]">
                    Equipo
                  </th>
                  {Q_LABELS.map((q) => (
                    <th key={q} className="text-center text-[10px] text-brand-gray uppercase tracking-wide font-semibold px-3 py-2 border-b border-gray-100">
                      {q}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td className="px-4 py-2 text-xs font-semibold text-brand-black border-b border-gray-50">
                      {team.name}
                    </td>
                    {[0, 1, 2, 3].map((q) => {
                      const cap = teamCap(team, q);
                      const used = teamUsed(initiatives, team.id, q);
                      const pct = cap === 0 ? 0 : Math.min(100, Math.round((used / cap) * 100));
                      const col = capColor(pct);
                      const over = used > cap;
                      return (
                        <td
                          key={q}
                          className="px-3 py-2 min-w-[90px] border-b border-gray-50"
                          style={over ? { background: "#FEF3F3" } : {}}
                        >
                          <div className="h-1.5 bg-gray-100 rounded-full border border-gray-200 overflow-hidden mb-1">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, pct)}%`, background: col }}
                            />
                          </div>
                          <div className="text-center text-[11px] font-bold" style={{ color: col }}>
                            {over ? "⚠️ " : ""}{used}/{cap} ({pct}%)
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Backlog */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-bold text-brand-black">Backlog del Programa</span>
          <span className="text-xs text-brand-gray">{backlog.length} sin asignar</span>
        </div>
        <div
          className="px-4 py-3 flex flex-wrap gap-2 min-h-[52px]"
          onDragOver={readOnly ? undefined : (e) => e.preventDefault()}
          onDrop={readOnly ? undefined : (e) => {
            e.preventDefault();
            if (!dragId) return;
            const ini = initiatives.find((i) => i.id === dragId);
            if (ini && ini.q_start !== null) {
              setInitiatives((prev) => prev.map((i) => (i.id === dragId ? { ...i, q_start: null } : i)));
              unplaceInitiative(dragId);
            }
            setDragId(null);
          }}
        >
          {backlog.length === 0 && (
            <span className="text-xs text-gray-300">Todas las iniciativas están asignadas</span>
          )}
          {backlog.map((ini) => {
            const qd = QUADRANT_META[computeQuadrant(ini.impact_value, ini.effort_sprints)];
            return (
              <div
                key={ini.id}
                draggable={!readOnly}
                onDragStart={readOnly ? undefined : () => setDragId(ini.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] select-none hover:shadow-sm transition ${readOnly ? "cursor-default" : "cursor-grab"}`}
                style={{ background: qd.bg, borderColor: `${qd.color}55`, color: qd.color }}
                title={readOnly ? undefined : "Arrastrá al Quarter para asignar"}
              >
                {qd.priority} {ini.name}
                <span className="opacity-60 text-[10px]"> · {ini.duration_quarters}Q</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      {!readOnly && (
        <button
          onClick={() => { setPanelOpen(true); setPanelTab("form"); setEditIni(undefined); }}
          className="fixed bottom-7 right-7 z-[200] w-12 h-12 rounded-full bg-brand-orange hover:bg-orange-600 text-white text-2xl flex items-center justify-center shadow-lg transition"
          title="Panel del programa"
        >
          ⚙
        </button>
      )}

      {/* Overlay */}
      {panelOpen && !readOnly && (
        <div
          className="fixed inset-0 z-[250] bg-black/25"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* Sliding panel */}
      {!readOnly && <div
        className={`fixed top-0 right-0 z-[300] h-full w-[380px] bg-white border-l border-gray-100 shadow-2xl flex flex-col transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 py-3.5 bg-orange-50 border-b-2 border-brand-orange">
          <h3 className="text-sm font-bold text-brand-orange">Panel del programa</h3>
          <button onClick={() => setPanelOpen(false)} className="text-brand-gray hover:text-brand-black text-xl leading-none">×</button>
        </div>

        <div className="flex border-b border-gray-100">
          {(["form", "teams"] as PanelTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setPanelTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold transition border-b-2 ${panelTab === t ? "text-brand-orange border-brand-orange" : "text-brand-gray border-transparent hover:text-brand-black"}`}
            >
              {t === "form" ? "Iniciativas" : "Equipos"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── TAB: FORMULARIO ── */}
          {panelTab === "form" && (
            <div className="p-4 flex flex-col gap-3">
              {editIni && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg text-xs text-brand-orange font-semibold">
                  ✏️ Editando: {editIni.name}
                </div>
              )}
              <div className="text-xs font-bold text-brand-gray uppercase tracking-wider">
                {editIni ? "Editar iniciativa" : "Nueva iniciativa"}
              </div>

              <form
                ref={formRef}
                action={iniFormAction}
                onSubmit={() => { if (formRef.current) formRef.current.dataset.submitted = "true"; }}
                className="flex flex-col gap-3"
              >
                {editIni && <input type="hidden" name="id" value={editIni.id} />}
                <input type="hidden" name="team_ids" id="team_ids_hidden" value={JSON.stringify((editIni?.team_ids ?? []))} />

                <F label="Nombre *">
                  <input name="name" type="text" required defaultValue={editIni?.name} placeholder="Ej: Transformación Digital" className={inp} />
                </F>
                <F label="Stakeholder">
                  <input name="stakeholder" type="text" defaultValue={editIni?.stakeholder ?? ""} placeholder="Ej: Dirección General" className={inp} />
                </F>
                <div className="grid grid-cols-2 gap-2">
                  <F label="Impacto ($)">
                    <input name="impact_value" type="number" min="0" step="any"
                      defaultValue={editIni?.impact_value ?? ""}
                      placeholder="0" className={inp}
                      onChange={(e) => setPrevImp(parseFloat(e.target.value) || 0)} />
                  </F>
                  <F label="Sprints">
                    <input name="effort_sprints" type="number" min="1" max="24"
                      defaultValue={editIni?.effort_sprints ?? ""}
                      placeholder="1–24" className={inp}
                      onChange={(e) => setPrevSp(parseInt(e.target.value) || 0)} />
                  </F>
                </div>
                <F label="Duración">
                  <select name="duration_quarters" defaultValue={editIni?.duration_quarters ?? 1} className={inp}>
                    <option value={1}>1 Quarter</option>
                    <option value={2}>2 Quarters</option>
                    <option value={3}>3 Quarters</option>
                    <option value={4}>4 Quarters (año completo)</option>
                  </select>
                </F>

                {/* Team checkboxes */}
                {teams.length > 0 && (
                  <F label="Equipos requeridos">
                    <TeamCheckboxes
                      teams={teams}
                      selected={editIni?.team_ids ?? []}
                      onChange={(ids) => {
                        const hidden = document.getElementById("team_ids_hidden") as HTMLInputElement;
                        if (hidden) hidden.value = JSON.stringify(ids);
                      }}
                    />
                  </F>
                )}

                <F label="Descripción">
                  <textarea name="description" rows={2} defaultValue={editIni?.description ?? ""} placeholder="Objetivo principal..." className={`${inp} resize-none`} />
                </F>

                {mPrev && (
                  <div className="px-3 py-2 rounded-lg border text-xs" style={{ background: mPrev.bg, borderColor: `${mPrev.color}44` }}>
                    <div className="font-bold uppercase tracking-wider text-[10px] text-brand-gray mb-1">Cuadrante asignado</div>
                    <div className="font-bold" style={{ color: mPrev.color }}>{mPrev.priority} {mPrev.label}</div>
                  </div>
                )}

                {iniState.error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{iniState.error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  {editIni && (
                    <button type="button" onClick={() => setEditIni(undefined)} className="px-4 py-2.5 text-sm text-brand-gray border border-gray-200 rounded-lg hover:text-brand-black transition">
                      Cancelar
                    </button>
                  )}
                  <SubmitBtn label={editIni ? "Guardar cambios" : "Agregar"} />
                </div>
              </form>

              {/* Initiative list */}
              <div className="text-xs font-bold text-brand-gray uppercase tracking-wider mt-2">
                Iniciativas cargadas
              </div>
              <div className="flex flex-col gap-1.5">
                {initiatives.filter((i) => i.status === "active").length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No hay iniciativas.</p>
                )}
                {[...initiatives]
                  .filter((i) => i.status === "active")
                  .sort((a, b) => {
                    const qa = computeQuadrant(a.impact_value, a.effort_sprints);
                    const qb = computeQuadrant(b.impact_value, b.effort_sprints);
                    return Number(QUADRANT_META[qa].priority[1]) - Number(QUADRANT_META[qb].priority[1]);
                  })
                  .map((ini) => {
                    const qd = QUADRANT_META[computeQuadrant(ini.impact_value, ini.effort_sprints)];
                    const isEd = ini.id === editIni?.id;
                    return (
                      <div
                        key={ini.id}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${isEd ? "border-brand-orange bg-orange-50" : "border-gray-100 bg-gray-50"}`}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: qd.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-brand-black truncate">{ini.name}</div>
                          <div className="text-[10px] text-brand-gray">
                            {ini.stakeholder} · {ini.duration_quarters}Q ·{" "}
                            {ini.q_start !== null ? `Q${ini.q_start + 1}` : "Sin asignar"}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${qd.color}22`, color: qd.color }}>
                          {qd.priority}
                        </span>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(ini)} className="text-[11px] text-gray-400 hover:text-brand-orange px-1 transition" title="Editar">✏️</button>
                          <button onClick={() => handleDelete(ini.id)} className="text-[11px] text-gray-400 hover:text-red-600 px-1 transition" title="Eliminar">🗑️</button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── TAB: EQUIPOS ── */}
          {panelTab === "teams" && (
            <div className="p-4 flex flex-col gap-3">
              <div className="text-xs font-bold text-brand-gray uppercase tracking-wider">Equipos del programa</div>

              {/* Header */}
              <div className="grid grid-cols-[1fr_40px_40px_36px_36px_36px_36px_24px] gap-1 px-1">
                {["Equipo", "Pers.", "P/p", "Q1%", "Q2%", "Q3%", "Q4%", ""].map((h, i) => (
                  <span key={i} className="text-[9px] text-brand-gray uppercase tracking-wide font-semibold text-center first:text-left">
                    {h}
                  </span>
                ))}
              </div>

              {teams.map((team) => (
                <div
                  key={team.id}
                  className="grid grid-cols-[1fr_40px_40px_36px_36px_36px_36px_24px] gap-1 items-center px-2 py-2 rounded-lg border border-gray-100 bg-gray-50"
                >
                  <input
                    type="text"
                    defaultValue={team.name}
                    onBlur={(e) => handleTeamUpdate(team.id, "name", e.target.value)}
                    className="text-xs px-1.5 py-1 border border-gray-200 rounded bg-white w-full"
                  />
                  {(["personas", "proy_per_persona"] as const).map((f) => (
                    <input
                      key={f}
                      type="number"
                      min="1"
                      defaultValue={team[f]}
                      onBlur={(e) => handleTeamUpdate(team.id, f, parseInt(e.target.value) || 1)}
                      className="text-xs px-1 py-1 border border-gray-200 rounded bg-white text-center w-full"
                    />
                  ))}
                  {(["q1_pct", "q2_pct", "q3_pct", "q4_pct"] as const).map((f) => (
                    <input
                      key={f}
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={team[f]}
                      onBlur={(e) => handleTeamUpdate(team.id, f, parseInt(e.target.value) || 0)}
                      className="text-xs px-1 py-1 border border-gray-200 rounded bg-white text-center w-full"
                    />
                  ))}
                  <button onClick={() => handleTeamDelete(team.id)} className="text-gray-300 hover:text-red-500 text-xs">🗑️</button>
                </div>
              ))}

              {/* Add team */}
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Nombre del equipo"
                  className={`${inp} flex-1`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTeamName.trim()) {
                      e.preventDefault();
                      const fd = new FormData();
                      fd.set("name", newTeamName.trim());
                      createTeam({ error: null }, fd).then((res) => {
                        if (!res.error) {
                          setNewTeamName("");
                          // Force page refresh to get new team with ID
                          window.location.reload();
                        }
                      });
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newTeamName.trim()) return;
                    const fd = new FormData();
                    fd.set("name", newTeamName.trim());
                    createTeam({ error: null }, fd).then((res) => {
                      if (!res.error) {
                        setNewTeamName("");
                        window.location.reload();
                      }
                    });
                  }}
                  className="px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:border-brand-orange hover:text-brand-orange transition"
                >
                  + Agregar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>}
    </div>
  );
}

// Controlled checkboxes for team selection
function TeamCheckboxes({
  teams,
  selected,
  onChange,
}: {
  teams: Team[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [checked, setChecked] = useState<string[]>(selected);

  function toggle(id: string) {
    const next = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id];
    setChecked(next);
    onChange(next);
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {teams.map((t) => (
        <label
          key={t.id}
          className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg border cursor-pointer font-semibold transition ${
            checked.includes(t.id)
              ? "bg-brand-orange text-white border-brand-orange"
              : "bg-white text-brand-gray border-gray-200 hover:border-brand-orange"
          }`}
        >
          <input
            type="checkbox"
            className="hidden"
            checked={checked.includes(t.id)}
            onChange={() => toggle(t.id)}
          />
          {t.name.split(" ")[0]}
        </label>
      ))}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inp = "w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent bg-white";
