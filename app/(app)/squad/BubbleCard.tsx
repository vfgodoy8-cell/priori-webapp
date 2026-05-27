"use client";

import { useMemo } from "react";
import type { Project } from "@/types/database";
import { computeQuadrant, type Quadrant } from "@/lib/quadrant";

type UrgencyStatus = "green" | "orange" | "red";

function getUrgency(productionDate: string | null): UrgencyStatus {
  if (!productionDate) return "green";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const prod = new Date(productionDate + "T00:00:00");
  const diffDays = Math.floor((prod.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "red";
  if (diffDays <= 30) return "orange";
  return "green";
}

const URGENCY_COLOR: Record<UrgencyStatus, string> = {
  green: "#1D9E75",
  orange: "#E8621A",
  red: "#E24B4A",
};

const RING_COLOR: Record<Quadrant, string> = {
  p1: "#E8621A",
  p2: "#1E6FC5",
  p3: "#B4B2A9",
  p0: "#888888",
};

const BUBBLE_BG: Record<Quadrant, string> = {
  p1: "#FFF4EE",
  p2: "#EAF1FB",
  p3: "#F5F5F5",
  p0: "#F5F5F5",
};

const BUBBLE_LABEL_COLOR: Record<Quadrant, string> = {
  p1: "#E8621A",
  p2: "#1E6FC5",
  p3: "#6B6B6B",
  p0: "#888888",
};

const QUADRANT_LABEL: Record<Quadrant, string> = {
  p1: "P1 Quick Win",
  p2: "P2 Gran Proy.",
  p3: "P3 Iniciativa",
  p0: "P0 Descartada",
};

function getBubble(effort: number) {
  const clamped = Math.max(1, Math.min(24, effort));
  const size = Math.round(72 + (clamped - 1) * 4.2);
  const strokeWidth = Math.round(5 + (clamped - 1) * 0.13);
  return { size, strokeWidth };
}

type Props = {
  project: Project;
  onEdit: (project: Project) => void;
  style?: React.CSSProperties;
  onMouseDown?: (e: React.MouseEvent) => void;
  urgencyColor?: string; // override computed urgency dot color
};

export function BubbleCard({ project, onEdit, style, onMouseDown, urgencyColor: urgencyColorProp }: Props) {
  const quadrant = useMemo(
    () => computeQuadrant(project.impact_value, project.effort_sprints),
    [project.impact_value, project.effort_sprints]
  );

  const { size, strokeWidth } = getBubble(project.effort_sprints);
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - strokeWidth / 2 - 4;
  const circumference = 2 * Math.PI * r;
  const progress = project.effort_sprints > 0
    ? Math.min((project.sprints_completed ?? 0) / project.effort_sprints, 1)
    : 0;
  const dashOffset = circumference * (1 - progress);

  const urgency = useMemo(
    () => getUrgency(project.production_date),
    [project.production_date]
  );
  const dotFill = urgencyColorProp ?? URGENCY_COLOR[urgency];

  const isSmall = size < 95;
  const dotR = isSmall ? 4 : 5;
  const dotCy = cy - r;

  // Proportional font sizes
  const qlFontSize = Math.max(7, Math.round(size * 0.052));
  const nameFontSize = Math.max(8, Math.round(size * 0.065));
  const spFontSize = Math.max(7, Math.round(size * 0.048));

  // Text Y positions (relative to center)
  const qlOffsetY = -size * 0.145;
  const nameOffsetY = isSmall ? -size * 0.055 : size * 0.01;
  const spOffsetY = isSmall ? size * 0.105 : size * 0.14;

  // Name truncation based on inner radius
  const rIn = r - strokeWidth / 2;
  const maxNameChars = Math.max(6, Math.floor((rIn * 1.4) / (nameFontSize * 0.55)));
  const nameText =
    project.name.length > maxNameChars
      ? project.name.slice(0, maxNameChars - 1) + "…"
      : project.name;

  const ringColor = RING_COLOR[quadrant];
  const bg = BUBBLE_BG[quadrant];
  const labelColor = BUBBLE_LABEL_COLOR[quadrant];

  return (
    <div
      className="absolute"
      style={{ ...style, userSelect: "none", cursor: "grab" }}
      onMouseDown={onMouseDown}
      onDoubleClick={() => onEdit(project)}
      title={`${project.name} — doble click para editar`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          display: "block",
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.10))",
          transition: "filter 0.15s",
        }}
      >
        {/* Background fill */}
        <circle cx={cx} cy={cy} r={r + strokeWidth / 2} fill={bg} />

        {/* Ring track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#E8E8E8"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        {progress > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}

        {/* Urgency dot at 12 o'clock */}
        <circle cx={cx} cy={dotCy} r={dotR} fill={dotFill} />

        {/* Quadrant label (only medium / large) */}
        {!isSmall && (
          <text
            x={cx}
            y={cy + qlOffsetY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={qlFontSize}
            fontWeight="600"
            fill={labelColor}
            fontFamily="var(--font-geist-sans), system-ui, sans-serif"
          >
            {QUADRANT_LABEL[quadrant]}
          </text>
        )}

        {/* Project name */}
        <text
          x={cx}
          y={cy + nameOffsetY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={nameFontSize}
          fontWeight="700"
          fill="#111111"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          {nameText}
        </text>

        {/* Sprint progress */}
        <text
          x={cx}
          y={cy + spOffsetY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={spFontSize}
          fill="#6B6B6B"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          {project.sprints_completed ?? 0}/{project.effort_sprints} sp
        </text>
      </svg>
    </div>
  );
}
