"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Team, Initiative } from "@/types/database";
import { type AppRole, canWrite } from "@/lib/roles";
import { dateToQuarter, quartersBetween } from "@/lib/squad-logic";

type State = { error: string | null };

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

// ── TEAMS ─────────────────────────────────────────────────────────────────

export async function createTeam(_prev: State, formData: FormData): Promise<State> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos: solo Líder o Analista pueden crear equipos." };
  const payload = {
    organization_id: orgId,
    name: (formData.get("name") as string).trim(),
    personas: parseInt(formData.get("personas") as string) || 1,
    proy_per_persona: parseInt(formData.get("proy_per_persona") as string) || 1,
    q1_pct: parseInt(formData.get("q1_pct") as string) || 80,
    q2_pct: parseInt(formData.get("q2_pct") as string) || 80,
    q3_pct: parseInt(formData.get("q3_pct") as string) || 80,
    q4_pct: parseInt(formData.get("q4_pct") as string) || 80,
  };
  if (!payload.name) return { error: "El nombre es requerido." };
  const { error } = await admin.from("teams").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/cross");
  return { error: null };
}

export async function updateTeam(id: string, patch: Partial<Team>): Promise<void> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return;
  await admin.from("teams").update(patch).eq("id", id).eq("organization_id", orgId);
  revalidatePath("/cross");
}

export async function deleteTeam(id: string): Promise<void> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return;
  await admin.from("teams").delete().eq("id", id).eq("organization_id", orgId);
  revalidatePath("/cross");
}

// ── INITIATIVES ───────────────────────────────────────────────────────────

export async function createInitiative(_prev: State, formData: FormData): Promise<State> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos: solo Líder o Analista pueden crear iniciativas." };

  const startDate = (formData.get("start_date") as string) || null;
  const endDate = (formData.get("end_date") as string) || null;
  const allocRaw = formData.get("team_allocations") as string;
  const teamAllocations: Record<string, number> = allocRaw ? JSON.parse(allocRaw) : {};
  const teamIds = Object.keys(teamAllocations).filter((k) => teamAllocations[k] > 0);

  const effortSprints = parseInt(formData.get("effort_sprints") as string) || 1;
  let qStart: number | null = null;
  let durationQuarters = Math.min(4, Math.max(1, Math.ceil(effortSprints / 6)));
  if (startDate) {
    qStart = dateToQuarter(startDate);
    if (endDate) durationQuarters = quartersBetween(startDate, endDate);
  }

  const payload = {
    organization_id: orgId,
    name: (formData.get("name") as string).trim(),
    stakeholder: (formData.get("stakeholder") as string)?.trim() || null,
    impact_value: parseFloat(formData.get("impact_value") as string) || 0,
    impact_metric: ((formData.get("impact_metric") as string) || "revenue") as "revenue" | "customers",
    effort_sprints: effortSprints,
    duration_quarters: durationQuarters,
    q_start: qStart,
    team_ids: teamIds,
    team_allocations: teamAllocations,
    description: (formData.get("description") as string)?.trim() || null,
    sq_project_ids: JSON.parse((formData.get("sq_project_ids") as string) || "[]"),
    start_date: startDate,
    end_date: endDate,
    status: "active" as const,
  };
  if (!payload.name) return { error: "El nombre es requerido." };
  const { error } = await admin.from("initiatives").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/cross");
  return { error: null };
}

export async function updateInitiative(_prev: State, formData: FormData): Promise<State> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos: solo Líder o Analista pueden editar iniciativas." };
  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido." };

  const startDate = (formData.get("start_date") as string) || null;
  const endDate = (formData.get("end_date") as string) || null;
  const allocRaw = formData.get("team_allocations") as string;
  const teamAllocations: Record<string, number> = allocRaw ? JSON.parse(allocRaw) : {};
  const teamIds = Object.keys(teamAllocations).filter((k) => teamAllocations[k] > 0);

  const effortSprints = parseInt(formData.get("effort_sprints") as string) || 1;
  let durationQuarters = Math.min(4, Math.max(1, Math.ceil(effortSprints / 6)));
  const patch: Partial<Initiative> = {
    name: (formData.get("name") as string).trim(),
    stakeholder: (formData.get("stakeholder") as string)?.trim() || null,
    impact_value: parseFloat(formData.get("impact_value") as string) || 0,
    impact_metric: ((formData.get("impact_metric") as string) || "revenue") as "revenue" | "customers",
    effort_sprints: effortSprints,
    team_ids: teamIds,
    team_allocations: teamAllocations,
    description: (formData.get("description") as string)?.trim() || null,
    sq_project_ids: JSON.parse((formData.get("sq_project_ids") as string) || "[]"),
    start_date: startDate,
    end_date: endDate,
  };

  if (startDate) {
    const qStart = dateToQuarter(startDate);
    if (endDate) durationQuarters = quartersBetween(startDate, endDate);
    patch.q_start = qStart;
  }
  patch.duration_quarters = durationQuarters;

  if (!patch.name) return { error: "El nombre es requerido." };
  const { error } = await admin.from("initiatives").update(patch).eq("id", id).eq("organization_id", orgId);
  if (error) return { error: error.message };
  revalidatePath("/cross");
  return { error: null };
}

export async function deleteInitiative(id: string): Promise<void> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return;
  await admin.from("initiatives").delete().eq("id", id).eq("organization_id", orgId);
  revalidatePath("/cross");
}

export async function placeInitiative(id: string, qStart: number): Promise<void> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return;
  await admin.from("initiatives").update({ q_start: qStart }).eq("id", id).eq("organization_id", orgId);
  revalidatePath("/cross");
}

export async function unplaceInitiative(id: string): Promise<void> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return;
  await admin.from("initiatives").update({ q_start: null }).eq("id", id).eq("organization_id", orgId);
  revalidatePath("/cross");
}
