"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { type AppRole, canWrite } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import type { Deviation } from "@/types/database";

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

  return {
    user,
    admin,
    orgId: (membership as { organization_id: string; role: string }).organization_id,
    role: (membership as { organization_id: string; role: string }).role as AppRole,
  };
}

export async function createDeviation(input: {
  entityType: "project" | "initiative";
  entityId: string;
  entityName: string;
  date: string;
  reason: string;
  blocking_dependency: string | null;
  affected_dependency: string | null;
}): Promise<{ error?: string; id?: string }> {
  const { user, admin, orgId } = await getAuthContext();

  const payload = {
    organization_id: orgId,
    reported_by: user.id,
    date: input.date,
    reason: input.reason.trim(),
    blocking_dependency: input.blocking_dependency?.trim() || null,
    affected_dependency: input.affected_dependency?.trim() || null,
    status: "open",
    project_id:    input.entityType === "project"    ? input.entityId : null,
    initiative_id: input.entityType === "initiative" ? input.entityId : null,
  };

  const { data, error } = await admin
    .from("deviations")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { error: error.message };

  logActivity(admin, orgId, user.id, input.entityType, input.entityId, input.entityName, "blocked", {
    deviation_id: (data as { id: string }).id,
    reason: input.reason,
  });

  return { id: (data as { id: string }).id };
}

export async function listDeviations(
  entityType: "project" | "initiative",
  entityId: string
): Promise<Deviation[]> {
  const { admin } = await getAuthContext();

  const column = entityType === "project" ? "project_id" : "initiative_id";
  const { data } = await admin
    .from("deviations")
    .select("*, reporter:profiles!reported_by(full_name)")
    .eq(column, entityId)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as Deviation[];
}

export async function resolveDeviation(
  id: string,
  entityType: "project" | "initiative",
  entityId: string,
  entityName: string
): Promise<{ error?: string }> {
  const { user, admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("deviations")
    .update({ status: "resolved" })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  logActivity(admin, orgId, user.id, entityType, entityId, entityName, "unblocked", {
    deviation_id: id,
  });

  return {};
}

export async function deleteDeviation(
  id: string
): Promise<{ error?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("deviations")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  return {};
}
