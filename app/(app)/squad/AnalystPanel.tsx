"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createProject, updateProject, discardProject, deleteProject, restoreProject, createSlice } from "./actions";
import { computeQuadrant, QUADRANT_META } from "@/lib/quadrant";
import { saveConfig, type SquadConfig } from "@/lib/squad-logic";
import type { Project } from "@/types/database";
import { CommentsThread } from "@/components/ui/CommentsThread";
import { ActivityFeed } from "@/components/ui/ActivityFeed";

type Tab = "form" | "items" | "config" | "comments" | "history";

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

type Props = {
  projects: Project[];
  orgId: string;
  config: SquadConfig;
  onConfigChange: (cfg: SquadConfig) => void;
  forceEdit?: Project | null;
  onForceEditConsumed?: () => void;
  openRequest?: number;
  currentUserId: string;
};

export function AnalystPanel({ projects, orgId, config, onConfigChange, forceEdit, onForceEditConsumed, openRequest, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("form");
  const [editProject, setEditProject] = useState<Project | undefined>();
  const [sliceParent, setSliceParent] = useState<Project | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const sliceFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (forceEdit) {
      setEditProject(forceEdit);
      setTab("form");
      setOpen(true);
      onForceEditConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceEdit]);

  useEffect(() => {
    if (openRequest) {
      setEditProject(undefined);
      setTab("form");
      setOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest]);

  const action = editProject ? updateProject : createProject;
  const [state, formAction] = useFormState(action, { error: null });
  const [sliceState, sliceFormAction] = useFormState(createSlice, { error: null });

  // Close form / clear edit on success
  useEffect(() => {
    if (state.error === null && formRef.current?.dataset.submitted === "true") {
      formRef.current.dataset.submitted = "";
      setEditProject(undefined);
      formRef.current.reset();
    }
  }, [state]);

  // Close slice form on success
  useEffect(() => {
    if (sliceState.success && sliceFormRef.current?.dataset.submitted === "true") {
      sliceFormRef.current.dataset.submitted = "";
      setSliceParent(null);
      sliceFormRef.current.reset();
    }
  }, [sliceState]);

  function openEdit(p: Project) {
    setEditProject(p);
    if (tab === "comments" || tab === "history") setTab("form");
    setOpen(true);
  }

  function cancelEdit() {
    setEditProject(undefined);
    setSliceParent(null);
    formRef.current?.reset();
  }

  // Whether the project being edited has slices (sprints_completed is computed, not editable)
  const hasSlicesForEdit = !!(editProject && projects.some(p => p.parent_id === editProject.id));

  // Quadrant preview
  const [prevImp, setPrevImp] = useState(editProject?.impact_value ?? 0);
  const [prevSp, setPrevSp] = useState(editProject?.effort_sprints ?? 0);
  useEffect(() => {
    setPrevImp(editProject?.impact_value ?? 0);
    setPrevSp(editProject?.effort_sprints ?? 0);
  }, [editProject]);
  const qPrev = prevImp > 0 || prevSp > 0 ? computeQuadrant(prevImp, prevSp) : null;
  const mPrev = qPrev ? QUADRANT_META[qPrev] : null;

  const allSorted = [...projects].sort((a, b) => {
    const qa = computeQuadrant(a.impact_value, a.effort_sprints);
    const qb = computeQuadrant(b.impact_value, b.effort_sprints);
    return Number(QUADRANT_META[qa].priority[1]) - Number(QUADRANT_META[qb].priority[1]);
  });

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-7 right-7 z-[200] w-12 h-12 rounded-full bg-brand-orange hover:bg-orange-600 text-white text-2xl flex items-center justify-center shadow-lg transition"
        title="Panel del analista"
      >
        ⚙
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[250] bg-black/25"
          onClick={() => { setOpen(false); cancelEdit(); }}
        />
      )}

      {/* Sliding panel */}
      <div
        className={`fixed top-0 right-0 z-[300] h-full w-[420px] bg-white border-l border-gray-100 shadow-2xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-orange-50 border-b-2 border-brand-orange">
          <h3 className="text-[15px] font-bold text-brand-orange">Panel del analista</h3>
          <button onClick={() => { setOpen(false); cancelEdit(); }} className="text-brand-gray hover:text-brand-black text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(["form", "items", "config"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[13px] font-semibold transition border-b-2 ${tab === t ? "text-brand-orange border-brand-orange" : "text-brand-gray border-transparent hover:text-brand-black"}`}
            >
              {t === "form" ? "Formulario" : t === "items" ? "Proyectos" : "Config"}
            </button>
          ))}
          {editProject && (
            <button
              onClick={() => setTab("comments")}
              className={`flex-1 py-2.5 text-[13px] font-semibold transition border-b-2 ${tab === "comments" ? "text-brand-orange border-brand-orange" : "text-brand-gray border-transparent hover:text-brand-black"}`}
            >
              💬
            </button>
          )}
          {editProject && (
            <button
              onClick={() => setTab("history")}
              className={`flex-1 py-2.5 text-[13px] font-semibold transition border-b-2 ${tab === "history" ? "text-brand-orange border-brand-orange" : "text-brand-gray border-transparent hover:text-brand-black"}`}
            >
              📋
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── TAB: FORMULARIO ── */}
          {tab === "form" && (
            <div className="p-4 flex flex-col gap-3">

              {/* Slice creation form */}
              {sliceParent && (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-brand-blue font-semibold">
                    ⑂ <span>Slice de: {sliceParent.name}</span>
                  </div>
                  <div className="text-xs font-bold text-brand-gray uppercase tracking-wider">Nuevo slice</div>
                  <p className="text-xs text-brand-gray">El impacto se hereda del proyecto padre ({sliceParent.impact_value.toLocaleString("es-AR")} {sliceParent.impact_metric === "revenue" ? "$" : "clientes"}).</p>
                  <form
                    ref={sliceFormRef}
                    action={sliceFormAction}
                    onSubmit={() => { if (sliceFormRef.current) sliceFormRef.current.dataset.submitted = "true"; }}
                    className="flex flex-col gap-3"
                  >
                    <input type="hidden" name="parent_id" value={sliceParent.id} />
                    <F label="Sprints *">
                      <input name="effort_sprints" type="number" min="1" max="24" required placeholder="1–24" className={inp} />
                    </F>
                    <F label="Stakeholder">
                      <input name="stakeholder" type="text" placeholder="Ej: Banco XYZ" className={inp} />
                    </F>
                    <F label="Fecha prod.">
                      <input name="production_date" type="date" className={inp} />
                    </F>
                    {sliceState.error && (
                      <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{sliceState.error}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setSliceParent(null)} className="px-4 py-2.5 text-sm text-brand-gray border border-gray-200 rounded-lg hover:text-brand-black transition">
                        Cancelar
                      </button>
                      <SubmitBtn label="Crear slice" />
                    </div>
                  </form>
                </>
              )}

              {/* Main create / edit form */}
              {!sliceParent && (
                <>
                  {editProject && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg text-xs text-brand-orange font-semibold">
                      ✏️ <span>Editando: {editProject.name}</span>
                    </div>
                  )}
                  <div className="text-xs font-bold text-brand-gray uppercase tracking-wider">
                    {editProject ? "Editar proyecto" : "Nuevo proyecto"}
                  </div>

                  <form
                    ref={formRef}
                    action={formAction}
                    onSubmit={() => { if (formRef.current) formRef.current.dataset.submitted = "true"; }}
                    className="flex flex-col gap-3"
                  >
                    {editProject && <input type="hidden" name="id" value={editProject.id} />}

                    <F label="Nombre *">
                      <input name="name" type="text" required defaultValue={editProject?.name} placeholder="Ej: Portal clientes" className={inp} />
                    </F>
                    <F label="Stakeholder">
                      <input name="stakeholder" type="text" defaultValue={editProject?.stakeholder ?? ""} placeholder="Ej: Banco XYZ" className={inp} />
                    </F>
                    <div className="grid grid-cols-2 gap-2">
                      <F label="Impacto ($) *">
                        <input name="impact_value" type="number" min="0" step="any" required
                          defaultValue={editProject?.impact_value ?? ""}
                          placeholder="0"
                          className={inp}
                          onChange={e => setPrevImp(parseFloat(e.target.value) || 0)} />
                      </F>
                      <F label="Métrica">
                        <select name="impact_metric" defaultValue={editProject?.impact_metric ?? "revenue"} className={inp}>
                          <option value="revenue">Ventas ($)</option>
                          <option value="customers">Clientes</option>
                        </select>
                      </F>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <F label="Sprints *">
                        <input name="effort_sprints" type="number" min="1" max="24" required
                          defaultValue={editProject?.effort_sprints ?? ""}
                          placeholder="1–24"
                          className={inp}
                          onChange={e => setPrevSp(parseInt(e.target.value) || 0)} />
                      </F>
                      <F label="Completados">
                        <input
                          name="sprints_completed"
                          type="number"
                          min="0"
                          max="24"
                          defaultValue={hasSlicesForEdit ? "" : (editProject?.sprints_completed ?? 0)}
                          placeholder={hasSlicesForEdit ? "calculado desde slices" : undefined}
                          disabled={hasSlicesForEdit}
                          className={`${inp} ${hasSlicesForEdit ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}`}
                        />
                      </F>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <F label="Estado">
                        <select name="squad_status" defaultValue={editProject?.squad_status ?? "backlog"} className={inp}>
                          <option value="backlog">Backlog</option>
                          <option value="curso">En curso</option>
                        </select>
                      </F>
                      <F label="Fecha prod.">
                        <input name="production_date" type="date" defaultValue={editProject?.production_date ?? ""} className={inp} />
                      </F>
                    </div>
                    <F label="Dependencias">
                      <input name="dependencies" type="text" defaultValue={editProject?.dependencies ?? ""} placeholder="Ej: API pagos" className={inp} />
                    </F>
                    <F label="Descripción">
                      <textarea name="description" rows={2} defaultValue={editProject?.description ?? ""} placeholder="Objetivo principal..." className={`${inp} resize-none`} />
                    </F>

                    {/* Quadrant preview */}
                    {mPrev && (
                      <div className="px-3 py-2 rounded-lg border text-xs" style={{ background: mPrev.bg, borderColor: `${mPrev.color}44` }}>
                        <div className="font-bold uppercase tracking-wider text-[10px] text-brand-gray mb-1">Cuadrante asignado</div>
                        <div className="font-bold" style={{ color: mPrev.color }}>{mPrev.priority} {mPrev.label}</div>
                      </div>
                    )}

                    {state.error && (
                      <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{state.error}</p>
                    )}

                    <div className="flex gap-2 pt-1">
                      {editProject && (
                        <button type="button" onClick={cancelEdit} className="px-4 py-2.5 text-sm text-brand-gray border border-gray-200 rounded-lg hover:text-brand-black transition">
                          Cancelar
                        </button>
                      )}
                      <SubmitBtn label={editProject ? "Guardar cambios" : "Agregar"} />
                    </div>
                  </form>

                  {/* Slice button — only for existing non-slice projects */}
                  {editProject && !editProject.parent_id && (
                    <button
                      type="button"
                      onClick={() => setSliceParent(editProject)}
                      className="flex items-center justify-center gap-2 w-full py-2 text-[13px] font-semibold text-brand-blue border border-blue-200 rounded-lg hover:bg-blue-50 transition"
                    >
                      ⑂ Crear slice
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── TAB: PROYECTOS ── */}
          {tab === "items" && (
            <div className="p-4 flex flex-col gap-2">
              {allSorted.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">No hay proyectos.</p>
              )}
              {(() => {
                const parents = allSorted.filter(p => !p.parent_id);
                const slicesMap = new Map<string, Project[]>();
                for (const p of allSorted) {
                  if (p.parent_id) {
                    const arr = slicesMap.get(p.parent_id) ?? [];
                    arr.push(p);
                    slicesMap.set(p.parent_id, arr);
                  }
                }
                const rows: React.ReactNode[] = [];
                for (const p of parents) {
                  rows.push(<ProjectRow key={p.id} p={p} editProject={editProject} onEdit={openEdit} indent={false} hasSlices={slicesMap.has(p.id)} />);
                  for (const s of slicesMap.get(p.id) ?? []) {
                    rows.push(<ProjectRow key={s.id} p={s} editProject={editProject} onEdit={openEdit} indent={true} hasSlices={false} />);
                  }
                }
                return rows;
              })()}
            </div>
          )}

          {/* ── TAB: COMENTARIOS ── */}
          {tab === "comments" && editProject && (
            <div className="p-4 flex flex-col gap-2">
              <div className="text-xs font-bold text-brand-gray uppercase tracking-wider mb-1">
                {editProject.name}
              </div>
              <CommentsThread
                entityType="project"
                entityId={editProject.id}
                currentUserId={currentUserId}
              />
            </div>
          )}

          {/* ── TAB: HISTORIAL ── */}
          {tab === "history" && editProject && (
            <div className="p-4">
              <div className="text-xs font-bold text-brand-gray uppercase tracking-wider mb-3">{editProject.name}</div>
              <ActivityFeed entityId={editProject.id} />
            </div>
          )}

          {/* ── TAB: CONFIGURACIÓN ── */}
          {tab === "config" && (
            <div className="p-4 flex flex-col gap-5">
              {/* Squad */}
              <section>
                <div className="text-sm font-bold text-brand-gray uppercase tracking-wider mb-3">Developers del Squad</div>
                <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <CfgRow label="Developers" hint="personas en el squad">
                    <input type="number" min="1" max="30" value={config.devN}
                      onChange={e => { const c = { ...config, devN: parseInt(e.target.value) || 1 }; onConfigChange(c); saveConfig(orgId, c); }}
                      className={`${inp} max-w-[70px] text-center`} />
                  </CfgRow>
                  <CfgRow label="Proy/dev" hint="proyectos por developer">
                    <input type="number" min="1" max="5" value={config.devP}
                      onChange={e => { const c = { ...config, devP: parseInt(e.target.value) || 1 }; onConfigChange(c); saveConfig(orgId, c); }}
                      className={`${inp} max-w-[70px] text-center`} />
                  </CfgRow>
                </div>
              </section>

              {/* Matrix */}
              <section>
                <div className="text-sm font-bold text-brand-gray uppercase tracking-wider mb-3">Criterios de la Matriz</div>
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-brand-black mb-2">Métrica de impacto</div>
                    <div className="flex gap-2">
                      {(["money", "clients"] as const).map(m => (
                        <button key={m} onClick={() => { const c = { ...config, metric: m }; onConfigChange(c); saveConfig(orgId, c); }}
                          className={`flex-1 py-1.5 text-[13px] rounded-lg border font-semibold transition ${config.metric === m ? "bg-brand-orange text-white border-brand-orange" : "bg-white text-brand-gray border-gray-200 hover:border-brand-orange"}`}>
                          {m === "money" ? "💰 Ventas ($)" : "👥 Clientes"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-brand-black mb-2">Umbrales de impacto</div>
                    <ThrRow label="Alto ≥" badge="Alto" badgeColor="#0d6e52" badgeBg="rgba(29,158,117,.15)">
                      <input type="number" min="0" value={config.iHigh}
                        onChange={e => { const c = { ...config, iHigh: parseFloat(e.target.value) || 0 }; onConfigChange(c); saveConfig(orgId, c); }}
                        className={`${inp} flex-1`} />
                    </ThrRow>
                    <ThrRow label="Medio ≥" badge="Medio" badgeColor="#8a6000" badgeBg="rgba(239,159,39,.15)">
                      <input type="number" min="0" value={config.iMid}
                        onChange={e => { const c = { ...config, iMid: parseFloat(e.target.value) || 0 }; onConfigChange(c); saveConfig(orgId, c); }}
                        className={`${inp} flex-1`} />
                    </ThrRow>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-brand-black mb-2">Umbrales de esfuerzo (sprints)</div>
                    <ThrRow label="Alto ≥" badge="Alto" badgeColor="#8a1f1f" badgeBg="rgba(226,75,74,.12)">
                      <input type="number" min="1" max="24" value={config.eHigh}
                        onChange={e => { const c = { ...config, eHigh: parseInt(e.target.value) || 1 }; onConfigChange(c); saveConfig(orgId, c); }}
                        className={`${inp} flex-1`} />
                    </ThrRow>
                    <ThrRow label="Medio ≥" badge="Medio" badgeColor="#8a6000" badgeBg="rgba(239,159,39,.15)">
                      <input type="number" min="1" max="24" value={config.eMid}
                        onChange={e => { const c = { ...config, eMid: parseInt(e.target.value) || 1 }; onConfigChange(c); saveConfig(orgId, c); }}
                        className={`${inp} flex-1`} />
                    </ThrRow>
                  </div>

                  {/* Matrix preview */}
                  <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden border border-gray-100 text-[13px] font-bold">
                    {[
                      { bg: "rgba(29,158,117,.12)", color: "#0d6e52", label: "P1 Quick Win", desc: "Alto/med impacto + bajo esfuerzo" },
                      { bg: "rgba(30,111,197,.12)", color: "#0f4a8a", label: "P2 Gran Proyecto", desc: "Alto/med impacto + alto/med esfuerzo" },
                      { bg: "rgba(170,170,170,.12)", color: "#666", label: "P3 Iniciativa Menor", desc: "Bajo impacto + bajo esfuerzo" },
                      { bg: "rgba(226,75,74,.08)", color: "#8a1f1f", label: "P0 Descartada", desc: "Bajo impacto + alto/med esfuerzo" },
                    ].map(cell => (
                      <div key={cell.label} className="p-2 leading-snug" style={{ background: cell.bg, color: cell.color }}>
                        {cell.label}
                        <span className="block text-[11px] font-normal opacity-80 mt-0.5">{cell.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ProjectRow({ p, editProject, onEdit, indent, hasSlices }: { p: Project; editProject: Project | undefined; onEdit: (p: Project) => void; indent: boolean; hasSlices: boolean }) {
  const q = computeQuadrant(p.impact_value, p.effort_sprints);
  const m = QUADRANT_META[q];
  const isEd = p.id === editProject?.id;
  const discardWithId = discardProject.bind(null, p.id);
  const deleteWithId = deleteProject.bind(null, p.id);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${isEd ? "border-brand-orange bg-orange-50" : "border-gray-100 bg-gray-50"}`}
      style={indent ? { marginLeft: 16, borderLeft: `2px solid ${m.color}44` } : undefined}
    >
      {indent ? (
        <span className="text-[10px] text-brand-gray flex-shrink-0">⑂</span>
      ) : (
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-brand-black truncate">
          {p.slice_label && <span className="text-brand-blue mr-1">{p.slice_label}</span>}
          {p.name} {isEd && <span className="text-brand-orange">✏️</span>}
          {hasSlices && <span className="text-[10px] text-brand-gray ml-1">⑂</span>}
        </div>
        <div className="text-xs text-brand-gray">
          {p.stakeholder && `${p.stakeholder} · `}{p.effort_sprints}sp · {p.squad_status === "curso" ? "En curso" : "Backlog"}
        </div>
      </div>
      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${m.color}22`, color: m.color }}>
        {m.priority}
      </span>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={() => onEdit(p)} className="text-xs text-gray-400 hover:text-brand-orange px-1 transition" title="Editar">✏️</button>
        <form action={discardWithId} style={{ display: "inline" }}>
          <button type="submit" className="text-xs text-gray-400 hover:text-brand-orange px-1 transition" title="Descartar">📥</button>
        </form>
        <form action={deleteWithId} style={{ display: "inline" }}>
          <button type="submit" className="text-xs text-gray-400 hover:text-red-600 px-1 transition" title="Eliminar">🗑️</button>
        </form>
      </div>
    </div>
  );
}

// Small helpers
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold text-brand-gray uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function CfgRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[13px] text-brand-gray min-w-[70px]">{label}</label>
      {children}
      <span className="text-xs text-gray-400">{hint}</span>
    </div>
  );
}

function ThrRow({ label, badge, badgeColor, badgeBg, children }: { label: string; badge: string; badgeColor: string; badgeBg: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <label className="text-[13px] text-brand-gray min-w-[56px]">{label}</label>
      {children}
      <span className="text-xs font-bold px-2 py-0.5 rounded-full min-w-[48px] text-center" style={{ background: badgeBg, color: badgeColor }}>{badge}</span>
    </div>
  );
}

const inp = "w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent bg-white";
