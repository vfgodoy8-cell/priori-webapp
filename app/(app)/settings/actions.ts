"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { type AppRole, canManageMembers, ROLE_LABEL } from "@/lib/roles";
import { sendInvitationEmail } from "@/lib/email";

type State = { error: string | null; success?: boolean };

async function getAuthContext() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .single();

  if (!membership) redirect("/onboarding");
  return { user, admin, orgId: membership.organization_id as string, role: membership.role as AppRole };
}

export async function createInvitation(_prev: State, formData: FormData): Promise<State> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canManageMembers(role)) return { error: "Sin permisos para invitar miembros." };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const invRole = (formData.get("role") as string) || "member";

  if (!email) return { error: "El email es requerido." };
  if (!["admin", "member"].includes(invRole)) return { error: "Rol invÃ¡lido." };

  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect("/login");

  // Check if already a pending invite for this email+org
  const { data: pendingInv } = await admin
    .from("invitations")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", email)
    .is("accepted_at", null)
    .single();

  if (pendingInv) return { error: "Ya hay una invitaciÃ³n pendiente para ese email." };

  const token = randomBytes(12).toString("base64url").slice(0, 16);

  const { error } = await admin.from("invitations").insert({
    organization_id: orgId,
    invited_by: user.id,
    email,
    role: invRole,
    token,
  });

  if (error) return { error: error.message };

  // Fetch org name + inviter name for the email
  const [{ data: orgData }, { data: profileData }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", orgId).single(),
    admin.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  await sendInvitationEmail({
    to: email,
    orgName: (orgData as { name: string } | null)?.name ?? "tu equipo",
    roleLabel: ROLE_LABEL[invRole as AppRole],
    token,
    invitedByName: (profileData as { full_name: string | null } | null)?.full_name ?? undefined,
  });

  revalidatePath("/settings/members");
  return { error: null, success: true };
}

export async function cancelInvitation(id: string): Promise<void> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canManageMembers(role)) return;
  await admin.from("invitations").delete().eq("id", id).eq("organization_id", orgId);
  revalidatePath("/settings/members");
}

export async function updateMemberRole(memberId: string, newRole: AppRole): Promise<void> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canManageMembers(role)) return;
  await admin
    .from("organization_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("organization_id", orgId);
  revalidatePath("/settings/members");
}

export async function removeMember(memberId: string): Promise<void> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canManageMembers(role)) return;
  await admin
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", orgId);
  revalidatePath("/settings/members");
}
