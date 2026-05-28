"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Project } from "@/types/database";
import { type AppRole, canWrite } from "@/lib/roles";
import { logActivity } from "@/lib/activity";

type State = { error: string | null; success?: boolean };

async function getAuthContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    orgId: membership.organization_id as string,
    role: membership.role as AppRole,
  };
}

export async function createProject(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const { user, admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos: solo Líder o Analista pueden crear proyectos." };

  const payload = {
    organization_id: orgId,
    name: (formData.get("name") as string).trim(),
    description: (formData.get("description") as string)?.trim() || null,
    impact_value: parseFloat(formData.get("impact_value") as string) || 0,
    impact_metric: (formData.get("impact_metric") as string) || "revenue",
    effort_sprints: parseInt(formData.get("effort_sprints") as string) || 1,
    sprints_completed: parseInt(formData.get("sprints_completed") as string) || 0,
    squad_status: ((formData.get("squad_status") as string) || "backlog") as "backlog" | "curso",
    stakeholder: (formData.get("stakeholder") as string)?.trim() || null,
    production_date: (formData.get("production_date") as string) || null,
    dependencies: (formData.get("dependencies") as string)?.trim() || null,
  };

  if (!payload.name) return { error: "El nombre es requerido." };

  const { data, error } = await admin.from("projects").insert(payload).select("id").single();
  if (error) return { error: error.message };

  logActivity(admin, orgId, user.id, "project", (data as { id: string }).id, payload.name, "created");
  revalidatePath("/squad");
  return { error: null };
}

export async function updateProject(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const { user, admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos: solo Líder o Analista pueden editar proyectos." };

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido." };

  const payload: Partial<Project> = {
    name: (formData.get("name") as string).trim(),
    description: (formData.get("description") as string)?.trim() || null,
    impact_value: parseFloat(formData.get("impact_value") as string) || 0,
    impact_metric: (formData.get("impact_metric") as "revenue" | "customers") || "revenue",
    effort_sprints: parseInt(formData.get("effort_sprints") as string) || 1,
    sprints_completed: parseInt(formData.get("sprints_completed") as string) || 0,
    squad_status: ((formData.get("squad_status") as string) || "backlog") as "backlog" | "curso",
    stakeholder: (formData.get("stakeholder") as string)?.trim() || null,
    production_date: (formData.get("production_date") as string) || null,
    dependencies: (formData.get("dependencies") as string)?.trim() || null,
  };

  const { error } = await admin
    .from("projects")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  logActivity(admin, orgId, user.id, "project", id, payload.name ?? id, "updated");
  revalidatePath("/squad");
  return { error: null };
}

export async function discardProject(id: string): Promise<void> {
  const { user, admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return;
  const { data: p } = await admin.from("projects").select("name").eq("id", id).single();
  await admin.from("projects").update({ status: "discarded" }).eq("id", id).eq("organization_id", orgId);
  logActivity(admin, orgId, user.id, "project", id, (p as { name: string } | null)?.name ?? id, "discarded");
  revalidatePath("/squad");
}

export async function restoreProject(id: string): Promise<void> {
  const { user, admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return;
  const { data: p } = await admin.from("projects").select("name").eq("id", id).single();
  await admin.from("projects").update({ status: "active" }).eq("id", id).eq("organization_id", orgId);
  logActivity(admin, orgId, user.id, "project", id, (p as { name: string } | null)?.name ?? id, "restored");
  revalidatePath("/squad");
}

export async function deleteProject(id: string): Promise<void> {
  const { user, admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return;
  const { data: p } = await admin.from("projects").select("name").eq("id", id).single();
  logActivity(admin, orgId, user.id, "project", id, (p as { name: string } | null)?.name ?? id, "deleted");
  await admin.from("projects").delete().eq("id", id).eq("organization_id", orgId);
  revalidatePath("/squad");
}

export async function updateProjectPosition(
  id: string,
  x: number,
  y: number
): Promise<void> {
  const { admin, orgId } = await getAuthContext();
  await admin
    .from("projects")
    .update({ canvas_x: x, canvas_y: y })
    .eq("id", id)
    .eq("organization_id", orgId);
  // No revalidatePath — position is applied optimistically client-side; server confirms on next full action
}

export async function updateSquadStatus(
  id: string,
  squadStatus: "backlog" | "curso"
): Promise<void> {
  const { admin, orgId } = await getAuthContext();
  await admin
    .from("projects")
    .update({ squad_status: squadStatus })
    .eq("id", id)
    .eq("organization_id", orgId);
  revalidatePath("/squad");
}

export async function createSlice(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const { user, admin, orgId } = await getAuthContext();

  const parentId = formData.get("parent_id") as string;
  if (!parentId) return { error: "parent_id requerido." };

  const { data: parent } = await admin
    .from("projects")
    .select("name, impact_value, impact_metric")
    .eq("id", parentId)
    .eq("organization_id", orgId)
    .single();

  if (!parent) return { error: "Proyecto padre no encontrado." };

  const { count } = await admin
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("parent_id", parentId);

  const sliceNum = (count ?? 0) + 1;
  const initial = parent.name.trim()[0]?.toUpperCase() ?? "X";
  const sliceLabel = `${initial}.${sliceNum}`;

  const payload = {
    organization_id: orgId,
    name: `${parent.name} — ${sliceLabel}`,
    parent_id: parentId,
    slice_label: sliceLabel,
    impact_value: parent.impact_value,
    impact_metric: parent.impact_metric as "revenue" | "customers",
    effort_sprints: parseInt(formData.get("effort_sprints") as string) || 1,
    sprints_completed: 0,
    stakeholder: (formData.get("stakeholder") as string)?.trim() || null,
    production_date: (formData.get("production_date") as string) || null,
    squad_status: "backlog" as const,
  };

  const { data: sliceData, error } = await admin.from("projects").insert(payload).select("id").single();
  if (error) return { error: error.message };

  logActivity(admin, orgId, user.id, "project", (sliceData as { id: string }).id, payload.name, "created");
  revalidatePath("/squad");
  return { error: null, success: true };
}

export async function updateProjectDate(
  id: string,
  date: string | null
): Promise<void> {
  const { admin, orgId } = await getAuthContext();
  await admin
    .from("projects")
    .update({ production_date: date })
    .eq("id", id)
    .eq("organization_id", orgId);
  revalidatePath("/squad");
}

export async function swapSquadStatus(
  incomingId: string,
  outgoingId: string
): Promise<void> {
  const { admin, orgId } = await getAuthContext();
  await Promise.all([
    admin.from("projects").update({ squad_status: "curso" }).eq("id", incomingId).eq("organization_id", orgId),
    admin.from("projects").update({ squad_status: "backlog" }).eq("id", outgoingId).eq("organization_id", orgId),
  ]);
  revalidatePath("/squad");
}
