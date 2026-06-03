import type { RoadmapSegment } from "@/types/database";

export const DAYS_PER_SPRINT = 14; // 1 sprint = 2 semanas

// ── Types ─────────────────────────────────────────────────────────────────────

export type SegmentLayout = {
  segment_id: string;
  start_sprint: number;
  end_sprint: number; // exclusive: start + duration
};

export type ReflowResult = {
  layout: SegmentLayout[];
  hasCycle: boolean;
  cycleIds: string[]; // IDs de segmentos que no pudieron resolverse
};

export type MonthHeader = {
  label: string;       // "Ene 26"
  startSprint: number;
  sprintCount: number;
};

// ── Helpers de tiempo ─────────────────────────────────────────────────────────

// Parsea 'YYYY-MM-DD' (columna date de Supabase) como medianoche local.
// new Date('YYYY-MM-DD') lo interpreta como UTC y puede desfasar un día.
export function parseProductDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Fecha de inicio del sprint N (sprint 0 = start_date del producto).
export function sprintStartDate(productStart: Date, sprint: number): Date {
  const d = new Date(productStart);
  d.setDate(d.getDate() + sprint * DAYS_PER_SPRINT);
  return d;
}

// Sprint al que pertenece una fecha dada (división entera, mínimo 0).
export function dateToSprint(productStart: Date, date: Date): number {
  const diffDays = (date.getTime() - productStart.getTime()) / 86_400_000;
  return Math.max(0, Math.floor(diffDays / DAYS_PER_SPRINT));
}

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// Cabeceras de mes para el eje X del grid.
// Cada sprint se agrupa en el mes de su fecha de inicio.
export function buildMonthHeaders(
  productStart: Date,
  totalSprints: number,
): MonthHeader[] {
  const headers: MonthHeader[] = [];
  let sprint = 0;

  while (sprint < totalSprints) {
    const d = sprintStartDate(productStart, sprint);
    const month = d.getMonth();
    const year = d.getFullYear();
    let count = 0;

    while (sprint + count < totalSprints) {
      const cur = sprintStartDate(productStart, sprint + count);
      if (cur.getMonth() !== month || cur.getFullYear() !== year) break;
      count++;
    }

    if (count === 0) break; // guard

    headers.push({
      label: `${MONTH_NAMES[month]} ${String(year).slice(2)}`,
      startSprint: sprint,
      sprintCount: count,
    });
    sprint += count;
  }

  return headers;
}

// Total de columnas de sprint que debe tener el grid.
// Agrega 2 sprints de margen al final; nunca baja de minSprints (≈ 6 meses).
export function totalDisplaySprints(
  layout: SegmentLayout[],
  minSprints = 13,
): number {
  const max = layout.reduce((acc, s) => Math.max(acc, s.end_sprint), 0);
  return Math.max(max + 2, minSprints);
}

// ── Motor de reflow ───────────────────────────────────────────────────────────

// Calcula start_sprint / end_sprint para cada segmento.
//
// manualMode = true  → usa manual_start_sprint directamente, sin resolver deps.
// manualMode = false → Kahn topological sort + greedy earliest-start scheduling.
//                      Solo resuelve deps intra-producto (IDs presentes en el set).
//                      Segmentos en ciclo se ubican al final como fallback seguro.
export function computeLayout(
  segments: RoadmapSegment[],
  manualMode: boolean,
): ReflowResult {
  if (manualMode) {
    return {
      layout: segments.map((s) => {
        const start = s.manual_start_sprint ?? 0;
        return { segment_id: s.id, start_sprint: start, end_sprint: start + s.duration_sprints };
      }),
      hasCycle: false,
      cycleIds: [],
    };
  }

  const segMap = new Map(segments.map((s) => [s.id, s]));

  // inDegree: cuántos predecesores intra-producto tiene cada nodo
  // successors: dado un nodo, quiénes dependen de él
  const inDegree = new Map<string, number>(segments.map((s) => [s.id, 0]));
  const successors = new Map<string, string[]>(segments.map((s) => [s.id, []]));

  for (const seg of segments) {
    for (const depId of seg.depends_on) {
      if (!segMap.has(depId)) continue; // dep cross-producto → ignorar por ahora
      inDegree.set(seg.id, (inDegree.get(seg.id) ?? 0) + 1);
      successors.get(depId)!.push(seg.id);
    }
  }

  // Cola inicial: nodos sin predecesores
  const queue = segments
    .filter((s) => inDegree.get(s.id) === 0)
    .map((s) => s.id);

  const startSprints = new Map<string, number>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    const seg = segMap.get(id)!;

    // Inicio más temprano = max(end_sprint de cada predecesor resuelto)
    let earliest = 0;
    for (const depId of seg.depends_on) {
      if (!segMap.has(depId)) continue;
      earliest = Math.max(
        earliest,
        (startSprints.get(depId) ?? 0) + segMap.get(depId)!.duration_sprints,
      );
    }
    startSprints.set(id, earliest);

    for (const succId of successors.get(id)!) {
      const next = (inDegree.get(succId) ?? 1) - 1;
      inDegree.set(succId, next);
      if (next === 0) queue.push(succId);
    }
  }

  const processedIds = new Set(startSprints.keys());
  const cycleIds = segments.map((s) => s.id).filter((id) => !processedIds.has(id));

  // Segmentos en ciclo: fallback al final del último segmento resuelto
  const fallbackStart = segments
    .filter((s) => processedIds.has(s.id))
    .reduce((acc, s) => Math.max(acc, (startSprints.get(s.id) ?? 0) + s.duration_sprints), 0);

  const layout: SegmentLayout[] = segments.map((s) => {
    const start = processedIds.has(s.id) ? startSprints.get(s.id)! : fallbackStart;
    return { segment_id: s.id, start_sprint: start, end_sprint: start + s.duration_sprints };
  });

  return { layout, hasCycle: cycleIds.length > 0, cycleIds };
}
