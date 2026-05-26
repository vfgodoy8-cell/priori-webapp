import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Organization, OrganizationMember, MemberRole } from "@/types/database";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verificar si el usuario tiene organización
  const { data: membershipData } = await supabase
    .from("organization_members")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  const membership = membershipData as OrganizationMember | null;
  if (!membership) redirect("/onboarding");

  const { data: orgData } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .single();

  const org = orgData as Organization | null;
  if (!org) redirect("/onboarding");

  const role = membership.role as MemberRole;

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
            <span className="font-bold text-brand-black text-lg">priori</span>
          </div>

          <div className="flex items-center gap-4">
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
          <p className="text-brand-gray text-sm">
            Rol:{" "}
            <span className="font-medium text-brand-black capitalize">
              {role}
            </span>
          </p>
        </div>

        {/* Modos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <ModeCard
            title="Modo Squad"
            description="Canvas de burbujas con Matriz de Impacto vs Esfuerzo."
            disabled
          />
          <ModeCard
            title="Modo Programa"
            description="Timeline Q1–Q4 con planificación de capacidad por equipo."
            disabled
          />
        </div>
      </main>
    </div>
  );
}

function ModeCard({
  title,
  description,
  disabled,
}: {
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 p-6 flex flex-col gap-2 ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:border-brand-orange cursor-pointer transition"
      }`}
    >
      <h2 className="font-semibold text-brand-black text-sm">{title}</h2>
      <p className="text-brand-gray text-xs leading-relaxed">{description}</p>
      {disabled && (
        <span className="text-xs text-brand-orange font-medium mt-1">
          Próximamente
        </span>
      )}
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
