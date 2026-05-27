"use client";

import { useState, useRef, useEffect } from "react";
import type { Project } from "@/types/database";
import { computeQuadrant, QUADRANT_META, type Quadrant } from "@/lib/quadrant";
import {
  bubbleRadius,
  posIn,
  posOut,
  deadlineStatus,
  DL_COLOR,
  ZONE_R,
  DEFAULT_CONFIG,
} from "@/lib/squad-logic";
import { BubbleCard } from "@/app/(app)/squad/BubbleCard";

type Pos = { x: number; y: number };

const QUADRANT_EMOJI: Record<Quadrant, string> = {
  p1: "🚀", p2: "🏗", p3: "💡", p0: "🚫",
};

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function computePositions(projects: Project[], W: number, H: number): Map<string, Pos> {
  const map = new Map<string, Pos>();
  const inCurso = projects.filter(p => p.squad_status === "curso");
  const inBacklog = projects.filter(p => p.squad_status === "backlog");

  const cursoCount = inCurso.length;
  const dynamicZoneR = Math.min(250, Math.max(100, 100 + cursoCount * 40));

  inCurso.forEach((p, i) => {
    const r = bubbleRadius(p.effort_sprints);
    map.set(p.id, posIn(i, inCurso.length, r, W, H, dynamicZoneR));
  });
  inBacklog.forEach((p, i) => {
    const r = bubbleRadius(p.effort_sprints);
    if (p.canvas_x != null && p.canvas_y != null) {
      map.set(p.id, { x: p.canvas_x, y: p.canvas_y });
    } else {
      map.set(p.id, posOut(i, inBacklog.length, r, W, H, dynamicZoneR));
    }
  });
  return map;
}

type Props = {
  projects: Project[];
};

export function SquadReadOnly({ projects }: Props) {
  const CANVAS_H = 620;
  const canvasRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(800);
  const [positions, setPositions] = useState<Map<string, Pos>>(new Map());
  const [tooltip, setTooltip] = useState<{
    project: Project;
    cx: number;
    ty: number;
    bh: number;
  } | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setW(el.offsetWidth || 800));
    obs.observe(el);
    setW(el.offsetWidth || 800);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setPositions(computePositions(projects, W, CANVAS_H));
  }, [projects, W]);

  const config = DEFAULT_CONFIG;
  const cursoCount = projects.filter(p => p.squad_status === "curso").length;
  const dynamicZoneR = Math.min(250, Math.max(100, 100 + cursoCount * 40));
  const sqLim = config.devN * config.devP;
  const capPct = sqLim > 0 ? Math.min(100, (cursoCount / sqLim) * 100) : 0;
  const capColor = capPct >= 100 ? "#E24B4A" : capPct >= 95 ? "#E8621A" : capPct >= 90 ? "#EF9F27" : "#1D9E75";

  function handleEnter(id: string) {
    const project = projects.find(p => p.id === id);
    const pos = positions.get(id);
    const cr = canvasRef.current?.getBoundingClientRect();
    if (!project || !pos || !cr) return;
    const r = bubbleRadius(project.effort_sprints);
    setTooltip({ project, cx: cr.left + pos.x + r, ty: cr.top + pos.y, bh: r * 2 });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Capacity bar (read-only) */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-brand-gray">En paralelo</span>
        <div className="flex-1 max-w-[320px]">
          <div className="flex justify-between text-[13px] text-brand-gray mb-1">
            <span>{cursoCount}/{sqLim} proyectos ({Math.round(capPct)}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${capPct}%`, background: capColor }} />
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

        {/* Central zone */}
        <div
          className="absolute pointer-events-none flex flex-col items-center justify-center gap-1"
          style={{
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            width: dynamicZoneR * 2, height: dynamicZoneR * 2,
            borderRadius: "50%",
            border: "2.5px dashed #ccc",
            background: "#F4F4F4",
          }}
        >
          <span className="text-xs font-bold text-brand-gray uppercase tracking-widest">en curso</span>
          <span className="text-xs text-brand-gray">{cursoCount} proyecto{cursoCount !== 1 ? "s" : ""}</span>
        </div>

        {/* Bubbles */}
        {projects.filter(p => p.status === "active").map(project => {
          const pos = positions.get(project.id);
          if (!pos) return null;
          const dlStatus = deadlineStatus(project.production_date);
          const urgencyColor = dlStatus ? DL_COLOR[dlStatus] : DL_COLOR.ok;
          return (
            <BubbleCard
              key={project.id}
              project={project}
              onEdit={() => {}}
              urgencyColor={urgencyColor}
              readOnly
              style={{ left: pos.x, top: pos.y }}
              onMouseEnter={() => handleEnter(project.id)}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && <ReadOnlyTooltip {...tooltip} />}
    </div>
  );
}

function ReadOnlyTooltip({ project, cx, ty, bh }: {
  project: Project; cx: number; ty: number; bh: number;
}) {
  const TOOLTIP_W = 230;
  const TOOLTIP_H = 160;
  const q = computeQuadrant(project.impact_value, project.effort_sprints);
  const m = QUADRANT_META[q];

  let left = Math.round(cx - TOOLTIP_W / 2);
  let top = Math.round(ty - TOOLTIP_H - 10);
  if (top < 8) top = Math.round(ty + bh + 10);
  if (typeof window !== "undefined") {
    left = Math.max(8, Math.min(window.innerWidth - TOOLTIP_W - 8, left));
  }

  return (
    <div style={{
      position: "fixed", left, top, width: TOOLTIP_W, zIndex: 9999,
      background: "#111", color: "#fff", borderRadius: 8,
      padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,.25)",
      pointerEvents: "none",
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, lineHeight: 1.3 }}>{project.name}</div>
      <div style={{ marginBottom: 7 }}>
        <span style={{
          display: "inline-flex", gap: 4, fontSize: 11, fontWeight: 700,
          padding: "2px 8px", borderRadius: 20,
          background: `${m.color}33`, color: m.color, border: `1px solid ${m.color}55`,
        }}>
          {QUADRANT_EMOJI[q]} {m.priority} {m.label}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#ccc", marginBottom: 4 }}>
        {project.sprints_completed ?? 0}/{project.effort_sprints} sprints
      </div>
      {project.stakeholder && (
        <div style={{ fontSize: 11, color: "#ccc", marginBottom: 4 }}>👤 {project.stakeholder}</div>
      )}
      {project.production_date && (
        <div style={{ fontSize: 11, color: "#ccc" }}>
          📅 {formatDate(project.production_date)}
        </div>
      )}
    </div>
  );
}
