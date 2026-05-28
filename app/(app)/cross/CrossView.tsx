"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { Team, Initiative, Project } from "@/types/database";
import { computeQuadrant, QUADRANT_META } from "@/lib/quadrant";
import { dateToQuarter, quartersBetween } from "@/lib/squad-logic";
import {
  createInitiative,
  updateInitiative,
  deleteInitiative,
  placeInitiative,
  unplaceInitiative,
} from "./actions";
import { ShareModal } from "@/components/ui/ShareModal";
import { type AppRole, ROLE_LABEL, ROLE_COLOR, ROLE_BG, ROLE_BORDER } from "@/lib/roles";

const Q_LABELS = ["Q1", "Q2", "Q3", "Q4"];
const Q_SUB = ["Ene – Mar", "Abr – Jun", "Jul – Sep", "Oct – Dic"];

function teamCap(team: Team, q: number): number {
  const pcts = [team.q1_pct, team.q2_pct, team.q3_pct, team.q4_pct];
  return Math.floor(team.personas * team.proy_per_persona * (pcts[q] / 100));
}

function teamAvailPeople(team: Team, q: number): number {
  const pcts = [team.q1_pct, team.q2_pct, team.q3_pct, team.q4_pct];
  return Math.floor(team.personas * (pcts[q] / 100));
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

type SquadProjectMin = Pick<Project, "id" | "name" | "effort_sprints" | "impact_value" | "status" | "squad_status">;

type Props = {
  orgId: string;
  initialTeams: Team[];
  initialInitiatives: Initiative[];
  squadProjects?: SquadProjectMin[];
  role: AppRole;
};

export function CrossView({ orgId, initialTeams, initialInitiatives, squadProjects = [], role }: Props) {
  const readOnly = role === "member";
  const router = useRouter();

  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [initiatives, setInitiatives] = useState<Initiative[]>(initialInitiatives);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverQ, setDragOverQ] = useState<number | null>(null);
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editIni, setEditIni] = useState<Initiative | undefined>();
  const [showShare, setShowShare] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Sync local state when server sends fresh props (after router.refresh())
  useEffect(() => { setInitiatives(initialInitiatives); }, [initialInitiatives]);
  useEffect(() => { setTeams(initialTeams); }, [initialTeams]);

  const iniAction = editIni ? updateInitiative : createInitiative;
  const [iniState, iniFormAction] = useFormState(iniAction, { error: null });

  // Form reactive state
  const [prevImp, setPrevImp] = useState(0);
  const [prevSp, setPrevSp] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [teamAllocations, setTeamAllocations] = useState<Record<string, number>>({});
  const [sqProjectIds, setSqProjectIds] = useState<string[]>([]);

  useEffect(() => {
    setPrevImp(editIni?.impact_value ?? 0);
    setPrevSp(editIni?.effort_sprints ?? 0);
    setStartDate(editIni?.start_date ?? "");
    setEndDate(editIni?.end_date ?? "");
    setTeamAllocations((editIni?.team_allocations as Record<string, number>) ?? {});
    setSqProjectIds((editIni?.sq_project_ids as string[]) ?? []);
  }, [editIni]);

  // Auto-calculate duration from sprints: 1 quarter = 6 sprints (2-week sprints)
  const autoCalcDuration = Math.min(4, Math.max(1, Math.ceil(prevSp / 6)));
  const calcQStart = startDate ? dateToQuarter(startDate) : null;
  const calcDuration = startDate && endDate ? quartersBetween(startDate, endDate) : null;
  const effectiveDuration = calcDuration ?? autoCalcDuration;

  const qPrev = prevImp > 0 || prevSp > 0 ? computeQuadrant(prevImp, prevSp) : null;
  const mPrev = qPrev ? QUADRANT_META[qPrev] : null;

  // Per-team capacity warnings (people-based) — maps teamId → overloaded quarter labels
  const teamWarnings = useMemo<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};
    if (calcQStart === null) return result;
    const dur = effectiveDuration;
    Object.entries(teamAllocations).forEach(([teamId, n]) => {
      if (!n) return;
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;
      const overQ: string[] = [];
      for (let d = 0; d < dur; d++) {
        const q = calcQStart + d;
        if (q > 3) continue;
        const avail = teamAvailPeople(team, q);
        const used = initiatives
          .filter((i) => i.q_start !== null && i.status === "active" && i.id !== editIni?.id)
          .filter((i) => i.q_start! <= q && i.q_start! + i.duration_quarters - 1 >= q)
          .reduce((sum, i) => {
            const alloc = i.team_allocations as Record<string, number> | null;
            return sum + (alloc?.[teamId] ?? 0);
          }, 0);
        if (used + n > avail) overQ.push(`Q${q + 1}`);
      }
      if (overQ.length > 0) result[teamId] = overQ;
    });
    return result;
  }, [teamAllocations, calcQStart, effectiveDuration, teams, initiatives, editIni]);

  // Reset form on successful save + refresh data
  useEffect(() => {
    if (iniState.error === null && formRef.current?.dataset.submitted === "true") {
      formRef.current.dataset.submitted = "";
      setEditIni(undefined);
      formRef.current.reset();
      setPrevImp(0); setPrevSp(0);
      setStartDate(""); setEndDate("");
      setTeamAllocations({});
      setSqProjectIds([]);
      router.refresh();
    }
  }, [iniState, router]);

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
    setInitiatives((prev) => prev.map((i) => (i.id === ini.id ? { ...i, q_start: q } : i)));
    placeInitiative(ini.id, q);
  }

  function handleUnplace(ini: Initiative) {
    setInitiatives((prev) => prev.map((i) => (i.id === ini.id ? { ...i, q_start: null } : i)));
    unplaceInitiative(ini.id);
  }

  function openEdit(ini: Initiative) {
    setEditIni(ini);
    setPanelOpen(true);
    // Sync form state immediately (not via useEffect — avoids reference-equality skips)
    setPrevImp(ini.impact_value);
    setPrevSp(ini.effort_sprints);
    setStartDate(ini.start_date ?? "");
    setEndDate(ini.end_date ?? "");
    setTeamAllocations((ini.team_allocations as Record<string, number>) ?? {});
    setSqProjectIds((ini.sq_project_ids as string[]) ?? []);
  }

  function handleDelete(id: string) {
    setInitiatives((prev) => prev.filter((i) => i.id !== id));
    deleteInitiative(id);
  }

  const backlog = initiatives.filter((i) => i.q_start === null && i.status === "active");
  void orgId;

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
            style={{ background: ROLE_BG[role], color: ROLE_COLOR[role], border: `1px solid ${ROLE_BORDER[role]}` }}
          >
            {ROLE_LABEL[role]}
          </span>
        </span>
      </div>

      {showShare && <ShareModal mode="cross" onClose={() => setShowShare(false)} />}

      {/* Timeline */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* Quarter column headers */}
        <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200">
          {Q_LABELS.map((q, qi) => (
            <div key={q} className={`px-4 py-3 flex flex-col gap-0.5 ${qi < 3 ? "border-r border-gray-200" : ""}`}>
              <span className="text-sm font-bold text-brand-black">{q}</span>
              <span className="text-xs text-brand-gray">{Q_SUB[qi]}</span>
            </div>
          ))}
        </div>

        {/* CSS Grid timeline — each card uses gridColumn span for multi-quarter stretch */}
        <div
          ref={gridRef}
          className="relative min-h-[200px]"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            alignContent: "start",
          }}
          onDragOver={readOnly ? undefined : handleGridDragOver}
          onDragLeave={readOnly ? undefined : (e) => { if (!gridRef.current?.contains(e.relatedTarget as Node)) setDragOverQ(null); }}
          onDrop={readOnly ? undefined : handleGridDrop}
        >
          {/* Quarter column background highlights for drag feedback */}
          {[0, 1, 2, 3].map((q) => (
            <div
              key={q}
              className="absolute inset-y-0 pointer-events-none"
              style={{
                left: `${q * 25}%`,
                width: "25%",
                background: dragOverQ === q ? "rgba(232,98,26,0.06)" : "transparent",
                borderRight: q < 3 ? "1px solid #E5E7EB" : undefined,
                transition: "background 0.15s",
              }}
            />
          ))}

          {/* Empty state */}
          {initiatives.filter((i) => i.q_start !== null && i.status === "active").length === 0 && (
            <div style={{ gridColumn: "1 / span 4" }} className="flex items-center justify-center py-10 select-none">
              <p className="text-xs text-gray-300">{readOnly ? "Sin iniciativas asignadas" : "Arrastrá iniciativas al timeline"}</p>
            </div>
          )}

          {/* Initiative cards — gridColumn span makes them visually stretch across quarters */}
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
              const colStart = ini.q_start! + 1;
              const span = Math.min(ini.duration_quarters, 5 - colStart);

              return (
                <div
                  key={ini.id}
                  draggable={!readOnly}
                  onDragStart={readOnly ? undefined : () => setDragId(ini.id)}
                  className={`rounded-lg border-[1.5px] select-none hover:shadow-md transition-shadow ${readOnly ? "cursor-default" : "cursor-grab"}`}
                  style={{
                    gridColumn: `${colStart} / span ${span}`,
                    margin: "5px 4px",
                    backgroundColor: qd.bg,
                    borderColor: `${qd.color}55`,
                    backgroundImage: span > 1 ? quarterDividerLines(span, qd.color) : undefined,
                  }}
                >
                  <div className="flex items-start gap-1.5 p-2.5">
                    {/* Left — title, meta, teams */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-brand-black leading-snug">{qd.priority} {ini.name}</div>
                      <div className="text-[10px] text-brand-gray mt-1">{ini.stakeholder} · {ini.effort_sprints}sp</div>
                      {ini.start_date && (
                        <div className="text-[10px] text-brand-gray">{ini.start_date} → {ini.end_date ?? "…"}</div>
                      )}
                      {tNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tNames.map((n) => (
                            <span key={n} className="text-[9px] px-1.5 py-0.5 rounded bg-black/[.07] text-brand-gray font-semibold">{n}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Right — multi-quarter badge + squad link + actions */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pl-1">
                      {span > 1 && (
                        <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: qd.color }}>
                          ↔ {span}Q
                        </span>
                      )}
                      {Array.isArray(ini.sq_project_ids) && ini.sq_project_ids.length > 0 && (
                        <a
                          href={`/squad?ini=${ini.id}`}
                          className="flex items-center gap-0.5 text-[10px] font-semibold text-brand-blue hover:underline whitespace-nowrap"
                          title={`Ver proyectos vinculados en Modo Squad`}
                        >
                          👥 {ini.sq_project_ids.length} proyecto{ini.sq_project_ids.length !== 1 ? "s" : ""} Squad
                        </a>
                      )}
                      {!readOnly && (
                        <div className="flex gap-0.5 mt-auto">
                          <button onClick={() => openEdit(ini)} className="text-[10px] text-gray-400 hover:text-brand-orange px-0.5" title="Editar">✏️</button>
                          <button onClick={() => handleUnplace(ini)} className="text-[10px] text-gray-400 hover:text-brand-orange px-0.5" title="Quitar del Quarter">✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

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
                  <th className="text-left text-[10px] text-brand-gray uppercase tracking-wide font-semibold px-4 py-2 border-b border-gray-100 min-w-[160px]">Equipo</th>
                  {Q_LABELS.map((q) => (
                    <th key={q} className="text-center text-[10px] text-brand-gray uppercase tracking-wide font-semibold px-3 py-2 border-b border-gray-100">{q}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td className="px-4 py-2 text-xs font-semibold text-brand-black border-b border-gray-50">{team.name}</td>
                    {[0, 1, 2, 3].map((q) => {
                      const cap = teamCap(team, q);
                      const used = teamUsed(initiatives, team.id, q);
                      const pct = cap === 0 ? 0 : Math.min(100, Math.round((used / cap) * 100));
                      const col = capColor(pct);
                      const over = used > cap;
                      return (
                        <td key={q} className="px-3 py-2 min-w-[90px] border-b border-gray-50" style={over ? { background: "#FEF3F3" } : {}}>
                          <div className="h-1.5 bg-gray-100 rounded-full border border-gray-200 overflow-hidden mb-1">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: col }} />
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
          {backlog.length === 0 && <span className="text-xs text-gray-300">Todas las iniciativas están asignadas</span>}
          {backlog.map((ini) => {
            const qd = QUADRANT_META[computeQuadrant(ini.impact_value, ini.effort_sprints)];
            return (
              <div
                key={ini.id}
                draggable={!readOnly}
                onDragStart={readOnly ? undefined : () => setDragId(ini.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] select-none hover:shadow-sm transition ${readOnly ? "cursor-default" : "cursor-grab"}`}
                style={{ background: qd.bg, borderColor: `${qd.color}55`, color: qd.color }}
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
          onClick={() => { setPanelOpen(true); setEditIni(undefined); }}
          className="fixed bottom-7 right-7 z-[200] w-12 h-12 rounded-full bg-brand-orange hover:bg-orange-600 text-white text-2xl flex items-center justify-center shadow-lg transition"
          title="Nueva iniciativa"
        >
          +
        </button>
      )}

      {/* Overlay + Panel */}
      {!readOnly && panelOpen && (
        <div className="fixed inset-0 z-[250] bg-black/25" onClick={() => setPanelOpen(false)} />
      )}

      {!readOnly && (
        <div className={`fixed top-0 right-0 z-[300] h-full w-[400px] bg-white border-l border-gray-100 shadow-2xl flex flex-col transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between px-4 py-3.5 bg-orange-50 border-b-2 border-brand-orange">
            <h3 className="text-sm font-bold text-brand-orange">Panel del programa</h3>
            <button onClick={() => setPanelOpen(false)} className="text-brand-gray hover:text-brand-black text-xl leading-none">×</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {editIni && (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg text-xs text-brand-orange font-semibold">
                ✏️ Editando: {editIni.name}
              </div>
            )}
            <div className="text-xs font-bold text-brand-gray uppercase tracking-wider">
              {editIni ? "Editar iniciativa" : "Nueva iniciativa"}
            </div>

            <form
              key={editIni?.id ?? "new"}
              ref={formRef}
              action={iniFormAction}
              onSubmit={() => { if (formRef.current) formRef.current.dataset.submitted = "true"; }}
              className="flex flex-col gap-3"
            >
              {editIni && <input type="hidden" name="id" value={editIni.id} />}
              <input type="hidden" name="team_allocations" value={JSON.stringify(teamAllocations)} />
              <input type="hidden" name="team_ids" value={JSON.stringify(Object.keys(teamAllocations).filter((k) => (teamAllocations[k] ?? 0) > 0))} />
              <input type="hidden" name="sq_project_ids" value={JSON.stringify(sqProjectIds)} />
              <input type="hidden" name="duration_quarters" value={effectiveDuration} />

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
                  {prevSp > 0 && (
                    <span style={{ fontSize: 11, color: "#6B6B6B" }}>
                      ↔ {autoCalcDuration}Q (calculado)
                    </span>
                  )}
                </F>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <F label="Fecha inicio">
                  <input
                    name="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inp}
                  />
                </F>
                <F label="Fecha fin">
                  <input
                    name="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    className={inp}
                  />
                </F>
              </div>

              {/* Quarter range from dates (when both are set) */}
              {startDate && endDate && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="text-xs font-bold text-brand-blue">
                    {Q_LABELS[dateToQuarter(startDate)]} → {Q_LABELS[dateToQuarter(endDate)]}
                  </span>
                  <span className="text-xs text-brand-gray">
                    · {quartersBetween(startDate, endDate)} trimestre{quartersBetween(startDate, endDate) !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {/* Team allocation */}
              {teams.length > 0 && (
                <F label="Equipos requeridos">
                  <TeamAllocationInputs
                    teams={teams}
                    allocations={teamAllocations}
                    warnings={teamWarnings}
                    onChange={setTeamAllocations}
                  />
                </F>
              )}

              {squadProjects.length > 0 && (
                <F label="Proyectos Squad vinculados">
                  <SquadProjectSelect
                    projects={squadProjects}
                    selected={sqProjectIds}
                    onChange={setSqProjectIds}
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
            <div className="text-xs font-bold text-brand-gray uppercase tracking-wider mt-2">Iniciativas cargadas</div>
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
                          {ini.q_start !== null ? Q_LABELS[ini.q_start] : "Sin asignar"}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${qd.color}22`, color: qd.color }}>
                        {qd.priority}
                      </span>
                      {Array.isArray(ini.sq_project_ids) && ini.sq_project_ids.length > 0 && (
                        <span className="text-[10px] font-semibold text-brand-blue flex-shrink-0">👥{ini.sq_project_ids.length}</span>
                      )}
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(ini)} className="text-[11px] text-gray-400 hover:text-brand-orange px-1 transition">✏️</button>
                        <button onClick={() => handleDelete(ini.id)} className="text-[11px] text-gray-400 hover:text-red-600 px-1 transition">🗑️</button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Team allocation component — checkbox + stacked persona count + inline warnings
function TeamAllocationInputs({
  teams,
  allocations,
  warnings = {},
  onChange,
}: {
  teams: Team[];
  allocations: Record<string, number>;
  warnings?: Record<string, string[]>;
  onChange: (a: Record<string, number>) => void;
}) {
  function toggle(teamId: string) {
    const next = { ...allocations };
    if (next[teamId] !== undefined) {
      delete next[teamId];
    } else {
      next[teamId] = 1;
    }
    onChange(next);
  }

  function setN(teamId: string, n: number, max: number) {
    onChange({ ...allocations, [teamId]: Math.max(1, Math.min(max, n)) });
  }

  return (
    <div className="flex flex-col gap-1.5 mt-0.5">
      {teams.map((t) => {
        const selected = allocations[t.id] !== undefined;
        const n = allocations[t.id] ?? 1;
        const warn = warnings[t.id];
        return (
          <div
            key={t.id}
            className={`rounded-lg border transition ${selected ? "border-brand-orange bg-orange-50" : "border-gray-100 bg-gray-50"}`}
          >
            <div className="flex items-center gap-2 px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => toggle(t.id)}
                className={`w-4 h-4 rounded border-2 flex-shrink-0 transition flex items-center justify-center ${selected ? "border-brand-orange bg-brand-orange" : "border-gray-300 bg-white"}`}
              >
                {selected && <span className="text-white text-[8px] leading-none">✓</span>}
              </button>
              <span className="text-xs font-semibold text-brand-black flex-1">{t.name}</span>
              {!selected && <span className="text-[10px] text-brand-gray">{t.personas} pers.</span>}
            </div>
            {selected && (
              <div className="px-2.5 pb-2 pl-8 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max={t.personas}
                    value={n}
                    onChange={(e) => setN(t.id, parseInt(e.target.value) || 1, t.personas)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-12 text-xs px-1.5 py-0.5 border border-gray-200 rounded bg-white text-center focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                  <span className="text-[10px] text-brand-gray">personas de {t.personas} disponibles</span>
                </div>
                {warn && (
                  <div className="text-[10px] font-semibold text-red-600">
                    ⚠ Supera capacidad en {warn.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SquadProjectSelect({
  projects,
  selected,
  onChange,
}: {
  projects: SquadProjectMin[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-col gap-1 mt-0.5 max-h-40 overflow-y-auto pr-0.5">
      {projects.map((p) => {
        const checked = selected.includes(p.id);
        const qd = QUADRANT_META[computeQuadrant(p.impact_value, p.effort_sprints)];
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition ${checked ? "border-brand-blue bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"}`}
          >
            <div className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition ${checked ? "border-brand-blue bg-brand-blue" : "border-gray-300 bg-white"}`}>
              {checked && <span className="text-white text-[7px] leading-none">✓</span>}
            </div>
            <span className="text-[10px] font-semibold text-brand-black flex-1 truncate">{p.name}</span>
            <span className="text-[9px] px-1 py-0.5 rounded flex-shrink-0" style={{ background: `${qd.color}22`, color: qd.color }}>{qd.priority}</span>
          </button>
        );
      })}
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

// Generates subtle vertical divider lines at each internal quarter boundary for spanning cards.
// For a 2Q card: 1 line at 50%. For 3Q: lines at 33% and 67%. For 4Q: 25%, 50%, 75%.
function quarterDividerLines(span: number, color: string): string {
  const stops: string[] = [];
  for (let k = 1; k < span; k++) {
    const lo = ((k / span) * 100 - 0.35).toFixed(2);
    const hi = ((k / span) * 100 + 0.35).toFixed(2);
    stops.push(`transparent ${lo}%`, `${color}55 ${lo}%`, `${color}55 ${hi}%`, `transparent ${hi}%`);
  }
  return `linear-gradient(90deg, transparent 0%, ${stops.join(", ")}, transparent 100%)`;
}
