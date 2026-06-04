"use client";

import type { Team, RoadmapSegment } from "@/types/database";
import type { SegmentLayout, MonthHeader } from "@/lib/roadmap-logic";
import { buildQuarterBands } from "./roadmap-utils";

const LABEL_W   = 160;
const SPRINT_PX = 40;

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

const QUARTER_COLORS = [
  { bg: "#EAF1FB", border: "#BDD5F5", text: "#1E6FC5" },
  { bg: "#F0F4F8", border: "#D5DDED", text: "#64748B" },
  { bg: "#EAF1FB", border: "#BDD5F5", text: "#1E6FC5" },
  { bg: "#F0F4F8", border: "#D5DDED", text: "#64748B" },
];

type Props = {
  teams: Team[];
  segments: RoadmapSegment[];
  layoutMap: Map<string, SegmentLayout>;
  monthHeaders: MonthHeader[];
  totalSprints: number;
  productStart: Date;
};

export function GanttReadOnly({ teams, segments, layoutMap, monthHeaders, totalSprints, productStart }: Props) {
  const teamIndexMap = new Map(teams.map((t, i) => [t.id, i]));
  const quarterBands = buildQuarterBands(productStart, totalSprints);
  const minW         = LABEL_W + totalSprints * SPRINT_PX;

  const pct  = (sprint: number) => `${(sprint / totalSprints) * 100}%`;
  const wPct = (sprints: number) => `${(sprints / totalSprints) * 100}%`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <div style={{ minWidth: minW }}>

        {/* Quarters */}
        <div className="flex" style={{ height: 28, borderBottom: "1px solid #E5E7EB" }}>
          <div
            className="flex-shrink-0 bg-gray-50 border-r border-gray-200"
            style={{ width: LABEL_W }}
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
                  <span className="text-xs font-semibold" style={{ color: c.text }}>{band.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Months */}
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
                style={{ left: pct(h.startSprint), width: wPct(h.sprintCount) }}
              >
                <span className="text-xs font-medium text-brand-gray whitespace-nowrap">{h.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team rows */}
        {teams.map((team, idx) => {
          const segment = segments.find((s) => s.team_id === team.id);
          const layout  = segment ? layoutMap.get(segment.id) : null;
          const color   = segmentColor(teamIndexMap.get(team.id) ?? idx);
          const isEven  = idx % 2 === 0;
          const rowBg   = isEven ? "bg-white" : "bg-gray-50/40";

          return (
            <div key={team.id} className={`flex border-b border-gray-100 last:border-b-0 h-14 ${rowBg}`}>
              <div
                className={`flex-shrink-0 flex items-center px-4 border-r border-gray-100 ${rowBg}`}
                style={{ width: LABEL_W }}
              >
                <span className="text-sm font-medium text-brand-black truncate">{team.name}</span>
              </div>

              <div className="flex-1 relative overflow-hidden">
                {monthHeaders.map((h, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-r border-gray-100"
                    style={{ left: pct(h.startSprint), width: wPct(h.sprintCount) }}
                  />
                ))}
                {segment && layout && (
                  <div
                    className="absolute top-2 bottom-2 rounded-lg flex items-center px-3 text-xs font-medium"
                    style={{
                      left: pct(layout.start_sprint),
                      width: `max(${wPct(segment.duration_sprints)}, 40px)`,
                      backgroundColor: color.bg,
                      border: `1.5px solid ${color.border}`,
                      color: color.text,
                    }}
                  >
                    <span className="truncate">
                      {segment.label || `${segment.duration_sprints} sp`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
