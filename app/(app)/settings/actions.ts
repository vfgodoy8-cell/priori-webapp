"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { type AppRole, canManageMembers } from "@/lib/roles";

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
  if (!["owner", "admin", "member"].includes(invRole)) return { error: "Rol inválido." };

  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("profile_id",
      (await admin.from("profiles").select("id").eq("id", user.id).single()).data?.id ?? ""
    );

  // Check if already a pending invite for this email+org
  const { data: pendingInv } = await admin
    .from("invitations")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", email)
    .is("accepted_at", null)
    .single();

  if (pendingInv) return { error: "Ya hay una invitación pendiente para ese email." };

  const token = randomBytes(12).toString("base64url").slice(0, 16);

  const { error } = await admin.from("invitations").insert({
    organization_id: orgId,
    invited_by: user.id,
    email,
    role: invRole,
    token,
  });

  if (error) return { error: error.message };

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
