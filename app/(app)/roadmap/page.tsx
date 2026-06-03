import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Organization, OrganizationMember, Team, Product, TeamDependency } from "@/types/database";
import { type AppRole } from "@/lib/roles";
import { RoadmapView } from "./RoadmapView";

export default async function RoadmapPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  const role = membership.role as AppRole;

  const [{ data: teamsData }, { data: productsData }, { data: teamDepsData }] = await Promise.all([
    admin
      .from("teams")
      .select("*")
      .eq("organization_id", org.id)
      .order("sort_order", { ascending: true }),
    admin
      .from("products")
      .select("*")
      .eq("organization_id", org.id)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    admin
      .from("team_dependencies")
      .select("*")
      .eq("organization_id", org.id),
  ]);

  const teams = (teamsData ?? []) as Team[];
  const products = (productsData ?? []) as Product[];
  const teamDeps = (teamDepsData ?? []) as TeamDependency[];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="flex flex-col gap-1">
                <div className="h-1.5 w-8 rounded-full bg-brand-orange" />
                <div className="h-1.5 w-5 rounded-full bg-brand-orange opacity-65" />
                <div className="h-1.5 w-3 rounded-full bg-brand-orange opacity-30" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-brand-black text-lg leading-none">priori</span>
                <span
                  className="uppercase text-brand-gray leading-none"
                  style={{ fontSize: 10, letterSpacing: "0.08em" }}
                >
                  Transparencia Estratégica
                </span>
              </div>
            </Link>
            <span className="text-gray-200">|</span>
            <span className="text-sm font-medium text-brand-black">Modo Roadmap</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/squad"
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-brand-gray hover:text-brand-black hover:border-gray-300 transition"
            >
              Modo Squad
            </Link>
            <Link
              href="/cross"
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-brand-gray hover:text-brand-black hover:border-gray-300 transition"
            >
              Modo Cross
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-brand-black">Modo Roadmap</h1>
            <p className="text-xs text-brand-gray mt-0.5">
              Gantt por producto · Reflow automático por dependencias · {new Date().getFullYear()}
            </p>
          </div>
          <span className="text-xs font-bold px-4 py-1.5 rounded-full bg-orange-50 text-brand-orange border border-orange-200">
            Beta
          </span>
        </div>

        <RoadmapView
          orgId={org.id}
          initialProducts={products}
          teams={teams}
          teamDeps={teamDeps}
          role={role}
        />
      </main>
    </div>
  );
}
