"use client";

import { useState, useEffect, useTransition, useMemo, useRef } from "react";
import type { Channel, Product, RoadmapBaseline, Team, RoadmapSegment, TeamDependency } from "@/types/database";
import { type AppRole, canWrite } from "@/lib/roles";
import {
  computeLayout,
  buildMonthHeaders,
  totalDisplaySprints,
  parseProductDate,
  sprintStartDate,
  dateToSprint,
  type SegmentLayout,
} from "@/lib/roadmap-logic";
import {
  listChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  loadProductSegments,
  addSegment,
  updateSegment,
  removeSegment,
  createProduct,
  updateProduct,
  captureBaseline,
  listBaselines,
  deleteBaseline,
  updateTeamsSortOrder,
  type BaselineSnapshot,
} from "./actions";
import { DeviationsThread } from "@/components/ui/DeviationsThread";


// ── Paleta de segmentos ───────────────────────────────────────────────────────

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

// ── Paleta de quarters ────────────────────────────────────────────────────────

const QUARTER_COLORS = [
  { bg: "#EAF1FB", border: "#BDD5F5", text: "#1E6FC5" },
  { bg: "#F0F4F8", border: "#D5DDED", text: "#64748B" },
  { bg: "#EAF1FB", border: "#BDD5F5", text: "#1E6FC5" },
  { bg: "#F0F4F8", border: "#D5DDED", text: "#64748B" },
];

type QuarterBand = { label: string; startSprint: number; sprintCount: number; q: number };

function buildQuarterBands(productStart: Date, totalSprints: number): QuarterBand[] {
  const msPerSprint = 14 * 86_400_000;
  const rawSprint = (d: Date) => (d.getTime() - productStart.getTime()) / msPerSprint;
  const year = productStart.getFullYear();
  const bands: QuarterBand[] = [];

  for (let y = year; y <= year + 1; y++) {
    for (let q = 0; q < 4; q++) {
      const qStart = new Date(y, q * 3, 1);
      const qEnd   = new Date(y, q * 3 + 3, 1);
      const s = rawSprint(qStart);
      const e = rawSprint(qEnd);
      if (e <= 0 || s >= totalSprints) continue;
      const vs = Math.max(0, Math.floor(s));
      const ve = Math.min(totalSprints, Math.ceil(e));
      if (ve <= vs) continue;
      bands.push({ label: `Q${q + 1}`, startSprint: vs, sprintCount: ve - vs, q });
    }
  }
  return bands;
}

// ── Helpers de formato ────────────────────────────────────────────────────────

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Constantes de layout ──────────────────────────────────────────────────────

const LABEL_W   = 160;
const SPRINT_PX = 40;

// ── RoadmapView ───────────────────────────────────────────────────────────────

type Props = {
  orgId: string;
  initialProducts: Product[];
  teams: Team[];
  teamDeps: TeamDependency[];
  role: AppRole;
};

export function RoadmapView({ orgId, initialProducts, teams: initialTeams, role }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [localTeams, setLocalTeams] = useState<Team[]>(initialTeams);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showChannelPanel, setShowChannelPanel] = useState(false);

  useEffect(() => {
    listChannels().then(({ channels: ch }) => setChannels(ch ?? []));
  }, []);

  // ── Filtro por canal ──────────────────────────────────────────────────────────
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  const productsByChannel = useMemo(
    () => (selectedChannelId ? products.filter((p) => p.channel_id === selectedChannelId) : products),
    [products, selectedChannelId],
  );

  // ── Selector de año ──────────────────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const first = initialProducts[0];
    return first
      ? parseProductDate(first.start_date).getFullYear()
      : new Date().getFullYear();
  });

  const availableYears = useMemo(() => {
    const cur = new Date().getFullYear();
    const set = new Set(productsByChannel.map((p) => parseProductDate(p.start_date).getFullYear()));
    set.add(cur);
    set.add(cur + 1);
    return Array.from(set).sort((a, b) => a - b);
  }, [productsByChannel]);

  const filteredProducts = useMemo(
    () => productsByChannel.filter((p) => parseProductDate(p.start_date).getFullYear() === selectedYear),
    [productsByChannel, selectedYear],
  );

  // ── Selección de producto ────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(initialProducts[0]?.id ?? null);
  const [segments, setSegments] = useState<RoadmapSegment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [editingSegId, setEditingSegId] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = filteredProducts.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !filteredProducts.find((p) => p.id === selectedId)) {
      setSelectedId(filteredProducts[0]?.id ?? null);
      setEditingSegId(null);
    }
  }, [selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedId && !filteredProducts.find((p) => p.id === selectedId)) {
      setSelectedId(filteredProducts[0]?.id ?? null);
      setEditingSegId(null);
    }
  }, [selectedChannelId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Layout / memos ───────────────────────────────────────────────────────────

  const productStart = useMemo(
    () => (selectedProduct ? parseProductDate(selectedProduct.start_date) : new Date()),
    [selectedProduct],
  );

  const reflowResult = useMemo(
    () => (selectedProduct ? computeLayout(segments, selectedProduct.manual_mode, productStart) : null),
    [segments, selectedProduct, productStart],
  );

  const layoutMap = useMemo(() => {
    const m = new Map<string, SegmentLayout>();
    reflowResult?.layout.forEach((l) => m.set(l.segment_id, l));
    return m;
  }, [reflowResult]);

  const minSprintsForYear = useMemo(() => {
    const nextYearStart = new Date(productStart.getFullYear() + 1, 0, 1);
    return Math.max(dateToSprint(productStart, nextYearStart) + 2, 13);
  }, [productStart]);

  const totalSprints = useMemo(
    () => (reflowResult ? totalDisplaySprints(reflowResult.layout, minSprintsForYear) : minSprintsForYear),
    [reflowResult, minSprintsForYear],
  );

  const monthHeaders = useMemo(
    () => buildMonthHeaders(productStart, totalSprints),
    [productStart, totalSprints],
  );

  const canEdit = canWrite(role);

  // ── Equipos visibles por producto ────────────────────────────────────────────

  const segmentTeamIds = useMemo(
    () => new Set(segments.map((s) => s.team_id)),
    [segments],
  );

  const effectiveTeams = useMemo(() => {
    const vids = selectedProduct?.visible_team_ids;
    // NULL o vacío → mostrar TODOS los equipos
    if (!vids || vids.length === 0) return localTeams;
    // Exactamente los seleccionados, sin excepciones
    const vidSet = new Set(vids);
    return localTeams.filter((t) => vidSet.has(t.id));
  }, [localTeams, selectedProduct?.visible_team_ids]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleSelectProduct(id: string) {
    setSelectedId(id);
    setEditingSegId(null);
  }

  function handleYearChange(year: number) {
    setSelectedYear(year);
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

  function handleReorderTeams(newVisibleOrder: Team[]) {
    // Reinserta los equipos ocultos al final manteniendo su orden relativo
    const visibleIds = new Set(newVisibleOrder.map((t) => t.id));
    const hidden = localTeams.filter((t) => !visibleIds.has(t.id));
    const newGlobalOrder = [...newVisibleOrder, ...hidden];
    setLocalTeams(newGlobalOrder);
    updateTeamsSortOrder(newGlobalOrder.map((t, i) => ({ id: t.id, sort_order: i })));
  }

  function handleUpdateVisibleTeams(teamIds: string[] | null) {
    if (!selectedProduct) return;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === selectedProduct.id ? { ...p, visible_team_ids: teamIds } : p,
      ),
    );
    updateProduct(selectedProduct.id, { visible_team_ids: teamIds });
  }

  async function handleCreateChannel(name: string): Promise<Channel | null> {
    const { channel, error } = await createChannel(name);
    if (error || !channel) return null;
    setChannels((prev) => [...prev, channel]);
    return channel;
  }

  async function handleRenameChannel(id: string, name: string) {
    const { error } = await updateChannel(id, name);
    if (!error) setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  async function handleDeleteChannel(id: string) {
    const { error } = await deleteChannel(id);
    if (!error) {
      setChannels((prev) => prev.filter((c) => c.id !== id));
      setProducts((prev) =>
        prev.map((p) => (p.channel_id === id ? { ...p, channel_id: null } : p)),
      );
    }
  }

  const editingSeg  = segments.find((s) => s.id === editingSegId) ?? null;
  const editingTeam = editingSeg ? (localTeams.find((t) => t.id === editingSeg.team_id) ?? null) : null;

  if (products.length === 0 && !showProductForm) {
    return <EmptyState canEdit={canEdit} onAdd={() => setShowProductForm(true)} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Canal */}
        <select
          value={selectedChannelId}
          onChange={(e) => setSelectedChannelId(e.target.value)}
          className="text-sm font-medium border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
        >
          <option value="">Todos los canales</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>{ch.name}</option>
          ))}
        </select>

        {/* Producto */}
        {filteredProducts.length > 0 && (
          <select
            value={selectedId ?? ""}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="text-sm font-medium border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
          >
            {filteredProducts.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {/* Año */}
        <select
          value={selectedYear}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="text-sm font-medium border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {canEdit && (
          <button
            onClick={() => setShowProductForm((v) => !v)}
            className="text-sm px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-brand-gray hover:border-brand-orange hover:text-brand-orange transition-colors"
          >
            + Nuevo producto
          </button>
        )}

        {canEdit && (
          <button
            onClick={() => setShowChannelPanel((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              showChannelPanel
                ? "border-brand-orange text-brand-orange bg-orange-50"
                : "border-gray-200 text-brand-gray hover:border-brand-orange hover:text-brand-orange"
            }`}
          >
            Canales
          </button>
        )}

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {selectedProduct?.target_launch_date && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: "#FFF4EE", border: "1px solid #FDDCB5", color: "#E8621A" }}
            >
              Salida: {fmtDate(parseProductDate(selectedProduct.target_launch_date))}
            </div>
          )}

          {reflowResult?.hasCycle && (
            <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
              Ciclo en dependencias
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

      {/* Panel de canales */}
      {showChannelPanel && (
        <ChannelPanel
          channels={channels}
          onRename={handleRenameChannel}
          onDelete={handleDeleteChannel}
          onCreate={handleCreateChannel}
        />
      )}

      {/* Formulario nuevo producto */}
      {showProductForm && (
        <ProductForm
          orgId={orgId}
          channels={channels}
          onChannelCreated={handleCreateChannel}
          onSuccess={(p) => {
            setProducts((prev) => [...prev, p]);
            setSelectedYear(parseProductDate(p.start_date).getFullYear());
            setSelectedId(p.id);
            setSegments([]);
            setShowProductForm(false);
          }}
          onCancel={() => setShowProductForm(false)}
        />
      )}

      {/* Gantt + panel lateral */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 overflow-x-auto">
          {!selectedProduct ? (
            <div className="p-12 text-center text-brand-gray text-sm">Seleccioná un producto.</div>
          ) : loadingSegments ? (
            <div className="p-12 text-center text-brand-gray text-sm">Cargando...</div>
          ) : localTeams.length === 0 ? (
            <div className="p-12 text-center text-brand-gray text-sm">
              Configurá equipos en{" "}
              <a href="/cross" className="text-brand-orange hover:underline">Modo Cross</a> primero.
            </div>
          ) : (
            <GanttGrid
              teams={effectiveTeams}
              allTeams={localTeams}
              segments={segments}
              segmentTeamIds={segmentTeamIds}
              visibleTeamIds={selectedProduct?.visible_team_ids ?? null}
              onUpdateVisibleTeams={canEdit ? handleUpdateVisibleTeams : undefined}
              layoutMap={layoutMap}
              monthHeaders={monthHeaders}
              totalSprints={totalSprints}
              productStart={productStart}
              editingSegId={editingSegId}
              onSegmentClick={setEditingSegId}
              onAddSegment={canEdit ? handleAddSegment : undefined}
              onReorderTeams={canEdit ? handleReorderTeams : undefined}
              manualMode={selectedProduct?.manual_mode ?? false}
              onUpdateManualSprint={canEdit ? (id, sprint) => handleUpdateSegment(id, { manual_start_sprint: sprint }) : undefined}
              isPending={isPending}
            />
          )}
        </div>

        {editingSeg && editingTeam ? (
          <SegmentPanel
            segment={editingSeg}
            team={editingTeam}
            allSegments={segments}
            allTeams={localTeams}
            manualMode={selectedProduct?.manual_mode ?? false}
            layoutMap={layoutMap}
            productStart={productStart}
            canEdit={canEdit}
            onUpdate={handleUpdateSegment}
            onRemove={() => handleRemoveSegment(editingSeg.id)}
            onClose={() => setEditingSegId(null)}
            isPending={isPending}
          />
        ) : selectedProduct ? (
          <ProductPanel
            product={selectedProduct}
            teams={localTeams}
            segments={segments}
            layoutMap={layoutMap}
            canEdit={canEdit}
            onAddSegment={handleAddSegment}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── ChannelPanel ──────────────────────────────────────────────────────────────

function ChannelPanel({
  channels,
  onRename,
  onDelete,
  onCreate,
}: {
  channels: Channel[];
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreate: (name: string) => Promise<Channel | null>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [isPending, startTransition] = useTransition();
  const newInputRef = useRef<HTMLInputElement>(null);

  function startEdit(ch: Channel) {
    setEditingId(ch.id);
    setEditValue(ch.name);
  }

  function handleSaveRename(id: string) {
    if (!editValue.trim()) return;
    startTransition(async () => {
      await onRename(id, editValue.trim());
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await onDelete(id);
    });
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await onCreate(newName.trim());
      setNewName("");
      setShowNew(false);
    });
  }

  useEffect(() => {
    if (showNew) newInputRef.current?.focus();
  }, [showNew]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-brand-black">Canales</p>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-gray-300 text-brand-gray hover:border-brand-orange hover:text-brand-orange transition-colors"
        >
          + Canal
        </button>
      </div>

      <div className="space-y-1.5">
        {channels.map((ch) => (
          <div key={ch.id} className="flex items-center gap-2">
            {editingId === ch.id ? (
              <>
                <input
                  autoFocus
                  className="flex-1 text-sm border border-brand-orange/40 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename(ch.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button
                  onClick={() => handleSaveRename(ch.id)}
                  disabled={isPending}
                  className="text-xs px-2.5 py-1 rounded-lg bg-brand-orange text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-brand-gray hover:text-brand-black transition-colors"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-brand-black">{ch.name}</span>
                <button
                  onClick={() => startEdit(ch)}
                  className="text-xs text-brand-gray hover:text-brand-black transition-colors"
                >
                  Renombrar
                </button>
                <button
                  onClick={() => handleDelete(ch.id)}
                  disabled={isPending}
                  className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        ))}

        {channels.length === 0 && !showNew && (
          <p className="text-xs text-brand-gray">Sin canales todavía.</p>
        )}

        {showNew && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-1">
            <input
              ref={newInputRef}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              placeholder="Nombre del canal"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setShowNew(false); setNewName(""); }
              }}
            />
            <button
              onClick={handleCreate}
              disabled={isPending || !newName.trim()}
              className="text-xs px-2.5 py-1 rounded-lg bg-brand-orange text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Agregar
            </button>
            <button
              onClick={() => { setShowNew(false); setNewName(""); }}
              className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-brand-gray hover:text-brand-black transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── GanttGrid ─────────────────────────────────────────────────────────────────

function GanttGrid({
  teams,
  allTeams,
  segments,
  segmentTeamIds,
  visibleTeamIds,
  onUpdateVisibleTeams,
  layoutMap,
  monthHeaders,
  totalSprints,
  productStart,
  editingSegId,
  onSegmentClick,
  onAddSegment,
  onReorderTeams,
  manualMode,
  onUpdateManualSprint,
  isPending,
}: {
  teams: Team[];
  allTeams: Team[];
  segments: RoadmapSegment[];
  segmentTeamIds: Set<string>;
  visibleTeamIds: string[] | null;
  onUpdateVisibleTeams?: (ids: string[] | null) => void;
  layoutMap: Map<string, SegmentLayout>;
  monthHeaders: ReturnType<typeof buildMonthHeaders>;
  totalSprints: number;
  productStart: Date;
  editingSegId: string | null;
  onSegmentClick: (id: string) => void;
  onAddSegment?: (teamId: string) => void;
  onReorderTeams?: (newOrder: Team[]) => void;
  manualMode?: boolean;
  onUpdateManualSprint?: (segmentId: string, sprint: number) => void;
  isPending: boolean;
}) {
  // ── Estado drag de filas (reorder vertical) ──────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // ── Estado filtro de equipos ──────────────────────────────────────────────────
  const [showFilter, setShowFilter] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [filterSearch, setFilterSearch] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    if (!showFilter) return;
    function onClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showFilter]);

  function openFilter() {
    // Fuente de verdad: visible_team_ids del producto (null → ninguno tildado)
    setDraftIds(visibleTeamIds ?? []);
    setFilterSearch("");
    setShowFilter(true);
  }

  function toggleDraft(teamId: string) {
    setDraftIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  }

  function applyFilter() {
    if (!onUpdateVisibleTeams) return;
    // Ninguno o todos seleccionados → null (sin filtro)
    const isAll = draftIds.length === 0 || draftIds.length === allTeams.length;
    onUpdateVisibleTeams(isAll ? null : draftIds);
    setShowFilter(false);
  }

  function setShortcutWithTasks() {
    setDraftIds(Array.from(segmentTeamIds));
  }

  function setShortcutAll() {
    setDraftIds(allTeams.map((t) => t.id));
  }

  // Badge: muestra cuando hay filtro activo (visible < total)
  const showBadge = teams.length < allTeams.length;

  // ── Estado drag horizontal de barras (modo manual) ───────────────────────────
  const [dragSprint, setDragSprint] = useState<{ segmentId: string; sprint: number } | null>(null);
  const manualDragRef = useRef<{
    segmentId: string;
    baseSprint: number;
    duration: number;
    startX: number;
  } | null>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = manualDragRef.current;
      if (!drag) return;
      const deltaSprints = Math.round((e.clientX - drag.startX) / SPRINT_PX);
      const newSprint = Math.max(0, Math.min(totalSprints - drag.duration, drag.baseSprint + deltaSprints));
      setDragSprint({ segmentId: drag.segmentId, sprint: newSprint });
    }
    function onMouseUp(e: MouseEvent) {
      const drag = manualDragRef.current;
      if (!drag) return;
      const deltaSprints = Math.round((e.clientX - drag.startX) / SPRINT_PX);
      const newSprint = Math.max(0, Math.min(totalSprints - drag.duration, drag.baseSprint + deltaSprints));
      onUpdateManualSprint?.(drag.segmentId, newSprint);
      manualDragRef.current = null;
      setDragSprint(null);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [totalSprints, onUpdateManualSprint]);

  const teamIndexMap  = new Map(teams.map((t, i) => [t.id, i]));
  const quarterBands  = buildQuarterBands(productStart, totalSprints);
  const minW          = LABEL_W + totalSprints * SPRINT_PX;

  const pct  = (sprint: number) => `${(sprint / totalSprints) * 100}%`;
  const wPct = (sprints: number) => `${(sprints / totalSprints) * 100}%`;

  function handleDragStart(e: React.DragEvent, teamId: string) {
    setDraggingId(teamId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, teamId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (teamId !== draggingId) setDragOverId(teamId);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === targetId || !onReorderTeams) return;
    const next = [...teams];
    const fromIdx = next.findIndex((t) => t.id === draggingId);
    const toIdx   = next.findIndex((t) => t.id === targetId);
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onReorderTeams(next);
    setDraggingId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  return (
    <div style={{ minWidth: minW }}>

      {/* Fila de Quarters */}
      <div className="flex" style={{ height: 28, borderBottom: "1px solid #E5E7EB" }}>
        <div
          className="flex-shrink-0 bg-gray-50 border-r border-gray-200"
          style={{ width: LABEL_W, position: "sticky", left: 0, zIndex: 10 }}
        />
        <div className="flex-1 relative bg-gray-50">
          {quarterBands.map((band, i) => {
            const c = QUARTER_COLORS[band.q];
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 flex items-center justify-center"
                style={{
                  left: pct(band.startSprint),
                  width: wPct(band.sprintCount),
                  backgroundColor: c.bg,
                  borderRight: `1px solid ${c.border}`,
                }}
              >
                <span className="text-xs font-semibold" style={{ color: c.text }}>
                  {band.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fila de meses */}
      <div className="flex border-b border-gray-200">
        <div
          className="flex-shrink-0 flex items-center px-4 py-2 bg-gray-50 border-r border-gray-200 gap-2"
          style={{ width: LABEL_W, position: "sticky", left: 0, zIndex: 20 }}
        >
          <span className="text-xs text-brand-gray font-medium uppercase tracking-wide flex-1">Equipo</span>
          {showBadge && (
            <span className="text-[10px] font-semibold text-brand-orange bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              {teams.length}/{allTeams.length}
            </span>
          )}
          {onUpdateVisibleTeams && (
            <div ref={filterRef} className="relative">
              <button
                onClick={openFilter}
                title="Configurar equipos visibles"
                className={`text-[11px] px-1.5 py-0.5 rounded border transition-colors ${
                  visibleTeamIds !== null
                    ? "border-brand-orange text-brand-orange bg-orange-50"
                    : "border-gray-200 text-brand-gray hover:border-brand-orange hover:text-brand-orange"
                }`}
              >
                ▼
              </button>

              {showFilter && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {/* Atajos */}
                  <div className="p-2 border-b border-gray-100 flex flex-col gap-1">
                    <button
                      onClick={setShortcutWithTasks}
                      className="text-left text-xs px-2 py-1.5 rounded-lg hover:bg-orange-50 hover:text-brand-orange text-brand-gray transition-colors"
                    >
                      Con tareas en este producto
                    </button>
                    <button
                      onClick={setShortcutAll}
                      className="text-left text-xs px-2 py-1.5 rounded-lg hover:bg-gray-50 text-brand-gray transition-colors"
                    >
                      Todos
                    </button>
                  </div>

                  {/* Buscador */}
                  <div className="px-2 pt-2 pb-1">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Buscar equipo…"
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 placeholder:text-gray-400"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="max-h-48 overflow-y-auto p-2 flex flex-col gap-1">
                    {allTeams
                      .filter((t) =>
                        t.name.toLowerCase().includes(filterSearch.toLowerCase()),
                      )
                      .map((t) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 text-xs text-brand-black px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={draftIds.includes(t.id)}
                            onChange={() => toggleDraft(t.id)}
                            className="accent-brand-orange"
                          />
                          <span className="flex-1 truncate">{t.name}</span>
                          {segmentTeamIds.has(t.id) && (
                            <span className="text-[9px] font-bold text-brand-orange">●</span>
                          )}
                        </label>
                      ))}
                    {allTeams.filter((t) =>
                      t.name.toLowerCase().includes(filterSearch.toLowerCase()),
                    ).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">Sin resultados.</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-2 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={applyFilter}
                      disabled={draftIds.length === 0}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-brand-orange text-white font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                      Aplicar
                    </button>
                    <button
                      onClick={() => setShowFilter(false)}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-brand-gray hover:text-brand-black transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 relative h-9 bg-gray-50 overflow-hidden">
          {monthHeaders.map((h, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 flex items-center px-2 border-r border-gray-200"
              style={{ left: pct(h.startSprint), width: wPct(h.sprintCount) }}
            >
              <span className="text-xs font-medium text-brand-gray whitespace-nowrap">{h.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filas de equipos */}
      {teams.map((team, idx) => {
        const segment   = segments.find((s) => s.team_id === team.id);
        const layout    = segment ? layoutMap.get(segment.id) : null;
        const color     = segmentColor(teamIndexMap.get(team.id) ?? idx);
        const isEditing = !!segment && segment.id === editingSegId;
        const isEven    = idx % 2 === 0;
        const rowBg     = isEven ? "bg-white" : "bg-gray-50/40";
        const isDragging   = draggingId === team.id;
        const isDropTarget = dragOverId  === team.id;
        const isDraggingBar = !!segment && dragSprint?.segmentId === segment.id;
        const displaySprint = isDraggingBar ? dragSprint!.sprint : (layout?.start_sprint ?? 0);
        const canDragBar    = manualMode && !!onUpdateManualSprint;

        return (
          <div
            key={team.id}
            draggable={!!onReorderTeams}
            onDragStart={(e) => handleDragStart(e, team.id)}
            onDragOver={(e)  => handleDragOver(e, team.id)}
            onDragLeave={() => setDragOverId(null)}
            onDrop={(e)      => handleDrop(e, team.id)}
            onDragEnd={handleDragEnd}
            className={`flex border-b border-gray-100 last:border-b-0 h-14 transition-opacity ${rowBg} ${isDragging ? "opacity-40" : ""}`}
            style={isDropTarget ? { boxShadow: "inset 0 2px 0 0 #E8621A" } : undefined}
          >
            <div
              className={`flex-shrink-0 flex items-center gap-2 px-4 border-r border-gray-100 ${rowBg} ${onReorderTeams ? "cursor-grab active:cursor-grabbing" : ""}`}
              style={{ width: LABEL_W, position: "sticky", left: 0, zIndex: 10 }}
            >
              {onReorderTeams && (
                <span className="text-gray-300 text-xs select-none flex-shrink-0">⠿</span>
              )}
              <span className="text-sm font-medium text-brand-black truncate">
                {team.name}
              </span>
            </div>

            <div className="flex-1 relative overflow-hidden">
              {monthHeaders.map((h, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-gray-100"
                  style={{ left: pct(h.startSprint), width: wPct(h.sprintCount) }}
                />
              ))}

              {segment && layout ? (
                <button
                  draggable={false}
                  className={`absolute top-2 bottom-2 rounded-lg flex items-center px-3 text-xs font-medium focus:outline-none select-none ${canDragBar ? "cursor-ew-resize" : "transition-all hover:brightness-95"} ${isDraggingBar ? "opacity-90 shadow-lg" : ""}`}
                  style={{
                    left: pct(displaySprint),
                    width: `max(${wPct(segment.duration_sprints)}, 40px)`,
                    backgroundColor: color.bg,
                    border: `1.5px solid ${isEditing || isDraggingBar ? color.text : color.border}`,
                    color: color.text,
                    boxShadow: isEditing || isDraggingBar ? `0 0 0 2px ${color.text}26` : undefined,
                    transition: isDraggingBar ? "none" : undefined,
                    zIndex: isDraggingBar ? 20 : undefined,
                  }}
                  onMouseDown={canDragBar ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    manualDragRef.current = {
                      segmentId: segment.id,
                      baseSprint: segment.manual_start_sprint ?? layout.start_sprint,
                      duration: segment.duration_sprints,
                      startX: e.clientX,
                    };
                    setDragSprint({ segmentId: segment.id, sprint: segment.manual_start_sprint ?? layout.start_sprint });
                  } : undefined}
                  onClick={isDraggingBar ? undefined : () => onSegmentClick(segment.id)}
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
  layoutMap,
  productStart,
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
  layoutMap: Map<string, SegmentLayout>;
  productStart: Date;
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
  const [anchorDate, setAnchorDate] = useState(segment.start_date ?? "");

  useEffect(() => {
    setLabel(segment.label);
    setDuration(segment.duration_sprints);
    setManualStart(segment.manual_start_sprint ?? 0);
    setDependsOn(segment.depends_on);
    setAnchorDate(segment.start_date ?? "");
  }, [segment.id]);

  const otherSegments = allSegments.filter((s) => s.id !== segment.id);

  const computedStartDate = (() => {
    const layout = layoutMap.get(segment.id);
    return layout ? sprintStartDate(productStart, layout.start_sprint) : null;
  })();

  function handleSave() {
    const patch: Parameters<typeof updateSegment>[1] = {
      label,
      duration_sprints: duration,
      depends_on: dependsOn,
      start_date: anchorDate || null,
    };
    if (manualMode) patch.manual_start_sprint = manualStart;
    onUpdate(segment.id, patch);
  }

  return (
    <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 self-start sticky top-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex-1 min-w-0 pr-2">
          <label className="text-xs text-brand-gray block mb-1">Equipo</label>
          <select
            disabled
            value={team.id}
            className="w-full text-sm font-semibold text-brand-black bg-transparent border-none outline-none cursor-default truncate"
          >
            {allTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onClose}
          className="text-brand-gray hover:text-brand-black text-xl leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-4">
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

        <div>
          <label className="text-xs text-brand-gray block mb-1">Inicio (opcional)</label>
          <input
            type="date"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 disabled:bg-gray-50"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
            disabled={!canEdit}
          />
          {anchorDate ? (
            <p className="text-xs text-brand-orange mt-1">
              Posición fija — ignora el reflow automático.
            </p>
          ) : computedStartDate ? (
            <p className="text-xs text-brand-gray mt-1">
              Inicio calculado:{" "}
              <span className="font-medium text-brand-black">{fmtDate(computedStartDate)}</span>
            </p>
          ) : null}
        </div>

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

        {otherSegments.length > 0 && (
          <div>
            <label className="text-xs text-brand-gray block mb-1">Depende de</label>
            {manualMode && (
              <p className="text-[10px] text-brand-gray mb-2">
                Solo informativo en modo manual.
              </p>
            )}
            <div className="space-y-1.5">
              {otherSegments.map((s) => {
                const t = allTeams.find((t) => t.id === s.team_id);
                const teamName = t?.name ?? "Equipo desconocido";
                const segLabel = s.label ? ` — ${s.label}` : ` (${s.duration_sprints} sp)`;
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
                    <span>{teamName}<span className="text-brand-gray">{segLabel}</span></span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

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

// ── StepButton ────────────────────────────────────────────────────────────────

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

// ── ProductPanel ──────────────────────────────────────────────────────────────

type ProductPanelTab = "deviations" | "baselines";

function ProductPanel({
  product,
  teams,
  segments,
  layoutMap,
  canEdit,
  onAddSegment,
}: {
  product: Product;
  teams: Team[];
  segments: RoadmapSegment[];
  layoutMap: Map<string, SegmentLayout>;
  canEdit: boolean;
  onAddSegment: (teamId: string) => void;
}) {
  const [tab, setTab] = useState<ProductPanelTab>("deviations");
  const [baselines, setBaselines] = useState<RoadmapBaseline[]>([]);
  const [loadingBaselines, setLoadingBaselines] = useState(false);
  const [baselineName, setBaselineName] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // ── Nueva tarea ──────────────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeamId, setNewTeamId] = useState("");

  useEffect(() => {
    if (tab !== "baselines") return;
    setLoadingBaselines(true);
    listBaselines(product.id).then(({ baselines: bl }) => {
      setBaselines(bl);
      setLoadingBaselines(false);
    });
  }, [tab, product.id]);

  async function handleCapture() {
    const snapshot: BaselineSnapshot = segments
      .map(s => {
        const layout = layoutMap.get(s.id);
        if (!layout) return null;
        const team = teams.find(t => t.id === s.team_id);
        return {
          segment_id: s.id,
          team_id: s.team_id,
          team_name: team?.name ?? "Equipo desconocido",
          start_sprint: layout.start_sprint,
          duration_sprints: s.duration_sprints,
        };
      })
      .filter((x): x is BaselineSnapshot[number] => x !== null);

    setCapturing(true);
    setCaptureError(null);
    const { error } = await captureBaseline(product.id, snapshot, baselineName);
    if (error) {
      setCaptureError(error);
    } else {
      setBaselineName("");
      const { baselines: fresh } = await listBaselines(product.id);
      setBaselines(fresh);
    }
    setCapturing(false);
  }

  async function handleDeleteBaseline(id: string) {
    await deleteBaseline(id);
    setBaselines(prev => prev.filter(b => b.id !== id));
  }

  const usedTeamIds = new Set(segments.map((s) => s.team_id));
  const availableTeams = teams.filter((t) => !usedTeamIds.has(t.id));

  function handleAddSubmit() {
    if (!newTeamId) return;
    onAddSegment(newTeamId);
    setNewTeamId("");
    setShowAddForm(false);
  }

  return (
    <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 self-start sticky top-6">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-brand-gray">Producto</p>
        <p className="text-sm font-semibold text-brand-black truncate">{product.name}</p>
      </div>

      {/* Nueva tarea */}
      {canEdit && (
        <div className="border-b border-gray-100">
          {!showAddForm ? (
            <button
              onClick={() => { setShowAddForm(true); setNewTeamId(availableTeams[0]?.id ?? ""); }}
              className="w-full flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-brand-orange hover:bg-orange-50 transition-colors"
            >
              <span className="text-base leading-none">+</span> Nueva tarea
            </button>
          ) : (
            <div className="px-4 py-3 flex flex-col gap-2">
              <div className="text-[11px] font-bold text-brand-gray uppercase tracking-wider">Nueva tarea</div>
              {availableTeams.length === 0 ? (
                <p className="text-xs text-brand-gray">
                  Todos los equipos ya tienen tareas en este producto.
                </p>
              ) : (
                <>
                  <select
                    value={newTeamId}
                    onChange={(e) => setNewTeamId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                  >
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-brand-gray">
                    ¿El equipo no existe? Crealo desde <span className="font-semibold">Equipos</span> en el encabezado.
                  </p>
                </>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddSubmit}
                  disabled={!newTeamId || availableTeams.length === 0}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-brand-orange text-white font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  Agregar
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-brand-gray hover:text-brand-black transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab("deviations")}
          className={`flex-1 text-xs py-2 font-semibold transition-colors ${
            tab === "deviations"
              ? "text-brand-orange border-b-2 border-brand-orange"
              : "text-brand-gray hover:text-brand-black"
          }`}
        >
          ⚠️ Desvíos
        </button>
        <button
          onClick={() => setTab("baselines")}
          className={`flex-1 text-xs py-2 font-semibold transition-colors ${
            tab === "baselines"
              ? "text-brand-orange border-b-2 border-brand-orange"
              : "text-brand-gray hover:text-brand-black"
          }`}
        >
          📐 Línea base
        </button>
      </div>

      <div className="p-4">
        {tab === "deviations" && (
          <DeviationsThread
            entityType="product"
            entityId={product.id}
            entityName={product.name}
            canWrite={canEdit}
          />
        )}

        {tab === "baselines" && (
          <div className="flex flex-col gap-3">
            {/* Capturar */}
            {canEdit && (
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold text-brand-gray uppercase tracking-wider">
                  Establecer línea base
                </div>
                <input
                  value={baselineName}
                  onChange={e => setBaselineName(e.target.value)}
                  placeholder="Nombre (opcional, ej: Baseline Q2)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
                {captureError && (
                  <p className="text-[11px] text-red-500">{captureError}</p>
                )}
                <button
                  onClick={handleCapture}
                  disabled={capturing || segments.length === 0}
                  className="self-start px-4 py-1.5 text-xs font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-50 text-white transition"
                >
                  {capturing ? "Guardando…" : "Guardar snapshot"}
                </button>
                {segments.length === 0 && (
                  <p className="text-[11px] text-brand-gray">
                    Agregá segmentos al producto para capturar una línea base.
                  </p>
                )}
              </div>
            )}

            {/* Lista */}
            <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
              <div className="text-[11px] font-bold text-brand-gray uppercase tracking-wider">
                Historial
              </div>
              {loadingBaselines && (
                <p className="text-xs text-gray-400 text-center py-2">Cargando…</p>
              )}
              {!loadingBaselines && baselines.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  Sin líneas base capturadas.
                </p>
              )}
              {baselines.map(b => (
                <div
                  key={b.id}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 flex flex-col gap-1"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-brand-black">
                        {b.name ?? fmtBaselineDate(b.captured_at)}
                      </span>
                      {b.name && (
                        <span className="text-[10px] text-brand-gray">
                          {fmtBaselineDate(b.captured_at)}
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteBaseline(b.id)}
                        className="text-[10px] text-gray-300 hover:text-red-400 flex-shrink-0"
                        title="Eliminar"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-brand-gray">
                    {b.snapshot.length} segmento{b.snapshot.length !== 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fmtBaselineDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── ProductForm ───────────────────────────────────────────────────────────────

const ADD_CHANNEL_SENTINEL = "__add_channel__";

function ProductForm({
  orgId,
  channels,
  onChannelCreated,
  onSuccess,
  onCancel,
}: {
  orgId: string;
  channels: Channel[];
  onChannelCreated: (name: string) => Promise<Channel | null>;
  onSuccess: (p: Product) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [localChannels, setLocalChannels] = useState<Channel[]>(channels);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetLaunchDate, setTargetLaunchDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const newChannelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalChannels(channels);
  }, [channels]);

  useEffect(() => {
    if (showNewChannel) newChannelRef.current?.focus();
  }, [showNewChannel]);

  function handleChannelSelect(val: string) {
    if (val === ADD_CHANNEL_SENTINEL) {
      setShowNewChannel(true);
    } else {
      setChannelId(val);
    }
  }

  function handleAddChannel() {
    if (!newChannelName.trim()) return;
    startTransition(async () => {
      const ch = await onChannelCreated(newChannelName.trim());
      if (ch) {
        setLocalChannels((prev) => [...prev, ch]);
        setChannelId(ch.id);
      }
      setNewChannelName("");
      setShowNewChannel(false);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", name);
    if (channelId) fd.set("channel_id", channelId);
    fd.set("start_date", startDate);
    if (targetLaunchDate) fd.set("target_launch_date", targetLaunchDate);
    startTransition(async () => {
      const result = await createProduct({ error: null }, fd);
      if (result.error) { setError(result.error); return; }
      if (result.id) {
        onSuccess({
          id: result.id,
          organization_id: orgId,
          name: name.trim(),
          description: null,
          business_area: null,
          channel_id: channelId || null,
          initiative_id: null,
          start_date: startDate,
          target_launch_date: targetLaunchDate || null,
          manual_mode: false,
          visible_team_ids: null,
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

        {/* Select de canal */}
        {!showNewChannel ? (
          <select
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            value={channelId}
            onChange={(e) => handleChannelSelect(e.target.value)}
          >
            <option value="">Canal (opcional)</option>
            {localChannels.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
            <option value={ADD_CHANNEL_SENTINEL}>+ Agregar canal...</option>
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={newChannelRef}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              placeholder="Nombre del canal"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleAddChannel(); }
                if (e.key === "Escape") { setShowNewChannel(false); setNewChannelName(""); }
              }}
            />
            <button
              type="button"
              onClick={handleAddChannel}
              disabled={isPending || !newChannelName.trim()}
              className="text-sm px-3 py-2 rounded-lg bg-brand-orange text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => { setShowNewChannel(false); setNewChannelName(""); }}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-brand-gray hover:text-brand-black transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-brand-gray block mb-1">Inicio *</label>
            <input
              type="date"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-brand-gray block mb-1">Salida a producción</label>
            <input
              type="date"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              value={targetLaunchDate}
              onChange={(e) => setTargetLaunchDate(e.target.value)}
            />
          </div>
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
