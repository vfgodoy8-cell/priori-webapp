import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LogoutButton } from "@/components/ui/LogoutButton";
import type { Organization, OrganizationMember } from "@/types/database";
import type { Invitation } from "@/types/database";
import { type AppRole } from "@/lib/roles";
import { MembersView } from "./MembersView";

export default async function MembersPage() {
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

  // Fetch all members with profile data
  const { data: membersRaw } = await admin
    .from("organization_members")
    .select("id, profile_id, role, created_at")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: true });

  const members = (membersRaw ?? []) as OrganizationMember[];

  // Fetch profiles for each member
  const profileIds = members.map((m) => m.profile_id);
  const { data: profilesRaw } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", profileIds.length > 0 ? profileIds : [""]);

  const profiles = (profilesRaw ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[];

  // Fetch pending invitations
  const { data: invitationsRaw } = await admin
    .from("invitations")
    .select("*")
    .eq("organization_id", org.id)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  const invitations = (invitationsRaw ?? []) as Invitation[];

  const membersWithProfiles = members.map((m) => ({
    ...m,
    profile: profiles.find((p) => p.id === m.profile_id) ?? null,
    isCurrentUser: m.profile_id === user.id,
  }));

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
            <span className="text-sm font-medium text-brand-black">Configuración del equipo</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-brand-gray">{org.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-1 mb-8">
          <h1 className="text-xl font-bold text-brand-black">Equipo</h1>
          <p className="text-xs text-brand-gray">
            {members.length} miembro{members.length !== 1 ? "s" : ""} · {org.name}
          </p>
        </div>

        <MembersView
          members={membersWithProfiles}
          invitations={invitations}
          currentUserRole={role}
          currentUserId={user.id}
        />
      </main>
    </div>
  );
}
