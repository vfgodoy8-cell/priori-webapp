import { computeQuadrant, QUADRANT_META } from "./quadrant";
import type { Project, Team, Initiative } from "@/types/database";
import type { SquadConfig } from "./squad-logic";

export interface SquadAIContext {
  mode: "squad";
  capacity: { devN: number; devP: number; limit: number; inCourse: number };
  projects: Array<{
    id: string; name: string; quadrant: string; priority: string;
    impact: number; metric: string;
    sprints: number; completed: number; pct: number; status: string;
    stakeholder: string | null; dependencies: string | null;
  }>;
}

export interface CrossAIContext {
  mode: "cross";
  teams: Array<{ id: string; name: string; capacity: number[]; utilization: number[] }>;
  placed: Array<{
    id: string; name: string; priority: string; stakeholder: string | null;
    qStart: number; duration: number; sprintsTotal: number; teams: string[];
  }>;
  backlog: Array<{ id: string; name: string; priority: string; sprints: number }>;
}

export type AIContext = SquadAIContext | CrossAIContext;

export function buildSquadContext(projects: Project[], config: SquadConfig): SquadAIContext {
  const active = projects.filter(p => p.status === "active");
  return {
    mode: "squad",
    capacity: {
      devN: config.devN, devP: config.devP,
      limit: config.devN * config.devP,
      inCourse: active.filter(p => p.squad_status === "curso").length,
    },
    projects: active.map(p => {
      const q = computeQuadrant(p.impact_value, p.effort_sprints);
      const m = QUADRANT_META[q];
      const pct = p.effort_sprints > 0 ? Math.round((p.sprints_completed / p.effort_sprints) * 100) : 0;
      return {
        id: p.id, name: p.name, quadrant: m.label, priority: m.priority,
        impact: p.impact_value, metric: p.impact_metric === "revenue" ? "USD" : "clientes",
        sprints: p.effort_sprints, completed: p.sprints_completed, pct,
        status: p.squad_status === "curso" ? "En curso" : "Backlog",
        stakeholder: p.stakeholder, dependencies: p.dependencies,
      };
    }),
  };
}

export function buildCrossContext(teams: Team[], initiatives: Initiative[]): CrossAIContext {
  const active = initiatives.filter(i => i.status === "active");

  const teamsCtx = teams.map(t => {
    const pcts = [t.q1_pct, t.q2_pct, t.q3_pct, t.q4_pct];
    const caps = pcts.map(pct => Math.floor(t.personas * t.proy_per_persona * (pct / 100)));
    const used = [0, 1, 2, 3].map(q =>
      active.filter(i =>
        i.q_start !== null && Array.isArray(i.team_ids) && i.team_ids.includes(t.id) &&
        i.q_start <= q && i.q_start + i.duration_quarters - 1 >= q
      ).length
    );
    return {
      id: t.id, name: t.name, capacity: caps,
      utilization: caps.map((cap, qi) => cap === 0 ? 0 : Math.round((used[qi] / cap) * 100)),
    };
  });

  const placed = active.filter(i => i.q_start !== null).map(i => {
    const q = computeQuadrant(i.impact_value, i.effort_sprints);
    const m = QUADRANT_META[q];
    const tNames = (i.team_ids ?? []).map(tid => teams.find(t => t.id === tid)?.name ?? tid);
    return {
      id: i.id, name: i.name, priority: m.priority, stakeholder: i.stakeholder,
      qStart: i.q_start!, duration: i.duration_quarters, sprintsTotal: i.effort_sprints,
      teams: tNames,
    };
  });

  const backlog = active.filter(i => i.q_start === null).map(i => {
    const q = computeQuadrant(i.impact_value, i.effort_sprints);
    return { id: i.id, name: i.name, priority: QUADRANT_META[q].priority, sprints: i.effort_sprints };
  });

  return { mode: "cross", teams: teamsCtx, placed, backlog };
}
