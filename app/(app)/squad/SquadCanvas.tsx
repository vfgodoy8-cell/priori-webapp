"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Project } from "@/types/database";
import { computeQuadrant } from "@/lib/quadrant";
import {
  bubbleRadius,
  squadLimit,
  posIn,
  posOut,
  deadlineStatus,
  DL_COLOR,
  CAP_COLOR,
  ZONE_R,
  type SquadConfig,
} from "@/lib/squad-logic";
import { BubbleCard } from "./BubbleCard";
import { ImpactModal } from "./ImpactModal";
import { updateSquadStatus, swapSquadStatus, updateProjectPosition, restoreProject } from "./actions";

type Pos = { x: number; y: number };
type SquadStatus = "backlog" | "curso";

function computePositions(
  projects: Project[],
  overrides: Map<string, SquadStatus>,
  W: number,
  H: number
): Map<string, Pos> {
  const map = new Map<string, Pos>();
  const inCurso = projects.filter(p => (overrides.get(p.id) ?? p.squad_status) === "curso");
  const inBacklog = projects.filter(p => (overrides.get(p.id) ?? p.squad_status) === "backlog");

  inCurso.forEach((p, i) => {
    const r = bubbleRadius(p.effort_sprints);
    map.set(p.id, posIn(i, inCurso.length, r, W, H));
  });
  inBacklog.forEach((p, i) => {
    const r = bubbleRadius(p.effort_sprints);
    map.set(p.id, posOut(i, inBacklog.length, r, W, H));
  });
  return map;
}

type Props = {
  projects: Project[];       // active, non-p0
  discarded: Project[];      // status='discarded'
  p0Projects: Project[];     // computed quadrant = p0 but active
  config: SquadConfig;
  onEdit: (p: Project) => void;
};

export function SquadCanvas({ projects, discarded, p0Projects, config, onEdit }: Props) {
  const CANVAS_H = 520;
  const canvasRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<Map<string, Pos>>(new Map());

  const [W, setW] = useState(800);
  const [statusOverrides, setStatusOverrides] = useState<Map<string, SquadStatus>>(new Map());
  const [positions, setPositions] = useState<Map<string, Pos>>(new Map());
  const [isDragOver, setIsDragOver] = useState(false);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [infoMsg, setInfoMsg] = useState("Arrastrá burbujas al círculo para sumarlas al sprint. Doble click para editar.");
  const [impactTarget, setImpactTarget] = useState<Project | null>(null);

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

  // Recompute positions when projects, status or dimensions change
  useEffect(() => {
    const newPositions = computePositions(projects, statusOverrides, W, CANVAS_H);
    setPositions(newPositions);
    posRef.current = newPositions;
  }, [projects, statusOverrides, W]);

  const sqLim = squadLimit(config.devN, config.devP);
  const cursoIds = new Set(
    projects
      .filter(p => (statusOverrides.get(p.id) ?? p.squad_status) === "curso")
      .map(p => p.id)
  );
  const cursoCount = cursoIds.size;
  const capPct = sqLim > 0 ? Math.min(100, (cursoCount / sqLim) * 100) : 0;
  const capColor = CAP_COLOR(capPct);

  // Zone check: is a point inside the central circle?
  function inZone(clientX: number, clientY: number): boolean {
    const cr = canvasRef.current?.getBoundingClientRect();
    if (!cr) return false;
    const zoneCx = cr.left + cr.width / 2;
    const zoneCy = cr.top + cr.height / 2;
    return Math.sqrt((clientX - zoneCx) ** 2 + (clientY - zoneCy) ** 2) < ZONE_R - 10;
  }

  function startDrag(id: string, e: React.MouseEvent) {
    e.preventDefault();
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

    // Zone hover visual
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
    setIsDragOver(false);
    setIsOverLimit(false);

    const project = projects.find(p => p.id === id);
    if (!project) return;

    const inside = inZone(e.clientX, e.clientY);
    const wasCurso = (statusOverrides.get(id) ?? project.squad_status) === "curso";

    if (inside && !wasCurso) {
      // Drop INTO zone
      if (cursoCount >= sqLim) {
        // Over limit: show impact modal, restore position
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
      // Drop OUT of zone
      setStatusOverrides(prev => new Map(prev).set(id, "backlog"));
      updateSquadStatus(id, "backlog");
      setInfoMsg(`⬆️ <strong>${project.name}</strong> movido al backlog.`);
    } else if (curPos) {
      // Free drag within same zone — persist position
      updateProjectPosition(id, Math.round(curPos.x), Math.round(curPos.y));
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

  return (
    <div className="flex flex-col gap-3">
      {/* Capacity bar */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-brand-gray flex items-center gap-1">
          <span>En paralelo</span>
        </div>
        <div className="flex-1 max-w-[220px]">
          <div className="flex justify-between text-xs text-brand-gray mb-1">
            <span>{cursoCount}/{sqLim}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${capPct}%`, background: capColor }}
            />
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
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

        {/* Central zone — en curso */}
        <div
          className="absolute pointer-events-none flex flex-col items-center justify-center gap-1 transition-colors duration-200"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 280,
            height: 280,
            borderRadius: "50%",
            border: `2.5px dashed ${isOverLimit ? "#E24B4A" : isDragOver ? "#1D9E75" : "#ccc"}`,
            background: isOverLimit
              ? "rgba(226,75,74,0.06)"
              : isDragOver
              ? "rgba(29,158,117,0.07)"
              : "#F4F4F4",
          }}
        >
          <span className="text-[10px] font-bold text-brand-gray uppercase tracking-widest">en curso</span>
          <span className="text-xs text-brand-gray">{cursoCount} proyecto{cursoCount !== 1 ? "s" : ""}</span>
          <span className="text-[10px] text-gray-400">límite: {sqLim}</span>
        </div>

        {/* Bubbles */}
        {projects.map(project => {
          const pos = positions.get(project.id);
          if (!pos) return null;
          const dlStatus = deadlineStatus(project.production_date);
          const urgencyColor = dlStatus ? DL_COLOR[dlStatus] : DL_COLOR.ok;

          return (
            <BubbleCard
              key={project.id}
              project={project}
              onEdit={onEdit}
              urgencyColor={urgencyColor}
              style={{ left: pos.x, top: pos.y }}
              onMouseDown={(e) => startDrag(project.id, e)}
            />
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
              fontSize: 10,
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
