import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Project, Initiative, Team, SharedView, Organization } from "@/types/database";
import { computeQuadrant } from "@/lib/quadrant";
import { SquadReadOnly } from "./SquadReadOnly";
import { CrossReadOnly } from "./CrossReadOnly";

type Props = {
  params: { token: string };
};

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: Props) {
  const admin = createAdminClient();

  // Look up the shared view by token
  const { data: shareData } = await admin
    .from("shared_views")
    .select("*")
    .eq("token", params.token)
    .single();

  const share = shareData as SharedView | null;

  if (!share) notFound();

  // Check expiry
  if (share.expires_at && new Date(share.expires_at) < new Date()) notFound();

  // Fetch org
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

  // Fetch data for the appropriate mode
  let projects: Project[] = [];
  let initiatives: Initiative[] = [];
  let teams: Team[] = [];

  if (share.mode === "squad") {
    const { data } = await admin
      .from("projects")
      .select("*")
      .eq("organization_id", org.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    const all = (data ?? []) as Project[];
    projects = all.filter(p => computeQuadrant(p.impact_value, p.effort_sprints) !== "p0");
  } else {
    const [{ data: tData }, { data: iData }] = await Promise.all([
      admin.from("teams").select("*").eq("organization_id", org.id).order("sort_order"),
      admin.from("initiatives").select("*").eq("organization_id", org.id).eq("status", "active").order("created_at"),
    ]);
    teams = (tData ?? []) as Team[];
    initiatives = (iData ?? []) as Initiative[];
  }

  const modeLabel = share.mode === "squad" ? "Modo Squad" : "Modo Cross";

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
            <p className="text-xs text-brand-gray mt-0.5">{org.name} · Vista de solo lectura</p>
          </div>
          <span className="text-xs font-bold px-4 py-1.5 rounded-full bg-gray-100 text-brand-gray">
            🔒 Solo lectura
          </span>
        </div>

        {share.mode === "squad" && <SquadReadOnly projects={projects} />}
        {share.mode === "cross" && <CrossReadOnly initiatives={initiatives} teams={teams} />}
      </main>

      {/* Footer banner */}
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
