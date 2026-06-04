import { createAdminClient } from "@/lib/supabase/admin";
import { computeLayout, parseProductDate, sprintStartDate } from "@/lib/roadmap-logic";
import type { RoadmapSegment } from "@/types/database";

export type DeadlineSeverity = "yellow" | "orange" | "red";

export type DeadlineAlert = {
  id: string;
  name: string;
  dueDate: string; // YYYY-MM-DD
  severity: DeadlineSeverity;
  mode: "squad" | "cross" | "roadmap";
  href: string;
};

export const SEVERITY_COLOR: Record<DeadlineSeverity, string> = {
  red:    "#E24B4A",
  orange: "#E8621A",
  yellow: "#EF9F27",
};

export const SEVERITY_LABEL: Record<DeadlineSeverity, string> = {
  red:    "Vencida",
  orange: "Menos de 15 días",
  yellow: "Menos de 1 mes",
};

const SEVERITY_ORDER: Record<DeadlineSeverity, number> = { red: 0, orange: 1, yellow: 2 };

export function getDeadlineSeverity(dateStr: string): DeadlineSeverity | null {
  const [y, m, d] = dateStr.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = (due.getTime() - today.getTime()) / 86_400_000;
  if (diffDays < 0)  return "red";
  if (diffDays < 15) return "orange";
  if (diffDays < 30) return "yellow";
  return null;
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getDeadlineAlerts(orgId: string): Promise<DeadlineAlert[]> {
  const admin = createAdminClient();

  const [{ data: projectsData }, { data: initiativesData }, { data: productsData }] =
    await Promise.all([
      admin
        .from("projects")
        .select("id, name, production_date")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .not("production_date", "is", null),
      admin
        .from("initiatives")
        .select("id, name, end_date")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .not("end_date", "is", null),
      admin
        .from("products")
        .select("id, name, start_date, target_launch_date, manual_mode")
        .eq("organization_id", orgId)
        .eq("status", "active"),
    ]);

  const alerts: DeadlineAlert[] = [];

  // ── Squad ──────────────────────────────────────────────────────────────────
  type ProjRow = { id: string; name: string; production_date: string };
  for (const p of (projectsData ?? []) as ProjRow[]) {
    const severity = getDeadlineSeverity(p.production_date);
    if (severity) alerts.push({ id: p.id, name: p.name, dueDate: p.production_date, severity, mode: "squad", href: "/squad" });
  }

  // ── Cross ──────────────────────────────────────────────────────────────────
  type IniRow = { id: string; name: string; end_date: string };
  for (const i of (initiativesData ?? []) as IniRow[]) {
    const severity = getDeadlineSeverity(i.end_date);
    if (severity) alerts.push({ id: i.id, name: i.name, dueDate: i.end_date, severity, mode: "cross", href: "/cross" });
  }

  // ── Roadmap ────────────────────────────────────────────────────────────────
  type ProdRow = { id: string; name: string; start_date: string; target_launch_date: string | null; manual_mode: boolean };
  const rmProducts = (productsData ?? []) as ProdRow[];
  const withDate    = rmProducts.filter((p) => p.target_launch_date);
  const withoutDate = rmProducts.filter((p) => !p.target_launch_date);

  for (const p of withDate) {
    const severity = getDeadlineSeverity(p.target_launch_date!);
    if (severity) alerts.push({ id: p.id, name: p.name, dueDate: p.target_launch_date!, severity, mode: "roadmap", href: "/roadmap" });
  }

  // Productos sin target_launch_date: calcular fecha fin desde segmentos
  if (withoutDate.length > 0) {
    const { data: segsData } = await admin
      .from("roadmap_segments")
      .select("*")
      .in("product_id", withoutDate.map((p) => p.id))
      .eq("organization_id", orgId);

    const segsByProduct = new Map<string, RoadmapSegment[]>();
    for (const seg of (segsData ?? []) as RoadmapSegment[]) {
      const arr = segsByProduct.get(seg.product_id) ?? [];
      arr.push(seg);
      segsByProduct.set(seg.product_id, arr);
    }

    for (const p of withoutDate) {
      const segs = segsByProduct.get(p.id) ?? [];
      if (segs.length === 0) continue;
      const productStart = parseProductDate(p.start_date);
      const { layout } = computeLayout(segs, p.manual_mode, productStart);
      if (layout.length === 0) continue;
      const lastEnd  = Math.max(...layout.map((l) => l.end_sprint));
      const dueDate  = toLocalDateStr(sprintStartDate(productStart, lastEnd));
      const severity = getDeadlineSeverity(dueDate);
      if (severity) alerts.push({ id: p.id, name: p.name, dueDate, severity, mode: "roadmap", href: "/roadmap" });
    }
  }

  return alerts.sort((a, b) => {
    const sd = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return sd !== 0 ? sd : a.dueDate.localeCompare(b.dueDate);
  });
}
