import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SquadView } from "./SquadView";
import { computeQuadrant } from "@/lib/quadrant";
import { LogoutButton } from "@/components/ui/LogoutButton";
import type { OrganizationMember, Organization, Project } from "@/types/database";

export default async function SquadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: membershipData } = await admin
    .from("organization_members")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  const membership = membershipData as OrganizationMember | null;
  if (!membership) redirect("/onboarding");

  const { data: orgData } = await admin
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .single();

  const org = orgData as Organization | null;
  if (!org) redirect("/onboarding");

  const { data: projectsData } = await admin
    .from("projects")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  const all = (projectsData ?? []) as Project[];
  const allActive = all.filter((p) => p.status === "active");
  const discarded = all.filter((p) => p.status === "discarded");

  // Separate p0 projects (active but discarded quadrant — not shown on canvas)
  const p0Projects = allActive.filter(
    (p) => computeQuadrant(p.impact_value, p.effort_sprints) === "p0"
  );
  const projects = allActive.filter(
    (p) => computeQuadrant(p.impact_value, p.effort_sprints) !== "p0"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="flex flex-col gap-1">
                <div className="h-1.5 w-8 rounded-full bg-brand-orange" />
                <div className="h-1.5 w-5 rounded-full bg-brand-orange opacity-65" />
                <div className="h-1.5 w-3 rounded-full bg-brand-orange opacity-30" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-brand-black text-lg leading-none">priori</span>
                <span className="uppercase text-brand-gray leading-none" style={{ fontSize: 10, letterSpacing: "0.08em" }}>Transparencia Estratégica</span>
              </div>
            </Link>
            <span className="text-gray-200">|</span>
            <span className="text-sm font-medium text-brand-black">Modo Squad</span>
          </div>

          {/* Center */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-brand-black leading-none" style={{ fontWeight: 700, fontSize: 14 }}>Estimador de Proyectos</span>
              <span className="text-brand-gray leading-none" style={{ fontSize: 11 }}>Gestión de Capacidad</span>
            </div>
            <span className="leading-none px-2 py-0.5 rounded-full border border-brand-orange text-brand-orange" style={{ fontSize: 11, borderRadius: 20 }}>v2.0</span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <Link
              href="/cross"
              className="text-sm font-bold px-3.5 py-1.5 rounded-lg bg-white text-brand-gray hover:text-brand-orange hover:border-brand-orange transition"
              style={{ border: "1.5px solid #E5E5E5", borderRadius: 8 }}
            >
              📅 Modo Cross →
            </Link>
            <span className="text-sm text-brand-gray">{org.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <SquadView
          projects={projects}
          discarded={discarded}
          p0Projects={p0Projects}
          allActive={allActive}
          orgId={org.id}
        />
      </main>
    </div>
  );
}

