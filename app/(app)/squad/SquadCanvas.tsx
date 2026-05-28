"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Project } from "@/types/database";
import { computeQuadrant, QUADRANT_META, type Quadrant } from "@/lib/quadrant";
import {
  bubbleRadius,
  squadLimit,
  posIn,
  posOut,
  posInBand,
  dateToQuarter,
  deadlineStatus,
  separateBubbles,
  DL_COLOR,
  CAP_COLOR,
  ZONE_R,
  type SquadConfig,
  type BubbleItem,
} from "@/lib/squad-logic";
import { BubbleCard } from "./BubbleCard";
import { ImpactModal } from "./ImpactModal";
import { updateSquadStatus, swapSquadStatus, updateProjectPosition, updateProjectDate, restoreProject } from "./actions";

type Pos = { x: number; y: number };
type SquadStatus = "backlog" | "curso";

const QUADRANT_EMOJI: Record<Quadrant, string> = {
  p1: "🚀", p2: "🏗", p3: "💡", p0: "🚫",
};

const Q_BAND_COLORS = ["#1E6FC5", "#1D9E75", "#E8621A", "#6B6B6B"];
const Q_BAND_LABELS = ["Q1 Ene–Mar", "Q2 Abr–Jun", "Q3 Jul–Sep", "Q4 Oct–Dic"];
const YEAR = new Date().getFullYear();
const QUARTER_DATES = [`${YEAR}-01-01`, `${YEAR}-04-01`, `${YEAR}-07-01`, `${YEAR}-10-01`];

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function urgencyLabel(date: string | null): { text: string; color: string } | null {
  if (!date) return null;
  const diff = Math.round((new Date(date).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { text: "Vencida", color: "#E24B4A" };
  if (diff <= 14) return { text: "Urgente", color: "#E24B4A" };
  if (diff <= 30) return { text: "Pronto", color: "#EF9F27" };
  return { text: "OK", color: "#1D9E75" };
}

function computePositions(
  projects: Project[],
  overrides: Map<string, SquadStatus>,
  W: number,
  H: number,
  zoneR: number,
  quarterOverlay = false
): Map<string, Pos> {
  const map = new Map<string, Pos>();
  const inCurso = projects.filter(p => (overrides.get(p.id) ?? p.squad_status) === "curso");
  const inBacklog = projects.filter(p => (overrides.get(p.id) ?? p.squad_status) === "backlog");

  inCurso.forEach((p, i) => {
    const r = bubbleRadius(p.effort_sprints);
    map.set(p.id, posIn(i, inCurso.length, r, W, H, zoneR));
  });

  if (quarterOverlay) {
    const byQ: Project[][] = [[], [], [], []];
    inBacklog.forEach(p => byQ[dateToQuarter(p.production_date)].push(p));

    const items: BubbleItem[] = [];
    byQ.forEach((qProjects, bandIndex) => {
      const bandW = W / 4;
      qProjects.forEach((p, i) => {
        const r = bubbleRadius(p.effort_sprints);
        const pos = posInBand(i, qProjects.length, r, W, H, bandIndex);
        items.push({ id: p.id, x: pos.x, y: pos.y, r, bandLeft: bandIndex * bandW, bandRight: (bandIndex + 1) * bandW });
      });
    });

    const separated = separateBubbles(items, H);
    separated.forEach(s => map.set(s.id, { x: s.x, y: s.y }));
  } else {
    inBacklog.forEach((p, i) => {
      const r = bubbleRadius(p.effort_sprints);
      if (p.canvas_x != null && p.canvas_y != null) {
        map.set(p.id, { x: p.canvas_x, y: p.canvas_y });
      } else {
        map.set(p.id, posOut(i, inBacklog.length, r, W, H, zoneR));
      }
    });
  }
  return map;
}

type Props = {
  projects: Project[];
  discarded: Project[];
  p0Projects: Project[];
  config: SquadConfig;
  onEdit: (p: Project) => void;
  quarterOverlay?: boolean;
  readOnly?: boolean;
  crossLinkedIds?: Set<string>;
  highlightIds?: Set<string> | null;
};

export function SquadCanvas({ projects, discarded, p0Projects, config, onEdit, quarterOverlay = false, readOnly = false, crossLinkedIds, highlightIds }: Props) {
  const CANVAS_H = 650;
  const canvasRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<Map<string, Pos>>(new Map());
  const zoneRRef = useRef(ZONE_R); // always-current zone radius for memoized callbacks

  const [W, setW] = useState(800);
  const [statusOverrides, setStatusOverrides] = useState<Map<string, SquadStatus>>(new Map());
  const [positions, setPositions] = useState<Map<string, Pos>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const quarterOverlayRef = useRef(quarterOverlay);
  const [infoMsg, setInfoMsg] = useState("Arrastrá burbujas al círculo para sumarlas al sprint. Doble click para editar.");
  const [impactTarget, setImpactTarget] = useState<Project | null>(null);
  const [tooltip, setTooltip] = useState<{
    project: Project;
    cx: number; // bubble center x in viewport coords
    ty: number; // bubble top y in viewport coords
    bh: number; // bubble height (px)
    aggregate?: { total: number; completed: number; count: number };
  } | null>(null);

  const dragRef = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  // Measure canvas width on mount
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setW(el.offsetWidth || 800));
    obs.observe(el);
    setW(el.offsetWidth || 800);
    return () => obs.disconnect();
  }, []);

  const sqLim = squadLimit(config.devN, config.devP);
  const cursoIds = new Set(
    projects
      .filter(p => (statusOverrides.get(p.id) ?? p.squad_status) === "curso")
      .map(p => p.id)
  );
  const cursoCount = cursoIds.size;
  const capPct = sqLim > 0 ? Math.min(100, (cursoCount / sqLim) * 100) : 0;
  const capColor = CAP_COLOR(capPct);

  // Dynamic zone: base 100 (200px ⌀), +40 per en-curso project, max 250 (500px ⌀)
  const dynamicZoneR = Math.min(250, Math.max(100, 100 + cursoCount * 40));

  // Keep refs in sync so stale useCallback closures always read the latest value
  useEffect(() => { zoneRRef.current = dynamicZoneR; }, [dynamicZoneR]);
  useEffect(() => { quarterOverlayRef.current = quarterOverlay; }, [quarterOverlay]);

  // Recompute positions when projects, status, dimensions, zone radius, or overlay mode change
  useEffect(() => {
    const newPositions = computePositions(projects, statusOverrides, W, CANVAS_H, dynamicZoneR, quarterOverlay);
    setPositions(newPositions);
    posRef.current = newPositions;
  }, [projects, statusOverrides, W, dynamicZoneR, quarterOverlay]);

  // Zone check uses ref so it's always current inside memoized callbacks
  function inZone(clientX: number, clientY: number): boolean {
    const cr = canvasRef.current?.getBoundingClientRect();
    if (!cr) return false;
    const zoneCx = cr.left + cr.width / 2;
    const zoneCy = cr.top + cr.height / 2;
    return Math.sqrt((clientX - zoneCx) ** 2 + (clientY - zoneCy) ** 2) < zoneRRef.current - 10;
  }

  function startDrag(id: string, e: React.MouseEvent) {
    e.preventDefault();
    setTooltip(null);
    setIsDragging(true);
    const pos = posRef.current.get(id);
    if (!pos) return;
    dragRef.current = {
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };
  }

  function handleBubbleMouseEnter(id: string, e: React.MouseEvent) {
    if (dragRef.current) return; // no tooltip during drag
    const project = projects.find(p => p.id === id);
    const pos = posRef.current.get(id);
    const cr = canvasRef.current?.getBoundingClientRect();
    if (!project || !pos || !cr) return;
    const r = bubbleRadius(project.effort_sprints);
    setTooltip({
      project,
      cx: cr.left + pos.x + r,
      ty: cr.top + pos.y,
      bh: r * 2,
      aggregate: aggregatesMap.get(project.id),
    });
  }

  function handleBubbleMouseLeave() {
    setTooltip(null);
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const { id, startMouseX, startMouseY, startPosX, startPosY } = dragRef.current;
    const dx = e.clientX - startMouseX;
    const dy = e.clientY - startMouseY;
    const project = projects.find(p => p.id === id);
    const r = project ? bubbleRadius(project.effort_sprints) : 40;
    const newPos = {
      x: Math.max(0, Math.min(W - r * 2, startPosX + dx)),
      y: Math.max(0, Math.min(CANVAS_H - r * 2, startPosY + dy)),
    };
    setPositions(prev => {
      const next = new Map(prev);
      next.set(id, newPos);
      posRef.current = next;
      return next;
    });

    const inside = inZone(e.clientX, e.clientY);
    setIsDragOver(inside);
    const curStatus = statusOverrides.get(id) ?? projects.find(p => p.id === id)?.squad_status ?? "backlog";
    setIsOverLimit(inside && curStatus !== "curso" && cursoCount >= sqLim);
  }, [projects, statusOverrides, cursoCount, sqLim, W]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const { id, startPosX, startPosY } = dragRef.current;
    const curPos = posRef.current.get(id);
    dragRef.current = null;
    setIsDragging(false);
    setIsDragOver(false);
    setIsOverLimit(false);

    const project = projects.find(p => p.id === id);
    if (!project) return;

    const inside = inZone(e.clientX, e.clientY);
    const wasCurso = (statusOverrides.get(id) ?? project.squad_status) === "curso";

    // Block parent projects from entering zone — move their slices instead
    if (inside && !wasCurso && parentIds.has(id)) {
      setPositions(prev => {
        const next = new Map(prev);
        next.set(id, { x: startPosX, y: startPosY });
        posRef.current = next;
        return next;
      });
      setInfoMsg(`⑂ <strong>${project.name}</strong> tiene slices — agregá los slices al sprint.`);
      return;
    }

    if (inside && !wasCurso) {
      if (cursoCount >= sqLim) {
        setPositions(prev => {
          const next = new Map(prev);
          next.set(id, { x: startPosX, y: startPosY });
          posRef.current = next;
          return next;
        });
        setImpactTarget(project);
      } else {
        setStatusOverrides(prev => new Map(prev).set(id, "curso"));
        updateSquadStatus(id, "curso");
        setInfoMsg(`✅ <strong>${project.name}</strong> en sprint — ${project.effort_sprints} sprints`);
      }
    } else if (!inside && wasCurso) {
      setStatusOverrides(prev => new Map(prev).set(id, "backlog"));
      updateSquadStatus(id, "backlog");
      // Save drop position so the bubble stays where the user placed it
      if (curPos) updateProjectPosition(id, Math.round(curPos.x), Math.round(curPos.y));
      setInfoMsg(`⬆️ <strong>${project.name}</strong> movido al backlog.`);
    } else if (!inside && !wasCurso && curPos) {
      if (quarterOverlayRef.current) {
        // In overlay mode: detect which band the bubble was dropped in → update production_date
        const cr = canvasRef.current?.getBoundingClientRect();
        if (cr) {
          const q = Math.min(3, Math.max(0, Math.floor(((e.clientX - cr.left) / cr.width) * 4)));
          updateProjectDate(id, QUARTER_DATES[q]);
        }
      } else {
        updateProjectPosition(id, Math.round(curPos.x), Math.round(curPos.y));
      }
    }
  }, [projects, statusOverrides, cursoCount, sqLim]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  function handleSwap(outgoingId: string) {
    if (!impactTarget) return;
    const incoming = impactTarget;
    setImpactTarget(null);
    setStatusOverrides(prev => {
      const next = new Map(prev);
      next.set(incoming.id, "curso");
      next.set(outgoingId, "backlog");
      return next;
    });
    swapSquadStatus(incoming.id, outgoingId);
    const out = projects.find(p => p.id === outgoingId);
    setInfoMsg(`🔄 <strong>${out?.name}</strong> al backlog · <strong>${incoming.name}</strong> en curso.`);
  }

  const cursoProjects = projects.filter(p => (statusOverrides.get(p.id) ?? p.squad_status) === "curso");
  const allDiscarded = [...discarded, ...p0Projects];

  // Slice relationships
  const parentIds = new Set(projects.filter(p => p.parent_id).map(p => p.parent_id as string));

  // Aggregate sprints for parent projects (sum across slices)
  type Aggregate = { total: number; completed: number; count: number };
  const aggregatesMap = new Map<string, Aggregate>();
  Array.from(parentIds).forEach(pid => {
    const slices = projects.filter(p => p.parent_id === pid);
    if (slices.length > 0) {
      aggregatesMap.set(pid, {
        total: slices.reduce((s, p) => s + p.effort_sprints, 0),
        completed: slices.reduce((s, p) => s + (p.sprints_completed ?? 0), 0),
        count: slices.length,
      });
    }
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Capacity bar */}
      <div className="flex items-center gap-3">
        <div className="text-[13px] text-brand-gray flex items-center gap-1">
          <span>En paralelo</span>
        </div>
        <div className="flex-1 max-w-[320px]">
          <div className="flex justify-between text-[13px] text-brand-gray mb-1">
            <span>{cursoCount}/{sqLim} proyectos ({Math.round(capPct)}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${capPct}%`, background: capColor }}
            />
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        id="priori-export-target"
        ref={canvasRef}
        className="relative bg-white border border-gray-200 rounded-xl overflow-hidden"
        style={{ height: CANVAS_H }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #D1D5DB 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            backgroundPosition: "14px 14px",
          }}
        />

        {/* Quarter overlay bands */}
        {quarterOverlay && (
          <>
            {[0, 1, 2, 3].map((q) => (
              <div
                key={q}
                className="absolute inset-y-0 pointer-events-none"
                style={{
                  left: `${q * 25}%`,
                  width: "25%",
                  background: `${Q_BAND_COLORS[q]}26`,
                  borderRight: q < 3 ? "1px dashed rgba(0,0,0,0.2)" : undefined,
                  transition: "opacity 0.5s ease",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: Q_BAND_COLORS[q],
                    opacity: 0.6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {Q_BAND_LABELS[q]}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Central zone — en curso (dynamic size, animated) */}
        <div
          className="absolute pointer-events-none flex flex-col items-center justify-center gap-1"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: dynamicZoneR * 2,
            height: dynamicZoneR * 2,
            borderRadius: "50%",
            border: `2.5px dashed ${isOverLimit ? "#E24B4A" : isDragOver ? "#1D9E75" : "#ccc"}`,
            background: isOverLimit
              ? "rgba(226,75,74,0.06)"
              : isDragOver
              ? "rgba(29,158,117,0.07)"
              : "#F4F4F4",
            transition: "all 0.4s ease",
          }}
        >
          <span className="text-xs font-bold text-brand-gray uppercase tracking-widest">en curso</span>
          <span className="text-xs text-brand-gray">{cursoCount} proyecto{cursoCount !== 1 ? "s" : ""}</span>
          <span className="text-xs text-gray-400">límite: {sqLim}</span>
        </div>

        {/* Slice connection lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={W}
          height={CANVAS_H}
          style={{ overflow: "visible" }}
        >
          {projects.filter(p => p.parent_id).map(slice => {
            const parent = projects.find(p => p.id === slice.parent_id);
            const slicePos = positions.get(slice.id);
            const parentPos = positions.get(parent?.id ?? "");
            if (!parent || !slicePos || !parentPos) return null;
            const sr = bubbleRadius(slice.effort_sprints);
            const pr = bubbleRadius(parent.effort_sprints);
            const x1 = parentPos.x + pr;
            const y1 = parentPos.y + pr;
            const x2 = slicePos.x + sr;
            const y2 = slicePos.y + sr;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const q = computeQuadrant(parent.impact_value, parent.effort_sprints);
            const color = QUADRANT_META[q].color;
            return (
              <g key={slice.id} opacity={0.4}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} strokeDasharray="5 4" />
                <text
                  x={mx} y={my}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={color}
                  fontFamily="var(--font-geist-sans), system-ui, sans-serif"
                >⑂</text>
              </g>
            );
          })}
        </svg>

        {/* Bubbles */}
        {projects.map(project => {
          const pos = positions.get(project.id);
          if (!pos) return null;
          const dlStatus = deadlineStatus(project.production_date);
          const urgencyColor = dlStatus ? DL_COLOR[dlStatus] : DL_COLOR.ok;
          const isBacklog = (statusOverrides.get(project.id) ?? project.squad_status) === "backlog";
          const noDate = !project.production_date;
          const dimmedByHighlight = highlightIds !== null && highlightIds !== undefined && !highlightIds.has(project.id);
          const baseOpacity = quarterOverlay && isBacklog && noDate ? 0.5 : 1;
          const bubbleOpacity = dimmedByHighlight ? Math.min(baseOpacity, 0.25) : baseOpacity;
          const bubbleTransition = quarterOverlay && !isDragging
            ? "left 0.5s ease, top 0.5s ease, opacity 0.3s"
            : undefined;

          return (
            <span key={project.id}>
              <BubbleCard
                project={project}
                onEdit={onEdit}
                urgencyColor={urgencyColor}
                isSlice={!!project.parent_id}
                hasSlices={parentIds.has(project.id)}
                aggregate={aggregatesMap.get(project.id)}
                style={{ left: pos.x, top: pos.y, opacity: bubbleOpacity, transition: bubbleTransition }}
                onMouseDown={readOnly ? undefined : (e) => startDrag(project.id, e)}
                onMouseEnter={(e) => handleBubbleMouseEnter(project.id, e)}
                onMouseLeave={handleBubbleMouseLeave}
                readOnly={readOnly}
                crossLinked={crossLinkedIds?.has(project.id) ?? false}
              />
              {/* Sin fecha badge in overlay mode */}
              {quarterOverlay && isBacklog && noDate && (
                <div
                  className="absolute pointer-events-none select-none"
                  style={{
                    left: pos.x,
                    top: pos.y - 16,
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#999",
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid #ddd",
                    borderRadius: 3,
                    padding: "1px 4px",
                    whiteSpace: "nowrap",
                    transition: bubbleTransition,
                  }}
                >
                  Sin fecha
                </div>
              )}
            </span>
          );
        })}

        {projects.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <p className="text-brand-gray text-sm">No hay proyectos activos.</p>
          </div>
        )}

        {/* Backlog label pill */}
        {projects.some(p => (statusOverrides.get(p.id) ?? p.squad_status) === "backlog") && (
          <div
            className="absolute pointer-events-none select-none"
            style={{
              bottom: 10,
              right: 14,
              fontSize: 12,
              fontWeight: 700,
              color: "#ccc",
              border: "1px dashed #ddd",
              padding: "2px 8px",
              borderRadius: 10,
            }}
          >
            Backlog
          </div>
        )}
      </div>

      {/* Discarded strip */}
      <div className="flex items-center gap-2 flex-wrap border border-dashed border-gray-200 rounded-lg px-4 py-2 min-h-[40px]">
        <span className="text-xs text-gray-400 flex-shrink-0">🚫 Descartadas:</span>
        {allDiscarded.length === 0 && (
          <span className="text-xs text-gray-300">Ninguna por ahora</span>
        )}
        {allDiscarded.map(p => (
          <DiscardedChip key={p.id} project={p} isExplicit={p.status === "discarded"} />
        ))}
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-lg text-xs text-brand-gray min-h-[36px]">
        <span className="text-brand-orange flex-shrink-0">ℹ</span>
        <span dangerouslySetInnerHTML={{ __html: infoMsg }} />
      </div>

      {/* Impact modal */}
      {impactTarget && (
        <ImpactModal
          incoming={impactTarget}
          cursoProjects={cursoProjects}
          allProjects={projects}
          sqLim={sqLim}
          devN={config.devN}
          onSwap={handleSwap}
          onCancel={() => setImpactTarget(null)}
        />
      )}

      {/* Bubble tooltip (fixed position, never clipped by canvas overflow-hidden) */}
      {tooltip && (
        <BubbleTooltip
          project={tooltip.project}
          cx={tooltip.cx}
          ty={tooltip.ty}
          bh={tooltip.bh}
          aggregate={tooltip.aggregate}
        />
      )}
    </div>
  );
}

function DiscardedChip({ project: p, isExplicit }: { project: Project; isExplicit: boolean }) {
  return (
    <span
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
      style={{
        background: isExplicit ? "#FEF3F3" : "#F4F4F4",
        border: `1px solid ${isExplicit ? "#FDDCDC" : "#E5E5E5"}`,
        color: isExplicit ? "#E24B4A" : "#6B6B6B",
      }}
    >
      {p.name}
      {isExplicit && (
        <form action={restoreProject.bind(null, p.id)} style={{ display: "inline" }}>
          <button type="submit" className="text-gray-300 hover:text-gray-500 leading-none ml-0.5" title="Restaurar">↩</button>
        </form>
      )}
    </span>
  );
}

function BubbleTooltip({
  project,
  cx,
  ty,
  bh,
  aggregate,
}: {
  project: Project;
  cx: number;
  ty: number;
  bh: number;
  aggregate?: { total: number; completed: number; count: number };
}) {
  const TOOLTIP_W = 244;
  const TOOLTIP_H = 200;

  const q = computeQuadrant(project.impact_value, project.effort_sprints);
  const m = QUADRANT_META[q];
  const effTotal = aggregate ? aggregate.total : project.effort_sprints;
  const effCompleted = aggregate ? aggregate.completed : (project.sprints_completed ?? 0);
  const progress = effTotal > 0 ? Math.min(1, effCompleted / effTotal) : 0;
  const urg = urgencyLabel(project.production_date);

  // Position above bubble; flip below if near viewport top; clamp horizontally
  let left = Math.round(cx - TOOLTIP_W / 2);
  let top = Math.round(ty - TOOLTIP_H - 10);
  if (top < 8) top = Math.round(ty + bh + 10);
  if (typeof window !== "undefined") {
    left = Math.max(8, Math.min(window.innerWidth - TOOLTIP_W - 8, left));
  }

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: TOOLTIP_W,
        zIndex: 9999,
        background: "#111111",
        color: "#fff",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,.25)",
        pointerEvents: "none",
      }}
    >
      {/* Title */}
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: project.slice_label ? 3 : 6, lineHeight: 1.3 }}>
        {project.name}
      </div>
      {project.slice_label && (
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 5 }}>⑂ Slice {project.slice_label}</div>
      )}

      {/* Quadrant badge */}
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 20,
            background: `${m.color}33`,
            color: m.color,
            border: `1px solid ${m.color}55`,
          }}
        >
          {QUADRANT_EMOJI[q]} {m.priority} {m.label}
        </span>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 7 }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
          {aggregate
            ? `${aggregate.completed} / ${aggregate.total} sp (agregado de ${aggregate.count} slice${aggregate.count !== 1 ? "s" : ""})`
            : `${effCompleted} / ${effTotal} sprints completados`}
          {progress >= 1 && <span style={{ color: "#1D9E75", marginLeft: 4 }}>✓ Completado</span>}
        </div>
        <div style={{ height: 4, background: "#333", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, background: progress >= 1 ? "#1D9E75" : m.color, borderRadius: 2 }} />
        </div>
      </div>

      {/* Stakeholder */}
      {project.stakeholder && (
        <div style={{ fontSize: 11, color: "#ccc", marginBottom: 4 }}>
          👤 {project.stakeholder}
        </div>
      )}

      {/* Production date + urgency */}
      {project.production_date && (
        <div style={{ fontSize: 11, color: "#ccc", marginBottom: project.dependencies ? 4 : 0, display: "flex", alignItems: "center", gap: 6 }}>
          <span>📅 {formatDate(project.production_date)}</span>
          {urg && (
            <span style={{ fontSize: 10, fontWeight: 700, color: urg.color }}>{urg.text}</span>
          )}
        </div>
      )}

      {/* Dependencies */}
      {project.dependencies && (
        <div style={{ fontSize: 11, color: "#ccc" }}>
          🔗 {project.dependencies}
        </div>
      )}
    </div>
  );
}
