import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LogoutButton } from "@/components/ui/LogoutButton";
import type { Organization, OrganizationMember } from "@/types/database";
import { type AppRole, ROLE_LABEL, ROLE_COLOR, ROLE_BG, ROLE_BORDER } from "@/lib/roles";

export default async function DashboardPage() {
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

  const role = membership.role as AppRole;

  // Counts for badges
  const [{ count: projectCount }, { count: initiativeCount }] = await Promise.all([
    admin
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("status", "active"),
    admin
      .from("initiatives")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("status", "active"),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-8 rounded-full bg-brand-orange" />
              <div className="h-1.5 w-5 rounded-full bg-brand-orange opacity-65" />
              <div className="h-1.5 w-3 rounded-full bg-brand-orange opacity-30" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-brand-black text-lg leading-none">priori</span>
              <span className="uppercase text-brand-gray leading-none" style={{ fontSize: 10, letterSpacing: "0.08em" }}>Transparencia Estratégica</span>
            </div>
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
              href="/settings/members"
              className="text-sm px-3 py-1.5 rounded-lg bg-white text-brand-gray hover:text-brand-black transition"
              style={{ border: "1.5px solid #E5E5E5", borderRadius: 8 }}
            >
              ⚙ Equipo
            </Link>
            <span className="text-sm text-brand-gray">{org.name}</span>
            <span className="text-xs text-gray-300">|</span>
            <span className="text-sm text-brand-gray">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col gap-1 mb-10">
          <h1 className="text-2xl font-bold text-brand-black">{org.name}</h1>
          <p className="text-brand-gray text-sm flex items-center gap-2">
            <span>Rol:</span>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full"
              style={{
                background: ROLE_BG[role],
                color: ROLE_COLOR[role],
                border: `1px solid ${ROLE_BORDER[role]}`,
              }}
            >
              {ROLE_LABEL[role]}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <Link href="/squad">
            <ModeCard
              icon="👥"
              title="Modo Squad"
              description="Canvas de burbujas con Matriz de Impacto vs Esfuerzo."
              accentColor="#E8621A"
              badge={projectCount != null ? `${projectCount} proyecto${projectCount !== 1 ? "s" : ""} activo${projectCount !== 1 ? "s" : ""}` : undefined}
              badgeColor="#E8621A"
            />
          </Link>
          <Link href="/cross">
            <ModeCard
              icon="📅"
              title="Modo Cross"
              description="Timeline Q1–Q4 con planificación de capacidad por equipo."
              accentColor="#1E6FC5"
              badge={initiativeCount != null ? `${initiativeCount} iniciativa${initiativeCount !== 1 ? "s" : ""}` : undefined}
              badgeColor="#1E6FC5"
            />
          </Link>
        </div>
      </main>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  description,
  accentColor,
  badge,
  badgeColor,
}: {
  icon: string;
  title: string;
  description: string;
  accentColor: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col gap-2 hover:shadow-sm transition cursor-pointer group"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {badge && (
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: `${badgeColor}18`,
              color: badgeColor,
              border: `1px solid ${badgeColor}33`,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <h2
        className="font-bold text-brand-black text-sm group-hover:text-brand-orange transition"
        style={{ color: undefined }}
      >
        {title}
      </h2>
      <p className="text-brand-gray text-xs leading-relaxed">{description}</p>
    </div>
  );
}

