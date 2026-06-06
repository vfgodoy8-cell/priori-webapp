import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeQuadrant } from "@/lib/quadrant";
import { DEFAULT_CONFIG } from "@/lib/squad-logic";
import { SquadPDF, type PdfProject } from "@/lib/pdf/SquadPDF";
import { CrossPDF, type PdfTeam, type PdfInitiative } from "@/lib/pdf/CrossPDF";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") ?? "squad";

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .single();
  if (!membership) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const orgId = membership.organization_id as string;
  const { data: org } = await admin.from("organizations").select("name").eq("id", orgId).single();
  const orgName = (org as { name: string } | null)?.name ?? "Organizacion";
  const date = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

  let buffer: Buffer;

  if (mode === "cross") {
    const [{ data: teamsData }, { data: inisData }] = await Promise.all([
      admin.from("groups").select("*").eq("organization_id", orgId).order("sort_order"),
      admin.from("initiatives").select("*").eq("organization_id", orgId).eq("status", "active"),
    ]);

    const teams = (teamsData ?? []) as PdfTeam[];
    const initiatives: PdfInitiative[] = ((inisData ?? []) as Array<{
      id: string; name: string; stakeholder: string | null;
      impact_value: number; effort_sprints: number;
      duration_quarters: number; q_start: number | null;
      team_ids: string[];
    }>).map(i => ({
      ...i,
      quadrant: computeQuadrant(i.impact_value, i.effort_sprints),
    }));

    buffer = await (renderToBuffer as CallableFunction)(<CrossPDF orgName={orgName} date={date} teams={teams} initiatives={initiatives} />) as Buffer;
  } else {
    const { data: projectsData } = await admin
      .from("projects")
      .select("*")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .order("created_at");

    const projects: PdfProject[] = ((projectsData ?? []) as Array<{
      id: string; name: string; stakeholder: string | null;
      impact_value: number; impact_metric: "revenue" | "customers";
      effort_sprints: number; sprints_completed: number;
      squad_status: "backlog" | "curso"; parent_id: string | null;
      slice_label: string | null;
    }>).map(p => ({
      ...p,
      quadrant: computeQuadrant(p.impact_value, p.effort_sprints),
    }));

    buffer = await (renderToBuffer as CallableFunction)(<SquadPDF orgName={orgName} date={date} projects={projects} devN={DEFAULT_CONFIG.devN} devP={DEFAULT_CONFIG.devP} />) as Buffer;
  }

  const filename = `priori-${mode}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
