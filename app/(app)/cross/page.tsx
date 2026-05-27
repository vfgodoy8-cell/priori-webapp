import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CrossView } from "./CrossView";
import type { OrganizationMember, Organization, Team, Initiative } from "@/types/database";

export default async function CrossPage() {
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

  const [{ data: teamsData }, { data: initiativesData }] = await Promise.all([
    admin
      .from("teams")
      .select("*")
      .eq("organization_id", org.id)
      .order("sort_order", { ascending: true }),
    admin
      .from("initiatives")
      .select("*")
      .eq("organization_id", org.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const teams = (teamsData ?? []) as Team[];
  const initiatives = (initiativesData ?? []) as Initiative[];

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
              <span className="font-bold text-brand-black text-lg">priori</span>
            </Link>
            <span className="text-gray-200">|</span>
            <span className="text-sm font-medium text-brand-black">Modo Cross</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/squad"
              className="text-sm font-bold px-3.5 py-1.5 rounded-lg bg-white text-brand-gray hover:text-brand-orange hover:border-brand-orange transition"
              style={{ border: "1.5px solid #E5E5E5", borderRadius: 8 }}
            >
              👥 Modo Squad →
            </Link>
            <span className="text-sm text-brand-gray">{org.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-brand-black">Planificación del Programa</h1>
            <p className="text-xs text-brand-gray mt-0.5">
              Iniciativas multi-equipo · Capacidad por Quarter · Año 2026
            </p>
          </div>
          <span className="text-xs font-bold px-4 py-1.5 rounded-full bg-orange-50 text-brand-orange border border-orange-200">
            Planificación Anual
          </span>
        </div>

        <CrossView
          orgId={org.id}
          initialTeams={teams}
          initialInitiatives={initiatives}
        />
      </main>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action="/auth/logout" method="post">
      <button
        type="submit"
        className="text-sm text-brand-gray hover:text-brand-black transition"
      >
        Salir
      </button>
    </form>
  );
}
