"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import type { Product, Team, RoadmapSegment, TeamDependency } from "@/types/database";
import { type AppRole, canWrite } from "@/lib/roles";
import {
  computeLayout,
  buildMonthHeaders,
  totalDisplaySprints,
  parseProductDate,
  type SegmentLayout,
} from "@/lib/roadmap-logic";
import {
  loadProductSegments,
  addSegment,
  updateSegment,
  removeSegment,
  createProduct,
  updateProduct,
} from "./actions";

const PALETTE = [
  { bg: "#EAF1FB", border: "#BDD5F5", text: "#1E6FC5" },
  { bg: "#F0FBF7", border: "#BBE8D8", text: "#1D9E75" },
  { bg: "#FFF4EE", border: "#FDDCB5", text: "#E8621A" },
  { bg: "#F5EBF9", border: "#E5BFFB", text: "#9333EA" },
  { bg: "#FEF9C3", border: "#FDE68A", text: "#CA8A04" },
  { bg: "#FCE7F3", border: "#F9A8D4", text: "#DB2777" },
];

function segmentColor(idx: number) {
  return PALETTE[idx % PALETTE.length];
}

type Props = {
  orgId: string;
  initialProducts: Product[];
  teams: Team[];
  teamDeps: TeamDependency[];
  role: AppRole;
};

export function RoadmapView({ orgId, initialProducts, teams, role }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [selectedId, setSelectedId] = useState<string | null>(initialProducts[0]?.id ?? null);
  const [segments, setSegments] = useState<RoadmapSegment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [editingSegId, setEditingSegId] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = products.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) { setSegments([]); return; }
    let active = true;
    setLoadingSegments(true);
    loadProductSegments(selectedId).then(({ segments: s }) => {
      if (!active) return;
      setSegments(s ?? []);
      setLoadingSegments(false);
    });
    return () => { active = false; };
  }, [selectedId]);

  const reflowResult = useMemo(
    () => (selectedProduct ? computeLayout(segments, selectedProduct.manual_mode) : null),
    [segments, selectedProduct],
  );

  const layoutMap = useMemo(() => {
    const m = new Map<string, SegmentLayout>();
    reflowResult?.layout.forEach((l) => m.set(l.segment_id, l));
    return m;
  }, [reflowResult]);

  const productStart = useMemo(
    () => (selectedProduct ? parseProductDate(selectedProduct.start_date) : new Date()),
    [selectedProduct],
  );

  const totalSprints = useMemo(
    () => (reflowResult ? totalDisplaySprints(reflowResult.layout) : 13),
    [reflowResult],
  );

  const monthHeaders = useMemo(
    () => buildMonthHeaders(productStart, totalSprints),
    [productStart, totalSprints],
  );

  const canEdit = canWrite(role);

  function handleSelectProduct(id: string) {
    setSelectedId(id);
    setEditingSegId(null);
  }

  function handleAddSegment(teamId: string) {
    if (!selectedId) return;
    startTransition(async () => {
      const maxSort = segments.reduce((acc, s) => Math.max(acc, s.sort_order), -1);
      const { id, error } = await addSegment(selectedId, teamId, {
        label: "",
        duration_sprints: 4,
        sort_order: maxSort + 1,
      });
      if (!error && id) {
        const { segments: fresh } = await loadProductSegments(selectedId);
        setSegments(fresh ?? []);
        setEditingSegId(id);
      }
    });
  }

  function handleToggleManualMode() {
    if (!selectedProduct) return;
    const next = !selectedProduct.manual_mode;
    startTransition(async () => {
      await updateProduct(selectedProduct.id, { manual_mode: next });
      setProducts((ps) =>
        ps.map((p) => (p.id === selectedProduct.id ? { ...p, manual_mode: next } : p)),
      );
    });
  }

  function handleRemoveSegment(id: string) {
    startTransition(async () => {
      await removeSegment(id);
      setSegments((prev) => prev.filter((s) => s.id !== id));
      if (editingSegId === id) setEditingSegId(null);
    });
  }

  function handleUpdateSegment(id: string, patch: Parameters<typeof updateSegment>[1]) {
    startTransition(async () => {
      await updateSegment(id, patch);
      setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    });
  }

  const editingSeg = segments.find((s) => s.id === editingSegId) ?? null;
  const editingTeam = editingSeg ? (teams.find((t) => t.id === editingSeg.team_id) ?? null) : null;

  if (products.length === 0 && !showProductForm) {
    return <EmptyState canEdit={canEdit} onAdd={() => setShowProductForm(true)} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {products.length > 0 && (
          <select
            value={selectedId ?? ""}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="text-sm font-medium border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {canEdit && (
          <button
            onClick={() => setShowProductForm((v) => !v)}
            className="text-sm px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-brand-gray hover:border-brand-orange hover:text-brand-orange transition-colors"
          >
            + Nuevo producto
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {reflowResult?.hasCycle && (
            <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
              ⚠ Ciclo en dependencias
            </span>
          )}
          {canEdit && selectedProduct && (
            <ManualModeToggle
              active={selectedProduct.manual_mode}
              onToggle={handleToggleManualMode}
            />
          )}
        </div>
      </div>

      {/* Product form */}
      {showProductForm && (
        <ProductForm
          orgId={orgId}
          onSuccess={(p) => {
            setProducts((prev) => [...prev, p]);
            setSelectedId(p.id);
            setSegments([]);
            setShowProductForm(false);
          }}
          onCancel={() => setShowProductForm(false)}
        />
      )}

      {/* Gantt + panel */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {!selectedProduct ? (
            <div className="p-12 text-center text-brand-gray text-sm">Seleccioná un producto.</div>
          ) : loadingSegments ? (
            <div className="p-12 text-center text-brand-gray text-sm">Cargando...</div>
          ) : teams.length === 0 ? (
            <div className="p-12 text-center text-brand-gray text-sm">
              Configurá equipos en{" "}
              <a href="/cross" className="text-brand-orange hover:underline">Modo Cross</a> primero.
            </div>
          ) : (
            <GanttGrid
              teams={teams}
              segments={segments}
              layoutMap={layoutMap}
              monthHeaders={monthHeaders}
              totalSprints={totalSprints}
              editingSegId={editingSegId}
              onSegmentClick={setEditingSegId}
              onAddSegment={canEdit ? handleAddSegment : undefined}
              isPending={isPending}
            />
          )}
        </div>

        {editingSeg && editingTeam && (
          <SegmentPanel
            segment={editingSeg}
            team={editingTeam}
            allSegments={segments}
            allTeams={teams}
            manualMode={selectedProduct?.manual_mode ?? false}
            canEdit={canEdit}
            onUpdate={handleUpdateSegment}
            onRemove={() => handleRemoveSegment(editingSeg.id)}
            onClose={() => setEditingSegId(null)}
            isPending={isPending}
          />
        )}
      </div>
    </div>
  );
}

// ── GanttGrid ─────────────────────────────────────────────────────────────────

const LABEL_W = 160;

function GanttGrid({
  teams,
  segments,
  layoutMap,
  monthHeaders,
  totalSprints,
  editingSegId,
  onSegmentClick,
  onAddSegment,
  isPending,
}: {
  teams: Team[];
  segments: RoadmapSegment[];
  layoutMap: Map<string, SegmentLayout>;
  monthHeaders: ReturnType<typeof buildMonthHeaders>;
  totalSprints: number;
  editingSegId: string | null;
  onSegmentClick: (id: string) => void;
  onAddSegment?: (teamId: string) => void;
  isPending: boolean;
}) {
  const teamIndexMap = new Map(teams.map((t, i) => [t.id, i]));

  return (
    <div>
      {/* Month header */}
      <div className="flex border-b border-gray-200">
        <div
          className="flex-shrink-0 flex items-center px-4 py-2 bg-gray-50 border-r border-gray-200"
          style={{ width: LABEL_W }}
        >
          <span className="text-xs text-brand-gray font-medium uppercase tracking-wide">Equipo</span>
        </div>
        <div className="flex-1 relative h-9 bg-gray-50 overflow-hidden">
          {monthHeaders.map((h, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 flex items-center px-2 border-r border-gray-200"
              style={{
                left: `${(h.startSprint / totalSprints) * 100}%`,
                width: `${(h.sprintCount / totalSprints) * 100}%`,
              }}
            >
              <span className="text-xs font-medium text-brand-gray whitespace-nowrap">{h.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team rows */}
      {teams.map((team, idx) => {
        const segment = segments.find((s) => s.team_id === team.id);
        const layout = segment ? layoutMap.get(segment.id) : null;
        const color = segmentColor(teamIndexMap.get(team.id) ?? idx);
        const isEditing = !!segment && segment.id === editingSegId;
        const isEven = idx % 2 === 0;

        return (
          <div
            key={team.id}
            className={`flex border-b border-gray-100 last:border-b-0 h-14 ${isEven ? "bg-white" : "bg-gray-50/40"}`}
          >
            {/* Team label */}
            <div
              className="flex-shrink-0 flex items-center px-4 border-r border-gray-100"
              style={{ width: LABEL_W }}
            >
              <span className="text-sm font-medium text-brand-black truncate">{team.name}</span>
            </div>

            {/* Track */}
            <div className="flex-1 relative overflow-hidden">
              {/* Month separators (grid lines) */}
              {monthHeaders.map((h, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-gray-100"
                  style={{
                    left: `${(h.startSprint / totalSprints) * 100}%`,
                    width: `${(h.sprintCount / totalSprints) * 100}%`,
                  }}
                />
              ))}

              {/* Segment bar */}
              {segment && layout ? (
                <button
                  className="absolute top-2 bottom-2 rounded-lg flex items-center px-3 text-xs font-medium transition-all hover:brightness-95 focus:outline-none"
                  style={{
                    left: `${(layout.start_sprint / totalSprints) * 100}%`,
                    width: `max(${(segment.duration_sprints / totalSprints) * 100}%, 40px)`,
                    backgroundColor: color.bg,
                    border: `1.5px solid ${isEditing ? color.text : color.border}`,
                    color: color.text,
                    boxShadow: isEditing ? `0 0 0 2px ${color.text}26` : undefined,
                  }}
                  onClick={() => onSegmentClick(segment.id)}
                >
                  <span className="truncate">
                    {segment.label || `${segment.duration_sprints} sp`}
                  </span>
                </button>
              ) : onAddSegment ? (
                <button
                  className="absolute inset-y-2 inset-x-3 rounded-lg border border-dashed border-gray-200 text-xs text-brand-gray hover:border-brand-orange hover:text-brand-orange transition-colors flex items-center justify-center gap-1"
                  onClick={() => onAddSegment(team.id)}
                  disabled={isPending}
                >
                  + Agregar
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── SegmentPanel ──────────────────────────────────────────────────────────────

function SegmentPanel({
  segment,
  team,
  allSegments,
  allTeams,
  manualMode,
  canEdit,
  onUpdate,
  onRemove,
  onClose,
  isPending,
}: {
  segment: RoadmapSegment;
  team: Team;
  allSegments: RoadmapSegment[];
  allTeams: Team[];
  manualMode: boolean;
  canEdit: boolean;
  onUpdate: (id: string, patch: Parameters<typeof updateSegment>[1]) => void;
  onRemove: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [label, setLabel] = useState(segment.label);
  const [duration, setDuration] = useState(segment.duration_sprints);
  const [manualStart, setManualStart] = useState(segment.manual_start_sprint ?? 0);
  const [dependsOn, setDependsOn] = useState<string[]>(segment.depends_on);

  useEffect(() => {
    setLabel(segment.label);
    setDuration(segment.duration_sprints);
    setManualStart(segment.manual_start_sprint ?? 0);
    setDependsOn(segment.depends_on);
  }, [segment.id]);

  const otherSegments = allSegments.filter((s) => s.id !== segment.id);

  function handleSave() {
    const patch: Parameters<typeof updateSegment>[1] = {
      label,
      duration_sprints: duration,
      depends_on: dependsOn,
    };
    if (manualMode) patch.manual_start_sprint = manualStart;
    onUpdate(segment.id, patch);
  }

  return (
    <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 self-start sticky top-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-xs text-brand-gray">Segmento</p>
          <p className="text-sm font-semibold text-brand-black">{team.name}</p>
        </div>
        <button
          onClick={onClose}
          className="text-brand-gray hover:text-brand-black text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="text-xs text-brand-gray block mb-1">Etiqueta</label>
          <input
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 disabled:bg-gray-50"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Descripción del segmento"
            disabled={!canEdit}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs text-brand-gray block mb-1">
            Duración — <span className="text-brand-black font-medium">{duration * 2} semanas</span>
          </label>
          <div className="flex items-center gap-2">
            <StepButton onClick={() => setDuration((d) => Math.max(1, d - 1))} disabled={!canEdit}>−</StepButton>
            <span className="text-sm font-semibold text-brand-black w-12 text-center">
              {duration} sp
            </span>
            <StepButton onClick={() => setDuration((d) => Math.min(52, d + 1))} disabled={!canEdit}>+</StepButton>
          </div>
        </div>

        {/* Manual start sprint */}
        {manualMode && (
          <div>
            <label className="text-xs text-brand-gray block mb-1">Sprint de inicio</label>
            <div className="flex items-center gap-2">
              <StepButton onClick={() => setManualStart((d) => Math.max(0, d - 1))} disabled={!canEdit}>−</StepButton>
              <span className="text-sm font-semibold text-brand-black w-12 text-center">
                {manualStart}
              </span>
              <StepButton onClick={() => setManualStart((d) => d + 1)} disabled={!canEdit}>+</StepButton>
            </div>
          </div>
        )}

        {/* Dependencies (auto mode only) */}
        {!manualMode && otherSegments.length > 0 && (
          <div>
            <label className="text-xs text-brand-gray block mb-2">Depende de</label>
            <div className="space-y-1.5">
              {otherSegments.map((s) => {
                const t = allTeams.find((t) => t.id === s.team_id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 text-xs text-brand-black cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={dependsOn.includes(s.id)}
                      onChange={(e) =>
                        setDependsOn((prev) =>
                          e.target.checked
                            ? [...prev, s.id]
                            : prev.filter((d) => d !== s.id),
                        )
                      }
                      disabled={!canEdit}
                      className="accent-brand-orange"
                    />
                    {t?.name ?? "Equipo desconocido"}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        {canEdit && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="w-full text-sm py-2 rounded-lg bg-brand-orange text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              onClick={onRemove}
              disabled={isPending}
              className="w-full text-sm py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Quitar del roadmap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-brand-gray hover:border-brand-orange hover:text-brand-orange disabled:opacity-40 transition-colors"
    >
      {children}
    </button>
  );
}

// ── ProductForm ───────────────────────────────────────────────────────────────

function ProductForm({
  orgId,
  onSuccess,
  onCancel,
}: {
  orgId: string;
  onSuccess: (p: Product) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [businessArea, setBusinessArea] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", name);
    fd.set("business_area", businessArea);
    fd.set("start_date", startDate);
    startTransition(async () => {
      const result = await createProduct({ error: null }, fd);
      if (result.error) { setError(result.error); return; }
      if (result.id) {
        onSuccess({
          id: result.id,
          organization_id: orgId,
          name: name.trim(),
          description: null,
          business_area: businessArea.trim() || null,
          initiative_id: null,
          start_date: startDate,
          manual_mode: false,
          status: "active",
          sort_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-brand-orange/20 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-black">Nuevo producto</p>
          <button
            type="button"
            onClick={onCancel}
            className="text-brand-gray hover:text-brand-black text-xl leading-none"
          >
            ×
          </button>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <input
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
          placeholder="Nombre del producto *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            placeholder="Área de negocio"
            value={businessArea}
            onChange={(e) => setBusinessArea(e.target.value)}
          />
          <input
            type="date"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="flex-1 text-sm py-2 rounded-lg bg-brand-orange text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isPending ? "Creando..." : "Crear producto"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm py-2 px-4 rounded-lg border border-gray-200 text-brand-gray hover:text-brand-black transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ── ManualModeToggle ──────────────────────────────────────────────────────────

function ManualModeToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-brand-gray cursor-pointer select-none">
      <span>Posición manual</span>
      <button
        role="switch"
        aria-checked={active}
        onClick={onToggle}
        className={`relative w-9 h-5 rounded-full transition-colors ${active ? "bg-brand-orange" : "bg-gray-200"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : ""}`}
        />
      </button>
    </label>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ canEdit, onAdd }: { canEdit: boolean; onAdd: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
      <p className="text-brand-black font-semibold mb-1">Sin productos todavía</p>
      <p className="text-sm text-brand-gray mb-6">
        Cada producto tiene su propio Gantt de equipos con reflow automático.
      </p>
      {canEdit && (
        <button
          onClick={onAdd}
          className="text-sm px-5 py-2 rounded-lg bg-brand-orange text-white font-medium hover:opacity-90 transition-opacity"
        >
          Crear primer producto
        </button>
      )}
    </div>
  );
}
