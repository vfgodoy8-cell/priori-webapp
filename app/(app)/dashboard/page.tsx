import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
            <span className="text-sm text-brand-gray">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col gap-2 mb-10">
          <h1 className="text-2xl font-bold text-brand-black">Dashboard</h1>
          <p className="text-brand-gray text-sm">
            Bienvenido a Priori™. Tu espacio de priorización.
          </p>
        </div>

        {/* Placeholder de modos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <ModeCard
            title="Modo Squad"
            description="Canvas de burbujas con Matriz de Impacto vs Esfuerzo."
            icon="squad"
            disabled
          />
          <ModeCard
            title="Modo Programa"
            description="Timeline Q1–Q4 con planificación de capacidad."
            icon="programa"
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
  icon: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 p-6 flex flex-col gap-2 ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:border-brand-orange cursor-pointer transition"
      }`}
    >
      <h2 className="font-semibold text-brand-black text-sm">{title}</h2>
      <p className="text-brand-gray text-xs leading-relaxed">{description}</p>
      {disabled && (
        <span className="text-xs text-brand-orange font-medium mt-1">Próximamente</span>
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
