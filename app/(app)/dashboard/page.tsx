import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardHeaderRight } from "./DashboardHeaderRight";
import type { Organization, OrganizationMember, Team, Project, Initiative } from "@/types/database";
import { type AppRole, ROLE_LABEL, ROLE_COLOR, ROLE_BG, ROLE_BORDER } from "@/lib/roles";
import { computeQuadrant, QUADRANT_META } from "@/lib/quadrant";
import { IconLayoutKanban, IconCalendarStats, IconSettings, IconUsers } from "@tabler/icons-react";
import { getRecentActivity } from "@/app/(app)/activity/actions";
import type { ActivityLog, ActivityAction } from "@/lib/activity";
import { ACTION_LABEL } from "@/lib/activity";

export default async function DashboardPage() {
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

  // Fetch profile for greeting
  const { data: profileData } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const firstName = (profileData as { full_name: string | null } | null)?.full_name?.split(" ")[0] ?? null;

  const [{ data: projectsData }, { data: initiativesData }, { data: teamsData }, recentActivity] = await Promise.all([
    admin.from("projects").select("id, impact_value, effort_sprints, squad_status, status").eq("organization_id", org.id).eq("status", "active"),
    admin.from("initiatives").select("id, q_start, duration_quarters, team_ids, team_allocations, status").eq("organization_id", org.id).eq("status", "active"),
    admin.from("teams").select("*").eq("organization_id", org.id).order("sort_order", { ascending: true }),
    getRecentActivity(10),
  ]);

  const projects = (projectsData ?? []) as Pick<Project, "id" | "impact_value" | "effort_sprints" | "squad_status" | "status">[];
  const initiatives = (initiativesData ?? []) as Pick<Initiative, "id" | "q_start" | "duration_quarters" | "team_ids" | "team_allocations" | "status">[];
  const teams = (teamsData ?? []) as Team[];

  // â”€â”€ Squad stats â”€â”€
  const enCurso = projects.filter((p) => p.squad_status === "curso").length;
  const enBacklog = projects.filter((p) => p.squad_status === "backlog").length;

  const quadrantCounts = { p1: 0, p2: 0, p3: 0, p0: 0 };
  for (const p of projects) {
    quadrantCounts[computeQuadrant(p.impact_value, p.effort_sprints)]++;
  }
  const quadrantMax = Math.max(...Object.values(quadrantCounts), 1);

  // â”€â”€ Cross stats â”€â”€
  const onTimeline = initiatives.filter((i) => i.q_start !== null).length;
  const inBacklog = initiatives.filter((i) => i.q_start === null).length;

  // Capacity by quarter: average % across teams
  const Q_LABELS = ["Q1", "Q2", "Q3", "Q4"];
  const capacityByQ = [0, 1, 2, 3].map((q) => {
    if (teams.length === 0) return 0;
    const pcts = [0, 0, 0, 0].map((_, qi) => qi === q ? 1 : 0); void pcts;
    let totalCap = 0;
    let totalUsed = 0;
    for (const team of teams) {
      const qPcts = [team.q1_pct, team.q2_pct, team.q3_pct, team.q4_pct];
      const cap = Math.floor(team.personas * team.proy_per_persona * (qPcts[q] / 100));
      if (cap === 0) continue;
      const used = initiatives.filter((i) => {
        if (i.q_start === null) return false;
        const inQ = i.q_start <= q && i.q_start + i.duration_quarters - 1 >= q;
        if (!inQ) return false;
        return Array.isArray(i.team_ids) && (i.team_ids as string[]).includes(team.id);
      }).length;
      totalCap += cap;
      totalUsed += used;
    }
    if (totalCap === 0) return 0;
    return Math.min(100, Math.round((totalUsed / totalCap) * 100));
  });

  function capColor(pct: number) {
    return pct >= 100 ? "#E24B4A" : pct >= 95 ? "#E8621A" : pct >= 90 ? "#EF9F27" : "#1D9E75";
  }

  const greeting = firstName ? `Hola, ${firstName}` : "Bienvenido";
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
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
          <DashboardHeaderRight orgName={org.name} userEmail={user.email ?? ""} teams={teams} orgId={org.id} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-7">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-brand-gray">{timeGreeting} ·</p>
            <h1 className="text-2xl font-bold text-brand-black">{greeting}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-brand-gray">{org.name}</span>
              <span className="text-gray-200">·</span>
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: ROLE_BG[role], color: ROLE_COLOR[role], border: `1px solid ${ROLE_BORDER[role]}` }}
              >
                {ROLE_LABEL[role]}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/squad"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg bg-brand-orange hover:bg-orange-600 text-white transition"
            >
              <IconLayoutKanban size={15} strokeWidth={2} /> Modo Squad
            </Link>
            <Link
              href="/cross"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white text-brand-gray hover:text-brand-black hover:border-gray-300 transition"
            >
              <IconCalendarStats size={15} strokeWidth={2} /> Modo Cross
            </Link>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Proyectos activos"
            value={projects.length}
            sub={`${enCurso} en curso · ${enBacklog} en backlog`}
            color="#E8621A"
          />
          <StatCard
            label="En curso ahora"
            value={enCurso}
            sub={projects.length > 0 ? `${Math.round((enCurso / projects.length) * 100)}% del total activo` : "â€”"}
            color="#1D9E75"
          />
          <StatCard
            label="Iniciativas del programa"
            value={initiatives.length}
            sub={`${onTimeline} en timeline · ${inBacklog} sin asignar`}
            color="#1E6FC5"
          />
          <StatCard
            label="Equipos configurados"
            value={teams.length}
            sub={teams.length > 0 ? teams.map((t) => t.name.split(" ")[0]).slice(0, 3).join(", ") : "Sin equipos aún"}
            color="#6B6B6B"
          />
        </div>

        {/* Main panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Squad â€” cuadrantes */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-brand-black">Distribución Squad</span>
              <Link href="/squad" className="text-xs text-brand-gray hover:text-brand-orange transition">Ver canvas →</Link>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {projects.length === 0 ? (
                <EmptyState text="Sin proyectos activos aún." cta={{ href: "/squad", label: "Crear primer proyecto →" }} />
              ) : (
                (["p1", "p2", "p3", "p0"] as const).map((q) => {
                  const meta = QUADRANT_META[q];
                  const count = quadrantCounts[q];
                  const pct = Math.round((count / quadrantMax) * 100);
                  return (
                    <div key={q} className="flex items-center gap-3">
                      <div className="w-24 flex-shrink-0 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>
                          {meta.priority}
                        </span>
                        <span className="text-xs text-brand-gray truncate">{meta.label}</span>
                      </div>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: count > 0 ? `${Math.max(4, pct)}%` : "0%", background: meta.color }}
                        />
                      </div>
                      <span className="text-xs font-bold text-brand-black w-5 text-right flex-shrink-0">{count}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cross â€” capacidad */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-brand-black">Capacidad del Programa</span>
              <Link href="/cross" className="text-xs text-brand-gray hover:text-brand-orange transition">Ver timeline →</Link>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {teams.length === 0 ? (
                <EmptyState text="Sin equipos configurados." cta={{ href: "/settings/members", label: "Configurar equipos →" }} />
              ) : initiatives.length === 0 ? (
                <EmptyState text="Sin iniciativas en el programa aún." cta={{ href: "/cross", label: "Agregar iniciativas →" }} />
              ) : (
                capacityByQ.map((pct, qi) => {
                  const col = capColor(pct);
                  return (
                    <div key={qi} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-brand-gray w-6 flex-shrink-0">{Q_LABELS[qi]}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: pct > 0 ? `${Math.max(3, pct)}%` : "0%", background: col }}
                        />
                      </div>
                      <span className="text-xs font-bold w-10 text-right flex-shrink-0" style={{ color: col }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Timeline summary */}
        {initiatives.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
              <span className="text-sm font-bold text-brand-black">Timeline del programa</span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((q) => {
                  const inQ = initiatives.filter((i) => i.q_start !== null && i.q_start <= q && i.q_start + i.duration_quarters - 1 >= q);
                  return (
                    <div key={q} className="flex flex-col gap-2">
                      <div className="text-xs font-bold text-brand-gray text-center">{Q_LABELS[q]}</div>
                      <div
                        className="rounded-lg border border-gray-100 p-2 flex flex-col items-center gap-1 min-h-[52px]"
                        style={{ background: inQ.length > 0 ? "#FFF9F6" : "#FAFAFA" }}
                      >
                        {inQ.length === 0 ? (
                          <span className="text-[10px] text-gray-300 mt-1">vacío</span>
                        ) : (
                          <>
                            <span className="text-xl font-bold text-brand-orange">{inQ.length}</span>
                            <span className="text-[10px] text-brand-gray">iniciativa{inQ.length !== 1 ? "s" : ""}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {inBacklog > 0 && (
                <p className="text-xs text-brand-gray mt-3 text-center">
                  + <span className="font-semibold text-brand-black">{inBacklog}</span> iniciativa{inBacklog !== 1 ? "s" : ""} sin asignar en el backlog
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actividad reciente */}
        {recentActivity.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
              <span className="text-sm font-bold text-brand-black">Actividad reciente</span>
            </div>
            <div className="p-5 flex flex-col gap-0">
              {recentActivity.map((entry, i) => (
                <DashActivityRow key={entry.id} entry={entry} isLast={i === recentActivity.length - 1} />
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickLink
            href="/squad"
            icon={<IconUsers size={22} strokeWidth={1.5} />}
            title="Modo Squad"
            description="Canvas de priorización por Impacto vs Esfuerzo"
            color="#E8621A"
          />
          <QuickLink
            href="/cross"
            icon={<IconCalendarStats size={22} strokeWidth={1.5} />}
            title="Modo Cross"
            description="Timeline Q1—Q4 con capacidad por equipo"
            color="#1E6FC5"
          />
          <QuickLink
            href="/settings/members"
            icon={<IconSettings size={22} strokeWidth={1.5} />}
            title="Equipo"
            description="Miembros, roles e invitaciones"
            color="#6B6B6B"
          />
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-brand-gray uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold text-brand-black leading-none">{value}</span>
      <span className="text-[11px] text-brand-gray leading-tight">{sub}</span>
      <div className="h-0.5 rounded-full mt-1" style={{ background: color, width: "24px" }} />
    </div>
  );
}

function QuickLink({ href, icon, title, description, color }: { href: string; icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 hover:shadow-sm hover:border-gray-200 transition group"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <span className="text-xl mt-0.5">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-brand-black group-hover:text-brand-orange transition">{title}</span>
        <span className="text-xs text-brand-gray leading-snug">{description}</span>
      </div>
    </Link>
  );
}

const ACTION_COLOR: Record<string, string> = {
  created: "#1D9E75", updated: "#1E6FC5", deleted: "#E24B4A",
  placed: "#E8621A", unplaced: "#6B6B6B", discarded: "#E24B4A",
  restored: "#1D9E75", commented: "#6B6B6B",
};

function DashActivityRow({ entry, isLast }: { entry: ActivityLog; isLast: boolean }) {
  const color = ACTION_COLOR[entry.action] ?? "#6B6B6B";
  const label = ACTION_LABEL[entry.action as ActivityAction] ?? entry.action;
  const actor = entry.actor?.full_name ?? "Alguien";
  const initials = actor.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div className={`flex items-start gap-3 py-2.5 ${!isLast ? "border-b border-gray-50" : ""}`}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5" style={{ background: color }}>
        {initials || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-brand-black leading-snug">
          <span className="font-semibold">{actor}</span>{" "}
          <span className="text-brand-gray">{label}</span>{" "}
          <span className="font-medium">{entry.entity_name}</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{timeAgoStatic(entry.created_at)}</p>
      </div>
      <span className="text-[10px] text-gray-300 flex-shrink-0 capitalize">{entry.entity_type}</span>
    </div>
  );
}

function timeAgoStatic(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function EmptyState({ text, cta }: { text: string; cta: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <p className="text-xs text-gray-400">{text}</p>
      <Link href={cta.href} className="text-xs font-semibold text-brand-orange hover:text-orange-600 transition">
        {cta.label}
      </Link>
    </div>
  );
}
