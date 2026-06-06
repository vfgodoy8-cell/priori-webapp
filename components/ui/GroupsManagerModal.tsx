"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Group, CapacityAdjustment, OrgCapacitySettings } from "@/types/database";
import type { AppRole } from "@/lib/roles";
import { canWrite } from "@/lib/roles";
import { LEVEL_LABEL_DEFAULT } from "@/lib/group-labels";
import {
  resolveUnit,
  effectivePeopleInRange,
  groupCapacity,
  DEFAULT_CAPACITY_SETTINGS,
  type OrgCapacitySettingsLike,
} from "@/lib/capacity-engine";
import {
  getGroupsModalMeta,
  fetchGroupAdjustments,
  createGroup,
  updateGroupBasic,
  moveGroup,
  deleteGroup,
  createAdjustment,
  updateAdjustment,
  deleteAdjustment,
  upsertOrgCapacitySettings,
  setGroupLevelLabel,
  resetGroupLevelLabel,
} from "@/app/(app)/groups/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  groups: Group[];
  orgId: string;
  role: AppRole;
  open: boolean;
  onClose: () => void;
};

type Tab = "estructura" | "capacidad" | "ajustes" | "config";

const UNIT_LABELS: Record<string, string> = {
  hours: "Horas",
  days: "Días",
  sprints: "Sprints",
  projects_per_person: "Proyectos/persona",
  story_points: "Story points",
};

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-orange-100 text-orange-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-green-100 text-green-700",
  4: "bg-gray-100 text-gray-600",
};

const inp =
  "w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent bg-white";

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function buildChildMap(groups: Group[]): Map<string | null, Group[]> {
  const map = new Map<string | null, Group[]>();
  for (const g of groups) {
    const pid = g.parent_id ?? null;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push(g);
  }
  // sort each level by sort_order
  Array.from(map.values()).forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));
  return map;
}

function sumDescendantPersonas(gid: string, childMap: Map<string | null, Group[]>): number {
  const children = childMap.get(gid) ?? [];
  return children.reduce(
    (sum, c) => sum + c.personas + sumDescendantPersonas(c.id, childMap),
    0
  );
}

function isDescendantOf(groupId: string, ancestorId: string, groups: Group[]): boolean {
  const byId = new Map(groups.map((g) => [g.id, g]));
  let cur = byId.get(groupId);
  while (cur?.parent_id) {
    if (cur.parent_id === ancestorId) return true;
    cur = byId.get(cur.parent_id);
  }
  return false;
}

// ─── Estructura Tab ───────────────────────────────────────────────────────────

function TreeNode({
  group,
  childMap,
  groups,
  levelLabels,
  canEdit,
  selectedId,
  onSelect,
  onRefresh,
  depth,
}: {
  group: Group;
  childMap: Map<string | null, Group[]>;
  groups: Group[];
  levelLabels: Record<number, string>;
  canEdit: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: (groups: Group[]) => void;
  depth: number;
}) {
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(group.name);
  const [editingPersonas, setEditingPersonas] = useState(false);
  const [personasVal, setPersonasVal] = useState(group.personas);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [showMove, setShowMove] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const children = childMap.get(group.id) ?? [];
  const descPersonas = sumDescendantPersonas(group.id, childMap);
  const levelLabel = levelLabels[group.level] ?? `Nivel ${group.level}`;

  async function saveName() {
    if (!nameVal.trim() || nameVal === group.name) { setEditingName(false); return; }
    setSaving(true);
    const res = await updateGroupBasic(group.id, { name: nameVal.trim() });
    setSaving(false);
    setEditingName(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  async function savePersonas() {
    if (personasVal === group.personas) { setEditingPersonas(false); return; }
    setSaving(true);
    const res = await updateGroupBasic(group.id, { personas: personasVal });
    setSaving(false);
    setEditingPersonas(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  async function handleAddChild() {
    if (!childName.trim()) return;
    setSaving(true);
    const res = await createGroup({ name: childName.trim(), personas: 1, parent_id: group.id });
    setSaving(false);
    setShowAddChild(false);
    setChildName("");
    if (res.error) setError(res.error);
    else router.refresh();
  }

  async function handleMove(newParentId: string | null) {
    setSaving(true);
    const res = await moveGroup(group.id, newParentId);
    setSaving(false);
    setShowMove(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${group.name}"?`)) return;
    setSaving(true);
    const res = await deleteGroup(group.id);
    setSaving(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  // Valid parents for move: any group that's not self or descendant of self, and whose level < 4
  const validParents = groups.filter(
    (g) =>
      g.id !== group.id &&
      !isDescendantOf(g.id, group.id, groups) &&
      g.level < 4
  );

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition ${
          selectedId === group.id ? "bg-orange-50 border border-orange-200" : "hover:bg-gray-50"
        }`}
        style={{ marginLeft: depth * 20 }}
        onClick={() => onSelect(group.id)}
      >
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${LEVEL_COLORS[group.level] ?? "bg-gray-100 text-gray-600"}`}>
          {levelLabel}
        </span>

        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
            className="flex-1 text-xs border border-brand-orange rounded px-1.5 py-0.5 outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-xs font-semibold text-brand-black truncate"
            onDoubleClick={canEdit ? () => { setEditingName(true); setNameVal(group.name); } : undefined}
            title={canEdit ? "Doble click para renombrar" : undefined}
          >
            {group.name}
          </span>
        )}

        {editingPersonas ? (
          <input
            autoFocus
            type="number"
            min={1}
            value={personasVal}
            onChange={(e) => setPersonasVal(parseInt(e.target.value) || 1)}
            onBlur={savePersonas}
            onKeyDown={(e) => { if (e.key === "Enter") savePersonas(); if (e.key === "Escape") setEditingPersonas(false); }}
            className="w-12 text-xs border border-brand-orange rounded px-1 py-0.5 outline-none text-center"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={`text-[10px] text-brand-gray whitespace-nowrap ${canEdit ? "cursor-pointer hover:text-brand-orange" : ""}`}
            onDoubleClick={canEdit ? (e) => { e.stopPropagation(); setEditingPersonas(true); setPersonasVal(group.personas); } : undefined}
            title={canEdit ? "Doble click para editar personas" : undefined}
          >
            {descPersonas > 0 ? `${group.personas} (+${descPersonas})` : group.personas}
          </span>
        )}

        {canEdit && (
          <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 [.bg-orange-50_&]:opacity-100" onClick={(e) => e.stopPropagation()}>
            {group.level < 4 && (
              <button
                title="Agregar subgrupo"
                onClick={() => setShowAddChild((s) => !s)}
                className="p-0.5 text-gray-400 hover:text-brand-orange text-xs leading-none"
              >+</button>
            )}
            <button
              title="Mover de padre"
              onClick={() => setShowMove((s) => !s)}
              className="p-0.5 text-gray-400 hover:text-brand-blue text-[10px] leading-none"
            >⇅</button>
            <button
              title="Eliminar"
              onClick={handleDelete}
              disabled={saving}
              className="p-0.5 text-gray-400 hover:text-red-500 text-[10px] leading-none"
            >✕</button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-[10px] text-red-600 bg-red-50 rounded px-2 py-1 ml-5 mt-0.5">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">OK</button>
        </div>
      )}

      {showAddChild && (
        <div className="flex gap-1.5 mt-1 mb-1" style={{ marginLeft: (depth + 1) * 20 }}>
          <input
            autoFocus
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddChild(); if (e.key === "Escape") setShowAddChild(false); }}
            placeholder={`Nuevo ${levelLabels[(group.level + 1)] ?? "subgrupo"}…`}
            className="flex-1 text-xs border border-brand-orange rounded px-2 py-1 outline-none focus:ring-1 focus:ring-brand-orange"
          />
          <button onClick={handleAddChild} disabled={saving || !childName.trim()} className="px-2 py-1 text-xs bg-brand-orange text-white rounded disabled:opacity-50">
            {saving ? "…" : "✓"}
          </button>
          <button onClick={() => setShowAddChild(false)} className="px-2 py-1 text-xs text-gray-500 border rounded">✕</button>
        </div>
      )}

      {showMove && (
        <div className="mt-1 mb-1 p-2 bg-gray-50 rounded-lg border border-gray-200" style={{ marginLeft: depth * 20 }}>
          <p className="text-[10px] text-brand-gray mb-1.5">Mover bajo:</p>
          <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
            <button
              onClick={() => handleMove(null)}
              className="text-left text-xs px-2 py-1 rounded hover:bg-orange-50 hover:text-brand-orange"
            >
              — Raíz (sin padre)
            </button>
            {validParents.map((p) => (
              <button
                key={p.id}
                onClick={() => handleMove(p.id)}
                className="text-left text-xs px-2 py-1 rounded hover:bg-orange-50 hover:text-brand-orange"
              >
                {" ".repeat((p.level - 1) * 2)}{p.name}
              </button>
            ))}
          </div>
          <button onClick={() => setShowMove(false)} className="mt-1.5 text-[10px] text-gray-400 underline">Cancelar</button>
        </div>
      )}

      {children.map((child) => (
        <TreeNode
          key={child.id}
          group={child}
          childMap={childMap}
          groups={groups}
          levelLabels={levelLabels}
          canEdit={canEdit}
          selectedId={selectedId}
          onSelect={onSelect}
          onRefresh={onRefresh}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

// ─── Capacidad Tab ────────────────────────────────────────────────────────────

function CapacidadTab({
  group,
  groups,
  adjustments,
  orgSettings,
  canEdit,
  onRefresh,
}: {
  group: Group;
  groups: Group[];
  adjustments: CapacityAdjustment[];
  orgSettings: OrgCapacitySettings | null;
  canEdit: boolean;
  onRefresh: () => void;
}) {
  const [unitVal, setUnitVal] = useState<string>(group.unit ?? "__inherit__");
  const [capacityPerPeriod, setCapacityPerPeriod] = useState<number>(group.capacity_per_period ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUnitVal(group.unit ?? "__inherit__");
    setCapacityPerPeriod(group.capacity_per_period ?? 1);
  }, [group.id, group.unit, group.capacity_per_period]);

  const ancestorsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const cfgLike: OrgCapacitySettingsLike = orgSettings ?? {};
  const effectiveUnit = resolveUnit(group, ancestorsById, cfgLike);

  const parent = group.parent_id ? groups.find((g) => g.id === group.parent_id) : null;
  const inheritLabel = parent
    ? `Heredar de "${parent.name}" (${UNIT_LABELS[effectiveUnit] ?? effectiveUnit})`
    : `Heredar de org (${UNIT_LABELS[effectiveUnit] ?? effectiveUnit})`;

  // Preview: effective people this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const effPeople = useMemo(
    () => effectivePeopleInRange(group, adjustments, monthStart, monthEnd),
    [group.id, group.personas, adjustments, monthStart.getTime()]
  );

  const capResult = useMemo(() => {
    const patchedGroup = {
      ...group,
      unit: unitVal === "__inherit__" ? null : (unitVal as Group["unit"]),
      capacity_per_period: capacityPerPeriod,
    };
    return groupCapacity(patchedGroup, ancestorsById, adjustments, cfgLike, monthStart, monthEnd);
  }, [group, unitVal, capacityPerPeriod, adjustments, ancestorsById, cfgLike]);

  const showCapPerPeriod = unitVal === "story_points" || unitVal === "projects_per_person";

  async function handleSave() {
    setSaving(true);
    const patch: Parameters<typeof updateGroupBasic>[1] = {
      unit: unitVal === "__inherit__" ? null : (unitVal as Group["unit"]),
    };
    if (showCapPerPeriod) patch.capacity_per_period = capacityPerPeriod;
    const res = await updateGroupBasic(group.id, patch);
    setSaving(false);
    if (res.error) setError(res.error);
    else onRefresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-[10px] font-bold text-brand-gray uppercase tracking-wider mb-1">Unidad de medida</label>
        <select
          value={unitVal}
          onChange={(e) => setUnitVal(e.target.value)}
          disabled={!canEdit}
          className={inp}
        >
          <option value="__inherit__">{inheritLabel}</option>
          {Object.entries(UNIT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <p className="text-[10px] text-brand-gray mt-1">
          La unidad se hereda si no se configura en este grupo.
          Unidad efectiva actual: <strong>{UNIT_LABELS[effectiveUnit] ?? effectiveUnit}</strong>
        </p>
      </div>

      {showCapPerPeriod && (
        <div>
          <label className="block text-[10px] font-bold text-brand-gray uppercase tracking-wider mb-1">
            {unitVal === "story_points" ? "Velocidad (SP/período)" : "Ratio (proyectos/persona)"}
          </label>
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={capacityPerPeriod}
            onChange={(e) => setCapacityPerPeriod(parseFloat(e.target.value) || 1)}
            disabled={!canEdit}
            className={inp}
          />
        </div>
      )}

      {canEdit && (
        <div>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5 mb-2">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 text-xs font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white transition"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-[10px] font-bold text-brand-gray uppercase tracking-wider mb-2">Vista previa — mes actual</p>
        <div className="flex flex-col gap-1 text-xs text-brand-black">
          <span>
            Personas efectivas: <strong>{effPeople.toFixed(1)}</strong> / {group.personas}
            {group.personas > 0 && (
              <span className="text-brand-gray ml-1">
                ({Math.round((effPeople / group.personas) * 100)}% de capacidad base)
              </span>
            )}
          </span>
          <span>
            Capacidad: <strong>{capResult.value.toFixed(1)}</strong>&nbsp;
            {UNIT_LABELS[capResult.unit] ?? capResult.unit}
          </span>
          {effectiveUnit === "story_points" && !group.capacity_per_period && (
            <span className="text-brand-gray italic text-[10px]">
              Configurá la velocidad para ver la capacidad en SP.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ajustes Tab ──────────────────────────────────────────────────────────────

function AjustesTab({
  groupId,
  adjustments,
  canEdit,
  onAdjustmentsChange,
}: {
  groupId: string;
  adjustments: CapacityAdjustment[];
  canEdit: boolean;
  onAdjustmentsChange: (adjs: CapacityAdjustment[]) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    start_date: today,
    end_date: today,
    kind: "pct" as "pct" | "people_delta",
    value: 80,
    note: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isActive(adj: CapacityAdjustment) {
    return adj.start_date <= today && adj.end_date >= today;
  }

  function startEdit(adj: CapacityAdjustment) {
    setEditingId(adj.id);
    setForm({
      start_date: adj.start_date,
      end_date: adj.end_date,
      kind: adj.kind,
      value: adj.value,
      note: adj.note ?? "",
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ start_date: today, end_date: today, kind: "pct", value: 80, note: "" });
    setError(null);
  }

  async function handleSave() {
    if (form.end_date < form.start_date) { setError("La fecha fin debe ser ≥ fecha inicio."); return; }
    if (form.kind === "pct" && (form.value < 0 || form.value > 100)) { setError("El % debe estar entre 0 y 100."); return; }
    setSaving(true);
    if (editingId) {
      const res = await updateAdjustment(editingId, form);
      if (res.error) { setError(res.error); setSaving(false); return; }
      onAdjustmentsChange(adjustments.map((a) => (a.id === editingId ? { ...a, ...form } : a)));
    } else {
      const res = await createAdjustment({ group_id: groupId, ...form, note: form.note || null });
      if (res.error) { setError(res.error); setSaving(false); return; }
      // Refresh full list
      const fresh = await fetchGroupAdjustments(groupId);
      onAdjustmentsChange(fresh);
    }
    setSaving(false);
    cancelEdit();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este ajuste?")) return;
    await deleteAdjustment(id);
    onAdjustmentsChange(adjustments.filter((a) => a.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      {adjustments.length > 0 ? (
        <div className="flex flex-col gap-2">
          {adjustments.map((adj) => (
            <div
              key={adj.id}
              className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${
                isActive(adj) ? "border-brand-orange bg-orange-50" : "border-gray-100 bg-gray-50"
              }`}
            >
              <div className="flex-1">
                {isActive(adj) && (
                  <span className="text-[9px] font-bold text-brand-orange uppercase mb-0.5 block">Vigente hoy</span>
                )}
                <div className="font-medium text-brand-black">
                  {adj.kind === "pct" ? `${adj.value}% disponible` : `${adj.value > 0 ? "+" : ""}${adj.value} personas`}
                </div>
                <div className="text-brand-gray text-[10px]">
                  {adj.start_date} → {adj.end_date}
                </div>
                {adj.note && <div className="text-brand-gray text-[10px] italic">{adj.note}</div>}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <button onClick={() => startEdit(adj)} className="text-gray-400 hover:text-brand-orange">✏</button>
                  <button onClick={() => handleDelete(adj.id)} className="text-gray-400 hover:text-red-500">✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-brand-gray italic">Sin ajustes configurados para este grupo.</p>
      )}

      {canEdit && (
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
          <span className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">
            {editingId ? "Editar ajuste" : "Nuevo ajuste"}
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-brand-gray mb-0.5 block">Desde</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-[9px] text-brand-gray mb-0.5 block">Hasta</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className={inp} />
            </div>
          </div>

          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="radio" checked={form.kind === "pct"} onChange={() => setForm((f) => ({ ...f, kind: "pct" }))} />
              % disponible
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="radio" checked={form.kind === "people_delta"} onChange={() => setForm((f) => ({ ...f, kind: "people_delta" }))} />
              ± personas
            </label>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-brand-gray mb-0.5 block">
                {form.kind === "pct" ? "% (0–100)" : "Personas (±)"}
              </label>
              <input
                type="number"
                value={form.value}
                min={form.kind === "pct" ? 0 : undefined}
                max={form.kind === "pct" ? 100 : undefined}
                onChange={(e) => setForm((f) => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                className={inp}
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] text-brand-gray mb-0.5 block">Nota (opcional)</label>
              <input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Ej: Vacaciones"
                className={inp}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">{error}</p>}

          <div className="flex gap-2">
            {editingId && (
              <button onClick={cancelEdit} className="px-3 py-2 text-xs text-brand-gray border border-gray-200 rounded-lg hover:text-brand-black transition">
                Cancelar
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 text-xs font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white transition"
            >
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Agregar ajuste"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Config Tab ───────────────────────────────────────────────────────────────

function ConfigTab({
  orgId,
  orgSettings: initialSettings,
  levelLabels: initialLabels,
  canEdit,
}: {
  orgId: string;
  orgSettings: OrgCapacitySettings | null;
  levelLabels: Record<number, string>;
  canEdit: boolean;
}) {
  const cfg = { ...DEFAULT_CAPACITY_SETTINGS, ...(initialSettings ?? {}) };
  const [settings, setSettings] = useState(cfg);
  const [levelLabels, setLevelLabels] = useState(initialLabels);
  const [editingLevel, setEditingLevel] = useState<number | null>(null);
  const [levelDraft, setLevelDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveSettings() {
    setSaving(true);
    const res = await upsertOrgCapacitySettings(settings);
    setSaving(false);
    if (res.error) setError(res.error);
    else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  async function saveLevelLabel(level: number) {
    if (!levelDraft.trim()) return;
    const res = await setGroupLevelLabel(level, levelDraft.trim());
    if (res.error) setError(res.error);
    else {
      setLevelLabels((prev) => ({ ...prev, [level]: levelDraft.trim() }));
      setEditingLevel(null);
    }
  }

  async function handleResetLabel(level: number) {
    const res = await resetGroupLevelLabel(level);
    if (res.error) setError(res.error);
    else setLevelLabels((prev) => ({ ...prev, [level]: LEVEL_LABEL_DEFAULT[level] }));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Calendario de capacidad</span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-brand-gray mb-0.5 block">Semanas por sprint</label>
            <input type="number" min={1} max={8} value={settings.sprint_weeks}
              disabled={!canEdit}
              onChange={(e) => setSettings((s) => ({ ...s, sprint_weeks: parseInt(e.target.value) || 2 }))}
              className={inp} />
          </div>
          <div>
            <label className="text-[9px] text-brand-gray mb-0.5 block">Horas por día</label>
            <input type="number" min={1} max={24} step={0.5} value={settings.hours_per_day}
              disabled={!canEdit}
              onChange={(e) => setSettings((s) => ({ ...s, hours_per_day: parseFloat(e.target.value) || 8 }))}
              className={inp} />
          </div>
          <div>
            <label className="text-[9px] text-brand-gray mb-0.5 block">Días laborables/semana</label>
            <input type="number" min={1} max={7} value={settings.workdays_per_week}
              disabled={!canEdit}
              onChange={(e) => setSettings((s) => ({ ...s, workdays_per_week: parseInt(e.target.value) || 5 }))}
              className={inp} />
          </div>
          <div>
            <label className="text-[9px] text-brand-gray mb-0.5 block">Unidad default org</label>
            <select value={settings.default_unit}
              disabled={!canEdit}
              onChange={(e) => setSettings((s) => ({ ...s, default_unit: e.target.value as typeof s.default_unit }))}
              className={inp}>
              {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-[9px] text-brand-gray mb-0.5 block">Período de consolidación</label>
            <select value={settings.consolidation_period}
              disabled={!canEdit}
              onChange={(e) => setSettings((s) => ({ ...s, consolidation_period: e.target.value as typeof s.consolidation_period }))}
              className={inp}>
              <option value="sprint">Sprint</option>
              <option value="month">Mes</option>
              <option value="quarter">Quarter</option>
            </select>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={saveSettings}
            disabled={saving}
            className="py-2 text-xs font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white transition"
          >
            {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar configuración"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
        <span className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Nombres de niveles</span>
        {[1, 2, 3, 4].map((level) => (
          <div key={level} className="flex items-center gap-2">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-14 text-center ${LEVEL_COLORS[level]}`}>
              Nivel {level}
            </span>
            {editingLevel === level ? (
              <>
                <input
                  autoFocus
                  value={levelDraft}
                  onChange={(e) => setLevelDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveLevelLabel(level); if (e.key === "Escape") setEditingLevel(null); }}
                  className="flex-1 text-xs border border-brand-orange rounded px-2 py-1 outline-none focus:ring-1 focus:ring-brand-orange"
                />
                <button onClick={() => saveLevelLabel(level)} className="text-xs text-brand-orange font-bold">✓</button>
                <button onClick={() => setEditingLevel(null)} className="text-xs text-gray-400">✕</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-xs text-brand-black">{levelLabels[level]}</span>
                {canEdit && (
                  <>
                    <button
                      onClick={() => { setEditingLevel(level); setLevelDraft(levelLabels[level]); }}
                      className="text-[10px] text-gray-400 hover:text-brand-orange"
                    >
                      ✏
                    </button>
                    {levelLabels[level] !== LEVEL_LABEL_DEFAULT[level] && (
                      <button onClick={() => handleResetLabel(level)} className="text-[10px] text-gray-400 hover:text-brand-gray underline">
                        Restablecer
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">OK</button>
        </p>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function GroupsManagerModal({ groups: initialGroups, orgId, role, open, onClose }: Props) {
  const router = useRouter();
  const canEdit = canWrite(role);

  const [activeTab, setActiveTab] = useState<Tab>("estructura");
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [levelLabels, setLevelLabels] = useState<Record<number, string>>(LEVEL_LABEL_DEFAULT);
  const [orgSettings, setOrgSettings] = useState<OrgCapacitySettings | null>(null);
  const [adjustments, setAdjustments] = useState<CapacityAdjustment[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingAdjs, setLoadingAdjs] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creatingSaving, setCreatingSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Sync groups when prop changes (router.refresh() triggers re-render)
  useEffect(() => { setGroups(initialGroups); }, [initialGroups]);

  // Load meta on open
  useEffect(() => {
    if (!open) return;
    setLoadingMeta(true);
    getGroupsModalMeta(orgId).then((meta) => {
      setGroups(meta.groups);
      setLevelLabels(meta.levelLabels);
      setOrgSettings(meta.orgSettings);
      setLoadingMeta(false);
    });
  }, [open, orgId]);

  // Load adjustments when selected group changes
  useEffect(() => {
    if (!selectedId) { setAdjustments([]); return; }
    setLoadingAdjs(true);
    fetchGroupAdjustments(selectedId).then((adjs) => {
      setAdjustments(adjs);
      setLoadingAdjs(false);
    });
  }, [selectedId]);

  const selectedGroup = groups.find((g) => g.id === selectedId) ?? null;
  const childMap = useMemo(() => buildChildMap(groups), [groups]);
  const rootGroups = childMap.get(null) ?? [];

  async function handleCreateRoot() {
    if (!createName.trim()) return;
    setCreatingSaving(true);
    const res = await createGroup({ name: createName.trim(), personas: 1, parent_id: null });
    setCreatingSaving(false);
    if (res.error) { setCreateError(res.error); return; }
    setCreateName("");
    setCreateError(null);
    router.refresh();
  }

  if (!open) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "estructura", label: "Estructura" },
    { id: "capacidad", label: "Capacidad" },
    { id: "ajustes", label: "Ajustes" },
    { id: "config", label: "Configuración" },
  ];

  // Tabs that need a selected group
  const needsGroup = activeTab === "capacidad" || activeTab === "ajustes";

  return (
    <>
      <div className="fixed inset-0 z-[250] bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-brand-black">Gestión de Grupos</h2>
              <p className="text-xs text-brand-gray mt-0.5">
                Estructura jerárquica, capacidad y ajustes por período
              </p>
            </div>
            <button onClick={onClose} className="text-brand-gray hover:text-brand-black text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-4 border-b border-gray-100 pb-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
                  activeTab === t.id
                    ? "text-brand-orange border-brand-orange bg-orange-50"
                    : "text-brand-gray border-transparent hover:text-brand-black"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: group selector (shown for capacidad/ajustes) */}
            {needsGroup && (
              <div className="w-56 border-r border-gray-100 overflow-y-auto p-3 flex flex-col gap-1">
                <span className="text-[9px] font-bold text-brand-gray uppercase tracking-wider mb-1">Seleccionar grupo</span>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedId(g.id)}
                    className={`text-left px-2 py-1.5 rounded-lg text-xs transition ${
                      selectedId === g.id ? "bg-orange-50 text-brand-orange font-semibold" : "text-brand-black hover:bg-gray-50"
                    }`}
                    style={{ paddingLeft: (g.level - 1) * 12 + 8 }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            {/* Right: tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingMeta ? (
                <div className="text-sm text-brand-gray">Cargando…</div>
              ) : activeTab === "estructura" ? (
                <div>
                  {rootGroups.length === 0 && (
                    <p className="text-xs text-brand-gray italic mb-4">
                      No hay grupos configurados. Creá el primero.
                    </p>
                  )}
                  {rootGroups.map((g) => (
                    <TreeNode
                      key={g.id}
                      group={g}
                      childMap={childMap}
                      groups={groups}
                      levelLabels={levelLabels}
                      canEdit={canEdit}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onRefresh={setGroups}
                      depth={0}
                    />
                  ))}

                  {canEdit && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      <input
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateRoot(); }}
                        placeholder={`Nuevo ${levelLabels[1] ?? "grupo"}…`}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                      />
                      <button
                        onClick={handleCreateRoot}
                        disabled={creatingSaving || !createName.trim()}
                        className="px-3 py-1.5 text-xs font-bold bg-brand-orange hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 transition"
                      >
                        {creatingSaving ? "…" : `+ ${levelLabels[1] ?? "Grupo"}`}
                      </button>
                    </div>
                  )}
                  {createError && <p className="text-xs text-red-600 mt-2">{createError}</p>}
                </div>
              ) : needsGroup && !selectedGroup ? (
                <p className="text-xs text-brand-gray italic">Seleccioná un grupo a la izquierda.</p>
              ) : activeTab === "capacidad" && selectedGroup ? (
                <CapacidadTab
                  group={selectedGroup}
                  groups={groups}
                  adjustments={adjustments}
                  orgSettings={orgSettings}
                  canEdit={canEdit}
                  onRefresh={() => router.refresh()}
                />
              ) : activeTab === "ajustes" && selectedGroup ? (
                loadingAdjs ? (
                  <p className="text-xs text-brand-gray">Cargando ajustes…</p>
                ) : (
                  <AjustesTab
                    groupId={selectedGroup.id}
                    adjustments={adjustments}
                    canEdit={canEdit}
                    onAdjustmentsChange={setAdjustments}
                  />
                )
              ) : activeTab === "config" ? (
                <ConfigTab
                  orgId={orgId}
                  orgSettings={orgSettings}
                  levelLabels={levelLabels}
                  canEdit={canEdit}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
