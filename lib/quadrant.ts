export type Quadrant = "p0" | "p1" | "p2" | "p3";

// Umbrales por defecto (configurables por org en Fase 3)
export const DEFAULT_IMPACT_HIGH = 4_000_000;
export const DEFAULT_EFFORT_HIGH = 8;

export function computeQuadrant(
  impactValue: number,
  effortSprints: number,
  impactHighThreshold = DEFAULT_IMPACT_HIGH,
  effortHighThreshold = DEFAULT_EFFORT_HIGH
): Quadrant {
  const highImpact = impactValue >= impactHighThreshold;
  const highEffort = effortSprints >= effortHighThreshold;

  if (highImpact && !highEffort) return "p1"; // Quick Win
  if (highImpact && highEffort) return "p2";  // Gran Proyecto
  if (!highImpact && !highEffort) return "p3"; // Iniciativa Menor
  return "p0"; // Descartada
}

export const QUADRANT_META: Record<
  Quadrant,
  { label: string; color: string; bg: string; priority: string }
> = {
  p1: {
    label: "Quick Win",
    priority: "P1",
    color: "#1D9E75",
    bg: "#F0FBF7",
  },
  p2: {
    label: "Gran Proyecto",
    priority: "P2",
    color: "#1E6FC5",
    bg: "#EFF6FF",
  },
  p3: {
    label: "Iniciativa Menor",
    priority: "P3",
    color: "#6B6B6B",
    bg: "#F5F5F5",
  },
  p0: {
    label: "Descartada",
    priority: "P0",
    color: "#E8621A",
    bg: "#FFF4EE",
  },
};
