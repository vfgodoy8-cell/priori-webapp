export type CapacityStatus = "green" | "yellow" | "orange" | "red";

export type CapacityIndicator = {
  status: CapacityStatus;
  color: string;
  bg: string;
  label: string;
  occupancyPct: number;
  availabilityPct: number;
  display: string; // "2/4 personas (50%)"
};

/**
 * Calcula el semáforo de capacidad de un equipo.
 *
 * Umbrales de ocupación:
 *   < 90%  → verde   (disponibilidad > 10%)
 *  90–95%  → amarillo
 *  95–99%  → naranja
 *  ≥ 100%  → rojo (sobreocupado)
 */
export function computeCapacity(
  used: number,
  available: number
): CapacityIndicator {
  const occupancyPct = available > 0 ? (used / available) * 100 : 100;
  const availabilityPct = 100 - occupancyPct;
  const remaining = available - used;

  let status: CapacityStatus;
  let color: string;
  let bg: string;
  let label: string;

  if (occupancyPct >= 100) {
    status = "red";
    color = "#DC2626";
    bg = "#FEF2F2";
    label = "Sobreocupado";
  } else if (occupancyPct >= 95) {
    status = "orange";
    color = "#E8621A";
    bg = "#FFF4EE";
    label = "Casi lleno";
  } else if (occupancyPct >= 90) {
    status = "yellow";
    color = "#D97706";
    bg = "#FFFBEB";
    label = "Alta ocupación";
  } else {
    status = "green";
    color = "#1D9E75";
    bg = "#F0FBF7";
    label = "Con capacidad";
  }

  const display = `${remaining}/${available} personas (${Math.round(availabilityPct)}%)`;

  return { status, color, bg, label, occupancyPct, availabilityPct, display };
}

/** Dot indicator para usar inline en tablas o cards */
export function capacityDotClass(status: CapacityStatus): string {
  return {
    green: "bg-brand-green",
    yellow: "bg-yellow-500",
    orange: "bg-brand-orange",
    red: "bg-red-600",
  }[status];
}
