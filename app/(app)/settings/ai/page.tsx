import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAiSettingsForOrg } from "./actions";
import { AISettingsView } from "./AISettingsView";
import { LogoutButton } from "@/components/ui/LogoutButton";

export default async function AISettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getAiSettingsForOrg();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <div className="h-1.5 w-8 rounded-full bg-brand-orange" />
                <div className="h-1.5 w-5 rounded-full bg-brand-orange opacity-65" />
                <div className="h-1.5 w-3 rounded-full bg-brand-orange opacity-30" />
              </div>
              <span className="font-bold text-brand-black text-lg">priori</span>
            </Link>
            <span className="text-gray-200">|</span>
            <span className="text-sm font-medium text-brand-black">Configuracion IA</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/settings/members" className="text-sm text-brand-gray hover:text-brand-black transition">
              Equipo
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-7">
          <h1 className="text-xl font-bold text-brand-black mb-1">Configuracion de IA</h1>
          <p className="text-sm text-brand-gray">
            Configura el proveedor de IA que usara Priori AI para analisis y asistencia de carga.
            La API key se guarda de forma segura y nunca se expone al cliente.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <AISettingsView current={current} />
        </div>
      </main>
    </div>
  );
}
