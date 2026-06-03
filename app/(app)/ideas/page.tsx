import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type AppRole } from "@/lib/roles";
import { LogoutButton } from "@/components/ui/LogoutButton";
import type { Organization, OrganizationMember } from "@/types/database";
import { listIdeas } from "./actions";
import { IdeasView } from "./IdeasView";
import { IconLayoutKanban, IconCalendarStats } from "@tabler/icons-react";

export default async function IdeasPage() {
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
  const { ideas } = await listIdeas();

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
                <span className="uppercase text-brand-gray leading-none" style={{ fontSize: 10, letterSpacing: "0.08em" }}>Transparencia Estratégica</span>
              </div>
            </Link>
            <span className="text-gray-200">|</span>
            <span className="text-sm font-medium text-brand-black">Ideas</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/squad"
              className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-lg bg-white text-brand-gray hover:text-brand-orange hover:border-brand-orange transition"
              style={{ border: "1.5px solid #E5E5E5", borderRadius: 8 }}
            >
              <IconLayoutKanban size={14} strokeWidth={2} /> Modo Squad
            </Link>
            <Link
              href="/cross"
              className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-lg bg-white text-brand-gray hover:text-brand-orange hover:border-brand-orange transition"
              style={{ border: "1.5px solid #E5E5E5", borderRadius: 8 }}
            >
              <IconCalendarStats size={14} strokeWidth={2} /> Modo Cross
            </Link>
            <span className="text-sm text-brand-gray">{org.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <IdeasView ideas={ideas} role={role} />
      </main>
    </div>
  );
}
