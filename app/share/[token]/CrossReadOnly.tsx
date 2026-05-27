import type { Initiative, Team } from "@/types/database";
import { computeQuadrant, QUADRANT_META } from "@/lib/quadrant";

const Q_LABELS = ["Q1", "Q2", "Q3", "Q4"];
const Q_SUB = ["Ene – Mar", "Abr – Jun", "Jul – Sep", "Oct – Dic"];

function teamCap(team: Team, q: number): number {
  const pcts = [team.q1_pct, team.q2_pct, team.q3_pct, team.q4_pct];
  return Math.floor(team.personas * team.proy_per_persona * (pcts[q] / 100));
}

function teamUsed(initiatives: Initiative[], teamId: string, q: number): number {
  return initiatives.filter(
    (i) =>
      i.q_start !== null &&
      i.status === "active" &&
      Array.isArray(i.team_ids) &&
      i.team_ids.includes(teamId) &&
      i.q_start <= q &&
      i.q_start + i.duration_quarters - 1 >= q
  ).length;
}

function capColor(pct: number): string {
  return pct >= 100 ? "#E24B4A" : pct >= 95 ? "#E8621A" : pct >= 90 ? "#EF9F27" : "#1D9E75";
}

type Props = {
  initiatives: Initiative[];
  teams: Team[];
};

export function CrossReadOnly({ initiatives, teams }: Props) {
  const placed = [...initiatives]
    .filter((i) => i.q_start !== null && i.status === "active")
    .sort((a, b) => {
      if (a.q_start! !== b.q_start!) return a.q_start! - b.q_start!;
      return b.duration_quarters - a.duration_quarters;
    });

  const backlog = initiatives.filter((i) => i.q_start === null && i.status === "active");

  return (
    <div className="flex flex-col gap-4">
      {/* Timeline */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* Quarter headers */}
        <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200">
          {Q_LABELS.map((q, qi) => (
            <div key={q} className={`px-4 py-3 flex flex-col gap-0.5 ${qi < 3 ? "border-r border-gray-200" : ""}`}>
              <span className="text-sm font-bold text-brand-black">{q}</span>
              <span className="text-xs text-brand-gray">{Q_SUB[qi]}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div
          className="relative min-h-[200px]"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridAutoFlow: "row", alignContent: "start" }}
        >
          {/* Column dividers */}
          {[0, 1, 2, 3].map((q) => (
            <div
              key={q}
              className="absolute inset-y-0 pointer-events-none"
              style={{ left: `${q * 25}%`, width: "25%", borderRight: q < 3 ? "1px solid #E5E7EB" : undefined }}
            />
          ))}

          {placed.length === 0 && (
            <div className="col-span-4 flex items-center justify-center py-10">
              <p className="text-xs text-gray-300">Sin iniciativas asignadas</p>
            </div>
          )}

          {placed.map((ini) => {
            const qd = QUADRANT_META[computeQuadrant(ini.impact_value, ini.effort_sprints)];
            const tNames = (ini.team_ids ?? [])
              .map((tid) => teams.find((t) => t.id === tid)?.name.split(" ")[0] ?? "?")
              .slice(0, 3);
            const span = Math.min(ini.duration_quarters, 4 - ini.q_start!);
            return (
              <div
                key={ini.id}
                className="rounded-lg p-2.5 border-[1.5px] select-none m-1.5"
                style={{
                  gridColumn: `${ini.q_start! + 1} / span ${span}`,
                  background: qd.bg,
                  borderColor: `${qd.color}55`,
                  borderRight: ini.duration_quarters > 1 ? `2px dashed ${qd.color}99` : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="text-xs font-bold text-brand-black leading-snug">
                    {qd.priority} {ini.name}
                  </div>
                  {ini.duration_quarters > 1 && (
                    <span className="text-[10px] font-bold flex-shrink-0 ml-1" style={{ color: qd.color }}>
                      ↔ {ini.duration_quarters}Q
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-brand-gray mt-1">
                  {ini.stakeholder} · {ini.effort_sprints}sp
                </div>
                {tNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {tNames.map((n) => (
                      <span key={n} className="text-[9px] px-1.5 py-0.5 rounded bg-black/[.07] text-brand-gray font-semibold">
                        {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Capacity table */}
      {teams.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-bold text-brand-black">Capacidad por equipo</span>
            <span className="text-xs text-brand-gray">Verde &lt;90% · Amarillo 90-95% · Naranja 95-99% · Rojo ≥100%</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10px] text-brand-gray uppercase tracking-wide font-semibold px-4 py-2 border-b border-gray-100 min-w-[160px]">Equipo</th>
                  {Q_LABELS.map((q) => (
                    <th key={q} className="text-center text-[10px] text-brand-gray uppercase tracking-wide font-semibold px-3 py-2 border-b border-gray-100">{q}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td className="px-4 py-2 text-xs font-semibold text-brand-black border-b border-gray-50">{team.name}</td>
                    {[0, 1, 2, 3].map((q) => {
                      const cap = teamCap(team, q);
                      const used = teamUsed(initiatives, team.id, q);
                      const pct = cap === 0 ? 0 : Math.min(100, Math.round((used / cap) * 100));
                      const col = capColor(pct);
                      return (
                        <td key={q} className="px-3 py-2 min-w-[90px] border-b border-gray-50" style={used > cap ? { background: "#FEF3F3" } : {}}>
                          <div className="h-1.5 bg-gray-100 rounded-full border border-gray-200 overflow-hidden mb-1">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: col }} />
                          </div>
                          <div className="text-center text-[11px] font-bold" style={{ color: col }}>
                            {used > cap ? "⚠️ " : ""}{used}/{cap} ({pct}%)
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Backlog */}
      {backlog.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-bold text-brand-black">Backlog del Programa</span>
            <span className="text-xs text-brand-gray">{backlog.length} sin asignar</span>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {backlog.map((ini) => {
              const qd = QUADRANT_META[computeQuadrant(ini.impact_value, ini.effort_sprints)];
              return (
                <span
                  key={ini.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] select-none"
                  style={{ background: qd.bg, borderColor: `${qd.color}55`, color: qd.color }}
                >
                  {qd.priority} {ini.name}
                  <span className="opacity-60 text-[10px]"> · {ini.duration_quarters}Q</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
