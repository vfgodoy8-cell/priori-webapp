"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Team } from "@/types/database";
import { createTeam, updateTeam, deleteTeam } from "@/app/(app)/cross/actions";

type Props = {
  teams: Team[];
  orgId: string;
  open: boolean;
  onClose: () => void;
};

const inp = "w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent bg-white";

type TeamForm = {
  name: string;
  personas: number;
  proy_per_persona: number;
  q1_pct: number;
  q2_pct: number;
  q3_pct: number;
  q4_pct: number;
};

const EMPTY: TeamForm = { name: "", personas: 3, proy_per_persona: 1, q1_pct: 100, q2_pct: 100, q3_pct: 100, q4_pct: 100 };

function teamToForm(t: Team): TeamForm {
  return { name: t.name, personas: t.personas, proy_per_persona: t.proy_per_persona, q1_pct: t.q1_pct, q2_pct: t.q2_pct, q3_pct: t.q3_pct, q4_pct: t.q4_pct };
}

export function TeamPanel({ teams: initialTeams, open, onClose }: Props) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState<TeamForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(t: Team) {
    setEditing(t);
    setForm(teamToForm(t));
    setError(null);
  }

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
  }

  function setField(f: keyof TeamForm, v: string | number) {
    setForm((prev) => ({ ...prev, [f]: v }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("El nombre es requerido."); return; }
    setSaving(true);
    setError(null);

    if (editing) {
      await updateTeam(editing.id, form);
      setTeams((prev) => prev.map((t) => (t.id === editing.id ? { ...t, ...form } : t)));
      setEditing(null);
    } else {
      const fd = new FormData();
      fd.set("name", form.name.trim());
      fd.set("personas", String(form.personas));
      fd.set("proy_per_persona", String(form.proy_per_persona));
      fd.set("q1_pct", String(form.q1_pct));
      fd.set("q2_pct", String(form.q2_pct));
      fd.set("q3_pct", String(form.q3_pct));
      fd.set("q4_pct", String(form.q4_pct));
      const res = await createTeam({ error: null }, fd);
      if (res.error) { setError(res.error); setSaving(false); return; }
    }

    setForm(EMPTY);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(t: Team) {
    if (!confirm(`¿Eliminar el equipo "${t.name}"? Esta acción no se puede deshacer.`)) return;
    setTeams((prev) => prev.filter((x) => x.id !== t.id));
    await deleteTeam(t.id);
    if (editing?.id === t.id) { setEditing(null); setForm(EMPTY); }
    router.refresh();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[250] bg-black/25" onClick={onClose} />
      <div className="fixed top-0 right-0 z-[300] h-full w-[380px] bg-white border-l border-gray-100 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-orange-50 border-b-2 border-brand-orange">
          <h3 className="text-sm font-bold text-brand-orange">Gestión de Equipos</h3>
          <button onClick={onClose} className="text-brand-gray hover:text-brand-black text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Team list */}
          {teams.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Equipos configurados</span>
              {teams.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition ${editing?.id === t.id ? "border-brand-orange bg-orange-50" : "border-gray-100 bg-gray-50"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-brand-black">{t.name}</div>
                    <div className="text-[10px] text-brand-gray mt-0.5">
                      {t.personas} pers. · {t.proy_per_persona} proy/p · {t.q1_pct}/{t.q2_pct}/{t.q3_pct}/{t.q4_pct}%
                    </div>
                  </div>
                  <button onClick={() => startEdit(t)} className="text-[11px] text-gray-400 hover:text-brand-orange px-1 transition">✏️</button>
                  <button onClick={() => handleDelete(t)} className="text-[11px] text-gray-400 hover:text-red-500 px-1 transition">🗑️</button>
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">
                {editing ? "Editar equipo" : "Nuevo equipo"}
              </span>
              {editing && (
                <button onClick={startCreate} className="text-[10px] text-brand-gray hover:text-brand-orange">+ Nuevo</button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Nombre</label>
                <input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Ej: Software Delivery" className={inp} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Personas</label>
                  <input type="number" min="1" value={form.personas} onChange={(e) => setField("personas", parseInt(e.target.value) || 1)} className={inp} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Proy/persona</label>
                  <input type="number" min="1" value={form.proy_per_persona} onChange={(e) => setField("proy_per_persona", parseInt(e.target.value) || 1)} className={inp} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Disponibilidad por Quarter (%)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["q1_pct", "q2_pct", "q3_pct", "q4_pct"] as const).map((f, i) => (
                    <div key={f} className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-brand-gray text-center">Q{i + 1}</span>
                      <input
                        type="number" min="0" max="100"
                        value={form[f]}
                        onChange={(e) => setField(f, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className={`${inp} text-center px-1`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">{error}</p>}

              <div className="flex gap-2 pt-1">
                {editing && (
                  <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); setError(null); }}
                    className="px-3 py-2 text-xs text-brand-gray border border-gray-200 rounded-lg hover:text-brand-black transition">
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white transition"
                >
                  {saving ? "Guardando…" : editing ? "Guardar cambios" : "Agregar equipo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
