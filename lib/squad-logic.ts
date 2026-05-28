// Lógica de posicionamiento del canvas Squad — espejo exacto del priori-estimador-v2.html

export const MAX_SP = 24;
export const MIN_R = 40;
export const MAX_R = 100;
export const ZONE_DIAMETER = 340;
export const ZONE_R = ZONE_DIAMETER / 2;

export type DlLevel = "ok" | "caution" | "danger";

export function bubbleRadius(sp: number): number {
  const s = Math.max(1, Math.min(MAX_SP, sp || 1));
  return MIN_R + ((s - 1) / (MAX_SP - 1)) * (MAX_R - MIN_R);
}

export function squadLimit(devN: number, devP: number): number {
  return devN * devP;
}

// Posición dentro del círculo (en curso) — distribuye en anillo interior
export function posIn(
  index: number,
  total: number,
  r: number,
  W: number,
  H: number,
  zoneR = ZONE_R
): { x: number; y: number } {
  const a = (index / Math.max(total, 1)) * 360 - 90;
  const d = Math.min(zoneR * 0.5, 100);
  const rd = (a * Math.PI) / 180;
  return {
    x: Math.max(4, Math.min(W - r * 2 - 4, W / 2 + Math.cos(rd) * d - r)),
    y: Math.max(4, Math.min(H - r * 2 - 4, H / 2 + Math.sin(rd) * d - r)),
  };
}

// Posición fuera del círculo (backlog) — arco exterior
export function posOut(
  index: number,
  total: number,
  r: number,
  W: number,
  H: number,
  zoneR = ZONE_R
): { x: number; y: number } {
  const rn = Math.max(zoneR + 110, Math.min(W, H) * 0.43);
  const a = -20 + (index / Math.max(total - 1, 1)) * 220;
  const rd = (a * Math.PI) / 180;
  return {
    x: Math.max(4, Math.min(W - r * 2 - 4, W / 2 + Math.cos(rd) * rn - r)),
    y: Math.max(4, Math.min(H - r * 2 - 4, H / 2 + Math.sin(rd) * rn - r)),
  };
}

// Quarter index (0=Q1…3=Q4) from a date string
export function dateToQuarter(date: string | null): number {
  if (!date) return 3;
  const m = new Date(date + "T00:00:00").getMonth();
  if (m < 3) return 0;
  if (m < 6) return 1;
  if (m < 9) return 2;
  return 3;
}

// Number of quarters spanned between two dates (1–4)
export function quartersBetween(startDate: string, endDate: string): number {
  const qs = dateToQuarter(startDate);
  const qe = dateToQuarter(endDate);
  return Math.min(4, Math.max(1, qe - qs + 1));
}

// Position within a quarter band (used for overlay mode)
export function posInBand(
  index: number,
  _total: number,
  r: number,
  W: number,
  H: number,
  bandIndex: number
): { x: number; y: number } {
  const bandW = W / 4;
  const bandLeft = bandIndex * bandW;
  const pad = r + 12;
  const innerW = bandW - 2 * pad;
  const cols = Math.max(1, Math.floor((innerW + 10) / (r * 2 + 10)));
  const row = Math.floor(index / cols);
  const col = index % cols;
  return {
    x: Math.max(4, Math.min(W - r * 2 - 4, bandLeft + pad + col * (r * 2 + 10))),
    y: Math.max(4, Math.min(H - r * 2 - 4, 48 + pad + row * (r * 2 + 14))),
  };
}

export function deadlineStatus(date: string | null): DlLevel | null {
  if (!date) return null;
  const diff = Math.round((new Date(date).getTime() - Date.now()) / 86400000);
  if (diff < 0 || diff <= 14) return "danger";
  if (diff <= 30) return "caution";
  return "ok";
}

export const DL_COLOR: Record<DlLevel, string> = {
  ok: "#1D9E75",
  caution: "#EF9F27",
  danger: "#E24B4A",
};

// Verde <90% · Amarillo 90-95% · Naranja 95-99% · Rojo ≥100%
export const CAP_COLOR = (pct: number) =>
  pct >= 100 ? "#E24B4A" : pct >= 95 ? "#E8621A" : pct >= 90 ? "#EF9F27" : "#1D9E75";

export type SquadConfig = {
  devN: number;
  devP: number;
  metric: "money" | "clients";
  iHigh: number;
  iMid: number;
  eHigh: number;
  eMid: number;
};

export const DEFAULT_CONFIG: SquadConfig = {
  devN: 3,
  devP: 1,
  metric: "money",
  iHigh: 4_000_000,
  iMid: 2_000_000,
  eHigh: 8,
  eMid: 4,
};

export function loadConfig(orgId: string): SquadConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(`priori_cfg_${orgId}`);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(orgId: string, cfg: SquadConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`priori_cfg_${orgId}`, JSON.stringify(cfg));
}
