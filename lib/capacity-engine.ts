/**
 * Motor de capacidad de Priori — funciones puras, sin Supabase.
 * Recibe datos ya cargados y devuelve resultados; no hace fetch.
 * Compartido por Cross, Roadmap, Dashboard y la vista pública.
 *
 * Principio rector: el % no es una unidad, es un resultado.
 * Cada grupo define capacidad en su unidad nativa; nunca se convierte
 * entre unidades de grupos distintos — solo se compara el %.
 */

import type {
  Group,
  CapacityAdjustment,
  OrgCapacitySettings,
  UnitType,
  ConsolidationPeriod,
} from "@/types/database";

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_CAPACITY_SETTINGS = {
  sprint_weeks: 2,
  hours_per_day: 8,
  workdays_per_week: 5,
  default_unit: "sprints" as UnitType,
  consolidation_period: "sprint" as ConsolidationPeriod,
};

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type OrgCapacitySettingsLike = Partial<
  Pick<
    OrgCapacitySettings,
    | "sprint_weeks"
    | "hours_per_day"
    | "workdays_per_week"
    | "default_unit"
    | "consolidation_period"
  >
>;

export type CapacityResult = {
  unit: UnitType;
  value: number;           // capacidad en unidades nativas del grupo
  effectivePeople: number; // personas × factor de ajustes pct en el período
};

export type CommittedResult = {
  unit: UnitType;
  value: number;
  noData: boolean; // true cuando unit=story_points y no hay datos de SP aún
};

export type AvailabilityResult = {
  occupancyPct: number;    // comprometido/capacidad × 100 (puede superar 100)
  availabilityPct: number; // max(0, 100 − occupancyPct)
  overassigned: boolean;
  noData: boolean;
};

// Rango de fechas computado de un segmento (el caller ejecuta computeLayout antes)
export type SegmentDateRange = {
  groupId: string;       // = team_id del segmento
  fromDate: Date;
  toDate: Date;
  assignedPeople: number;
  durationSprints: number;
};

// Iniciativa con los campos que el motor necesita (subset de Initiative)
export type CrossInitiativeMin = {
  id: string;
  team_ids: string[];
  team_allocations: Record<string, number>;
  q_start: number | null;
  duration_quarters: number;
  status: string;
};

export type GroupAvailability = {
  groupId: string;
  result: AvailabilityResult;
  effectivePeople: number;
};

// ─── Helpers internos ─────────────────────────────────────────────────────────

function s(o: OrgCapacitySettingsLike) {
  return { ...DEFAULT_CAPACITY_SETTINGS, ...o };
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 86400000);
}

function overlapDays(aFrom: Date, aTo: Date, bFrom: Date, bTo: Date): number {
  const start = Math.max(aFrom.getTime(), bFrom.getTime());
  const end = Math.min(aTo.getTime(), bTo.getTime());
  return Math.max(0, (end - start) / 86400000);
}

// ─── resolveUnit ─────────────────────────────────────────────────────────────

/**
 * Sube por parent_id hasta encontrar un grupo con unit != null.
 * Si ningún ancestro tiene unidad, usa orgSettings.default_unit.
 */
export function resolveUnit(
  group: Group,
  ancestorsById: Map<string, Group>,
  orgSettings: OrgCapacitySettingsLike
): UnitType {
  let current: Group | undefined = group;
  while (current) {
    if (current.unit !== null) return current.unit as UnitType;
    current = current.parent_id ? ancestorsById.get(current.parent_id) : undefined;
  }
  return s(orgSettings).default_unit;
}

// ─── Duración en unidades ─────────────────────────────────────────────────────

/** Días laborables en un rango (aproximación por ratio workdays/7) */
export function workingDaysInRange(from: Date, to: Date, orgSettings: OrgCapacitySettingsLike): number {
  return daysBetween(from, to) * (s(orgSettings).workdays_per_week / 7);
}

/** Duración del rango expresada en la unidad dada (solo para unidades de tiempo) */
export function rangeDurationInUnit(
  from: Date,
  to: Date,
  unit: UnitType,
  orgSettings: OrgCapacitySettingsLike
): number {
  const cfg = s(orgSettings);
  const total = daysBetween(from, to);
  switch (unit) {
    case "hours":   return total * (cfg.workdays_per_week / 7) * cfg.hours_per_day;
    case "days":    return total * (cfg.workdays_per_week / 7);
    case "sprints": return total / (cfg.sprint_weeks * 7);
    default:
      // story_points y projects_per_person usan periodsInRange
      return periodsInRange(from, to, cfg.consolidation_period, orgSettings);
  }
}

/** Cantidad de períodos de consolidación en el rango */
export function periodsInRange(
  from: Date,
  to: Date,
  consolidationPeriod: ConsolidationPeriod,
  orgSettings: OrgCapacitySettingsLike
): number {
  const cfg = s(orgSettings);
  const total = daysBetween(from, to);
  switch (consolidationPeriod) {
    case "sprint":  return total / (cfg.sprint_weeks * 7);
    case "month":   return total / 30.44;
    case "quarter": return total / 91.31;
  }
}

/** Rango de fechas de un quarter (0=Q1 … 3=Q4) en un año dado */
export function quarterDateRange(year: number, q: number): { from: Date; to: Date } {
  return {
    from: new Date(year, q * 3, 1),
    to: new Date(year, (q + 1) * 3, 0, 23, 59, 59), // último día del quarter
  };
}

// ─── Personas efectivas ───────────────────────────────────────────────────────

/**
 * Personas del grupo ajustadas por los capacity_adjustments que se solapan con [from, to].
 * - kind='pct': multiplicativo (acumulado), proporcional al solapamiento parcial.
 * - kind='people_delta': aditivo, proporcional al solapamiento parcial.
 */
export function effectivePeopleInRange(
  group: Group,
  adjustments: CapacityAdjustment[],
  from: Date,
  to: Date
): number {
  const totalDays = daysBetween(from, to);
  if (totalDays <= 0) return group.personas;

  const relevant = adjustments.filter((a) => {
    const aFrom = new Date(a.start_date + "T00:00:00");
    const aTo = new Date(a.end_date + "T23:59:59");
    return overlapDays(from, to, aFrom, aTo) > 0;
  });

  let pctFactor = 1.0;
  let peopleDelta = 0;

  for (const adj of relevant) {
    const aFrom = new Date(adj.start_date + "T00:00:00");
    const aTo = new Date(adj.end_date + "T23:59:59");
    const frac = overlapDays(from, to, aFrom, aTo) / totalDays;

    if (adj.kind === "pct") {
      // Reduce el factor solo durante la fracción del período que cubre el ajuste
      pctFactor *= 1 - frac * (1 - adj.value / 100);
    } else {
      peopleDelta += adj.value * frac;
    }
  }

  return Math.max(0, group.personas * pctFactor + peopleDelta);
}

// ─── Capacidad total del grupo ────────────────────────────────────────────────

/**
 * Capacidad de un grupo en el rango [from, to] según su unidad efectiva.
 * Para agregar a un padre: sumar el value de todos los hijos + propio.
 */
export function groupCapacity(
  group: Group,
  ancestorsById: Map<string, Group>,
  adjustments: CapacityAdjustment[],
  orgSettings: OrgCapacitySettingsLike,
  from: Date,
  to: Date
): CapacityResult {
  const unit = resolveUnit(group, ancestorsById, orgSettings);
  const effPeople = effectivePeopleInRange(group, adjustments, from, to);
  const cfg = s(orgSettings);
  let value: number;

  switch (unit) {
    case "hours":
    case "days":
    case "sprints":
      value = effPeople * rangeDurationInUnit(from, to, unit, orgSettings);
      break;
    case "story_points": {
      const periods = periodsInRange(from, to, cfg.consolidation_period, orgSettings);
      value = (group.capacity_per_period ?? 0) * periods;
      break;
    }
    case "projects_per_person":
      // Slots de proyectos = personas × ratio de proyectos por persona
      value = effPeople * (group.capacity_per_period ?? 1);
      break;
  }

  return { unit, value, effectivePeople: effPeople };
}

// ─── Comprometido ─────────────────────────────────────────────────────────────

/**
 * Comprometido de Roadmap: segmentos con rangos de fecha pre-computados
 * (el caller ejecuta computeLayout y convierte sprint → fecha antes de llamar).
 */
export function committedFromSegments(
  groupId: string,
  unit: UnitType,
  orgSettings: OrgCapacitySettingsLike,
  segments: SegmentDateRange[],
  from: Date,
  to: Date
): CommittedResult {
  if (unit === "story_points") {
    // Los segmentos no tienen campo SP todavía
    return { unit, value: 0, noData: true };
  }

  const mine = segments.filter((seg) => seg.groupId === groupId);
  let total = 0;

  for (const seg of mine) {
    const overlap = overlapDays(from, to, seg.fromDate, seg.toDate);
    if (overlap <= 0) continue;
    const segDays = daysBetween(seg.fromDate, seg.toDate);
    if (segDays <= 0) continue;
    const frac = overlap / segDays;

    switch (unit) {
      case "sprints":
        total += seg.durationSprints * frac * seg.assignedPeople;
        break;
      case "hours":
      case "days":
        total += rangeDurationInUnit(seg.fromDate, seg.toDate, unit, orgSettings) * frac * seg.assignedPeople;
        break;
      case "projects_per_person":
        // Cada segmento activo ocupa 1 slot por persona asignada
        total += 1 * seg.assignedPeople * frac;
        break;
    }
  }

  return { unit, value: total, noData: false };
}

/**
 * Comprometido de Cross: iniciativas activas en el rango de fechas dado.
 * Para projects_per_person: cuenta 1 por iniciativa activa (semántica legacy).
 * Para unidades de tiempo: usa team_allocations[groupId] × duración solapada.
 *
 * periodYear: el año del calendario que se está visualizando.
 */
export function committedFromInitiatives(
  groupId: string,
  unit: UnitType,
  initiatives: CrossInitiativeMin[],
  periodYear: number,
  from: Date,
  to: Date
): CommittedResult {
  if (unit === "story_points") {
    return { unit, value: 0, noData: true };
  }

  const active = initiatives.filter(
    (i) =>
      i.status === "active" &&
      i.q_start !== null &&
      Array.isArray(i.team_ids) &&
      i.team_ids.includes(groupId)
  );

  let total = 0;

  for (const ini of active) {
    const iniFrom = new Date(periodYear, ini.q_start! * 3, 1);
    const iniTo = new Date(periodYear, (ini.q_start! + ini.duration_quarters) * 3, 0, 23, 59, 59);
    const overlap = overlapDays(from, to, iniFrom, iniTo);
    if (overlap <= 0) continue;

    if (unit === "projects_per_person") {
      // Semántica original de Cross: cada iniciativa activa cuenta como 1
      total += 1;
    } else {
      const alloc = (ini.team_allocations as Record<string, number>)[groupId] ?? 1;
      total += alloc * rangeDurationInUnit(iniFrom, iniTo, unit, {});
    }
  }

  return { unit, value: total, noData: false };
}

// ─── Disponibilidad ───────────────────────────────────────────────────────────

export function computeAvailability(
  capacity: CapacityResult,
  committed: CommittedResult
): AvailabilityResult {
  if (committed.noData) {
    return { occupancyPct: 0, availabilityPct: 100, overassigned: false, noData: true };
  }
  if (capacity.value <= 0) {
    return { occupancyPct: 100, availabilityPct: 0, overassigned: true, noData: false };
  }
  const occupancyPct = (committed.value / capacity.value) * 100;
  const availabilityPct = Math.max(0, 100 - occupancyPct);
  return {
    occupancyPct,
    availabilityPct,
    overassigned: occupancyPct >= 100,
    noData: false,
  };
}

// ─── Agregación a padres ──────────────────────────────────────────────────────

/**
 * Promedio ponderado de % de disponibilidad de los hijos por effectivePeople.
 * Simplificación v1: permite agregar ramas con unidades distintas sin conversión;
 * lo único comparable entre grupos es el %.
 */
export function aggregateAvailability(children: GroupAvailability[]): AvailabilityResult {
  const withData = children.filter((c) => !c.result.noData && c.effectivePeople > 0);

  if (withData.length === 0) {
    const allNoData = children.every((c) => c.result.noData);
    return { occupancyPct: 0, availabilityPct: 100, overassigned: false, noData: allNoData };
  }

  const totalPeople = withData.reduce((sum, c) => sum + c.effectivePeople, 0);
  const weightedOccupancy =
    withData.reduce((sum, c) => sum + c.result.occupancyPct * c.effectivePeople, 0) / totalPeople;

  const availabilityPct = Math.max(0, 100 - weightedOccupancy);
  return {
    occupancyPct: weightedOccupancy,
    availabilityPct,
    overassigned: weightedOccupancy >= 100,
    noData: false,
  };
}
