import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Project, Initiative, Team, RoadmapSegment, SharedView, Organization } from "@/types/database";
import { computeQuadrant } from "@/lib/quadrant";
import {
  computeLayout,
  buildMonthHeaders,
  totalDisplaySprints,
  parseProductDate,
  sprintStartDate,
} from "@/lib/roadmap-logic";
import { SquadReadOnly } from "./SquadReadOnly";
import { CrossReadOnly } from "./CrossReadOnly";
import { RoadmapReadOnly } from "./RoadmapReadOnly";

type Props = {
  params: { token: string };
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shared_views")
    .select("mode, organization_id, organizations(name)")
    .eq("token", params.token)
    .single();

  const orgName = (data as { organizations: { name: string } | null } | null)
    ?.organizations?.name ?? "Priori™";
  const modeLabel =
    data?.mode === "squad" ? "Modo Squad" :
    data?.mode === "cross" ? "Modo Cross" :
    "Modo Roadmap";
  const title = `${orgName} — ${modeLabel} · Priori™`;
  const description =
    "Transparencia estratégica para equipos de software. Matriz de Impacto vs Esfuerzo, planificación por Quarters.";

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function SharePage({ params }: Props) {
  const admin = createAdminClient();

  const { data: shareData } = await admin
    .from("shared_views")
    .select("*")
    .eq("token", params.token)
    .single();

  const share = shareData as SharedView | null;
  if (!share) notFound();
  if (share.expires_at && new Date(share.expires_at) < new Date()) notFound();

  const { data: orgData } = await admin
    .from("organizations")
    .select("id, name, created_at")
    .eq("id", share.organization_id)
    .single();

  const org = orgData as Organization | null;
  if (!org) notFound();

  const createdAt = new Date(share.created_at).toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });

  let projects: Project[] = [];
  let initiatives: Initiative[] = [];
  let teams: Team[] = [];

  // ── Roadmap ───────────────────────────────────────────────────────────────────
  type RoadmapData = {
    productName: string;
    channelName: string | null;
    startDate: string;
    estimatedEnd: Date | null;
    teams: Team[];
    segments: RoadmapSegment[];
    layoutMap: Map<string, import("@/lib/roadmap-logic").SegmentLayout>;
    monthHeaders: import("@/lib/roadmap-logic").MonthHeader[];
    totalSprints: number;
    productStart: Date;
    deviations: Array<{ id: string; date: string; reason: string; affected_stakeholders: string | null; status: "open" | "resolved" }>;
  };
  let roadmapData: RoadmapData | null = null;

  if (share.mode === "roadmap") {
    if (!share.product_id) notFound();

    const [
      { data: productData },
      { data: segmentsData },
      { data: allTeamsData },
      { data: deviationsData },
    ] = await Promise.all([
      admin.from("products").select("*").eq("id", share.product_id).single(),
      admin.from("roadmap_segments").select("*").eq("product_id", share.product_id).order("sort_order"),
      admin.from("groups").select("*").eq("organization_id", org.id).order("sort_order"),
      admin
        .from("deviations")
        .select("id, date, reason, affected_stakeholders, status")
        .eq("product_id", share.product_id)
        .order("created_at", { ascending: false }),
    ]);

    if (!productData) notFound();

    const product = productData as import("@/types/database").Product;
    const allTeams = (allTeamsData ?? []) as Team[];
    const segments = (segmentsData ?? []) as RoadmapSegment[];

    // Respetar visible_team_ids del producto
    const vids = product.visible_team_ids;
    const visibleTeams = (!vids || vids.length === 0)
      ? allTeams
      : allTeams.filter((t) => vids.includes(t.id));

    // Nombre del canal
    let channelName: string | null = null;
    if (product.channel_id) {
      const { data: channelData } = await admin
        .from("channels")
        .select("name")
        .eq("id", product.channel_id)
        .single();
      channelName = (channelData as { name: string } | null)?.name ?? null;
    }

    // Layout server-side
    const productStart = parseProductDate(product.start_date);
    const reflow = computeLayout(segments, product.manual_mode, productStart);
    const layoutMap = new Map(reflow.layout.map((l) => [l.segment_id, l]));

    const minSprints = (() => {
      const nextYearStart = new Date(productStart.getFullYear() + 1, 0, 1);
      const diff = Math.round((nextYearStart.getTime() - productStart.getTime()) / (14 * 86_400_000));
      return Math.max(diff + 2, 13);
    })();
    const totalSprintsVal = totalDisplaySprints(reflow.layout, minSprints);
    const monthHeadersVal = buildMonthHeaders(productStart, totalSprintsVal);

    // Fecha de publicación estimada: fin del último segmento del layout
    let estimatedEnd: Date | null = null;
    if (reflow.layout.length > 0) {
      const maxEndSprint = Math.max(...reflow.layout.map((l) => l.end_sprint));
      estimatedEnd = sprintStartDate(productStart, maxEndSprint);
    }

    roadmapData = {
      productName: product.name,
      channelName,
      startDate: product.start_date,
      estimatedEnd,
      teams: visibleTeams,
      segments,
      layoutMap,
      monthHeaders: monthHeadersVal,
      totalSprints: totalSprintsVal,
      productStart,
      deviations: (deviationsData ?? []) as RoadmapData["deviations"],
    };
  }

  // ── Squad / Cross ─────────────────────────────────────────────────────────────
  if (share.mode === "squad") {
    const { data } = await admin
      .from("projects")
      .select("*")
      .eq("organization_id", org.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    const all = (data ?? []) as Project[];
    projects = all.filter(p => computeQuadrant(p.impact_value, p.effort_sprints) !== "p0");
  } else if (share.mode === "cross") {
    const [{ data: tData }, { data: iData }] = await Promise.all([
      admin.from("groups").select("*").eq("organization_id", org.id).order("sort_order"),
      admin.from("initiatives").select("*").eq("organization_id", org.id).eq("status", "active").order("created_at"),
    ]);
    teams = (tData ?? []) as Team[];
    initiatives = (iData ?? []) as Initiative[];
  }

  const modeLabel =
    share.mode === "squad" ? "Modo Squad" :
    share.mode === "cross" ? "Modo Cross" :
    "Modo Roadmap";

  const subtitle =
    share.mode === "roadmap" && roadmapData
      ? roadmapData.productName
      : `${org.name} · Vista de solo lectura`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-8 rounded-full bg-brand-orange" />
              <div className="h-1.5 w-5 rounded-full bg-brand-orange opacity-65" />
              <div className="h-1.5 w-3 rounded-full bg-brand-orange opacity-30" />
            </div>
            <span className="font-bold text-brand-black text-lg leading-none">priori</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-brand-gray">{org.name}</span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-50 text-brand-orange border border-orange-200">
              Vista compartida
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-brand-black">{modeLabel}</h1>
            <p className="text-xs text-brand-gray mt-0.5">{subtitle}</p>
          </div>
          <span className="text-xs font-bold px-4 py-1.5 rounded-full bg-gray-100 text-brand-gray">
            🔒 Solo lectura
          </span>
        </div>

        {share.mode === "squad" && <SquadReadOnly projects={projects} />}
        {share.mode === "cross" && <CrossReadOnly initiatives={initiatives} teams={teams} />}
        {share.mode === "roadmap" && roadmapData && (
          <RoadmapReadOnly {...roadmapData} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-3">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-[11px] text-brand-gray">
          <span>
            Vista de solo lectura compartida por <strong>{org.name}</strong> · Generada el {createdAt}
          </span>
          <span className="font-semibold text-brand-orange">
            Powered by priori™
          </span>
        </div>
      </footer>
    </div>
  );
}
