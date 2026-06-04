// Helpers compartidos entre GanttReadOnly y RoadmapReadOnly

export type QuarterBand = { label: string; startSprint: number; sprintCount: number; q: number };

export function buildQuarterBands(productStart: Date, totalSprints: number): QuarterBand[] {
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
