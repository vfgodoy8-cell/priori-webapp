"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Group, CapacityAdjustment, OrgCapacitySettings } from "@/types/database";
import { type AppRole, canWrite } from "@/lib/roles";
import { getOrgGroupLevelLabels, LEVEL_LABEL_DEFAULT } from "@/lib/group-labels";

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
    orgId: membership.organization_id as string,
    role: membership.role as AppRole,
  };
}

function revalidateAll() {
  revalidatePath("/cross");
  revalidatePath("/roadmap");
  revalidatePath("/dashboard");
}

// ── READS ────────────────────────────────────────────────────────────────────

export async function getGroupsModalMeta(orgId: string): Promise<{
  groups: Group[];
  levelLabels: Record<number, string>;
  orgSettings: OrgCapacitySettings | null;
}> {
  const admin = createAdminClient();

  const [{ data: groupsData }, levelLabels, { data: settingsData }] = await Promise.all([
    admin.from("groups").select("*").eq("organization_id", orgId).order("sort_order"),
    getOrgGroupLevelLabels(orgId),
    admin.from("org_capacity_settings").select("*").eq("organization_id", orgId).maybeSingle(),
  ]);

  return {
    groups: (groupsData ?? []) as Group[],
    levelLabels,
    orgSettings: (settingsData as OrgCapacitySettings | null) ?? null,
  };
}

export async function fetchGroupAdjustments(groupId: string): Promise<CapacityAdjustment[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("capacity_adjustments")
    .select("*")
    .eq("group_id", groupId)
    .order("start_date");
  return (data ?? []) as CapacityAdjustment[];
}

// ── GROUPS CRUD ───────────────────────────────────────────────────────────────

export async function createGroup(data: {
  name: string;
  personas: number;
  parent_id: string | null;
}): Promise<{ error: string | null; id?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  let level = 1;
  if (data.parent_id) {
    const { data: parent } = await admin
      .from("groups")
      .select("level")
      .eq("id", data.parent_id)
      .eq("organization_id", orgId)
      .single();
    if (!parent) return { error: "Grupo padre no encontrado." };
    level = (parent as Group).level + 1;
    if (level > 4) return { error: "Profundidad máxima 4 niveles alcanzada." };
  }

  const { data: row, error } = await admin.from("groups").insert({
    organization_id: orgId,
    name: data.name.trim(),
    personas: data.personas,
    parent_id: data.parent_id,
    level,
  }).select("id").single();

  if (error) return { error: error.message };
  revalidateAll();
  return { error: null, id: (row as { id: string }).id };
}

export async function updateGroupBasic(
  id: string,
  patch: Partial<Pick<Group, "name" | "personas" | "unit" | "capacity_per_period">>
): Promise<{ error: string | null }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("groups")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}

export async function moveGroup(
  id: string,
  newParentId: string | null
): Promise<{ error: string | null }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { data: allGroups } = await admin
    .from("groups")
    .select("id, parent_id, level")
    .eq("organization_id", orgId);
  const groups = (allGroups ?? []) as Pick<Group, "id" | "parent_id" | "level">[];
  const byId = new Map(groups.map((g) => [g.id, g]));

  const self = byId.get(id);
  if (!self) return { error: "Grupo no encontrado." };

  // Cycle check: newParent must not be a descendant of self
  if (newParentId) {
    let cursor = byId.get(newParentId);
    while (cursor) {
      if (cursor.id === id) return { error: "No se puede crear un ciclo en la jerarquía." };
      cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
    }
  }

  const newLevel = newParentId ? (byId.get(newParentId)?.level ?? 0) + 1 : 1;
  if (newLevel > 4) return { error: "Profundidad máxima 4 niveles alcanzada." };

  const levelDelta = newLevel - self.level;

  // Check descendants won't exceed level 4
  const getDescendants = (gid: string): typeof groups => {
    const children = groups.filter((g) => g.parent_id === gid);
    return children.flatMap((c) => [c, ...getDescendants(c.id)]);
  };
  const descendants = getDescendants(id);
  if (descendants.some((d) => d.level + levelDelta > 4)) {
    return { error: "El movimiento excedería la profundidad máxima de 4 niveles en algún descendiente." };
  }

  // Update self
  await admin
    .from("groups")
    .update({ parent_id: newParentId, level: newLevel })
    .eq("id", id)
    .eq("organization_id", orgId);

  // Update descendants
  if (levelDelta !== 0) {
    for (const d of descendants) {
      await admin
        .from("groups")
        .update({ level: d.level + levelDelta })
        .eq("id", d.id)
        .eq("organization_id", orgId);
    }
  }

  revalidateAll();
  return { error: null };
}

export async function deleteGroup(id: string): Promise<{ error: string | null }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("groups")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) {
    // ON DELETE RESTRICT fires when the group has children
    const msg = error.code === "23503"
      ? "No se puede eliminar: el grupo tiene subgrupos. Eliminalos primero."
      : error.message;
    return { error: msg };
  }
  revalidateAll();
  return { error: null };
}

// ── ADJUSTMENTS CRUD ──────────────────────────────────────────────────────────

export async function createAdjustment(data: {
  group_id: string;
  start_date: string;
  end_date: string;
  kind: "pct" | "people_delta";
  value: number;
  note: string | null;
}): Promise<{ error: string | null }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin.from("capacity_adjustments").insert({
    ...data,
    organization_id: orgId,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateAdjustment(
  id: string,
  patch: Partial<Pick<CapacityAdjustment, "start_date" | "end_date" | "kind" | "value" | "note">>
): Promise<{ error: string | null }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("capacity_adjustments")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteAdjustment(id: string): Promise<{ error: string | null }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("capacity_adjustments")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  return { error: null };
}

// ── ORG CAPACITY SETTINGS ─────────────────────────────────────────────────────

export async function upsertOrgCapacitySettings(
  patch: Partial<Pick<OrgCapacitySettings,
    "sprint_weeks" | "hours_per_day" | "workdays_per_week" | "default_unit" | "consolidation_period"
  >>
): Promise<{ error: string | null }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin.from("org_capacity_settings").upsert(
    { organization_id: orgId, ...patch },
    { onConflict: "organization_id" }
  );

  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}

// ── LEVEL LABELS ──────────────────────────────────────────────────────────────

export async function setGroupLevelLabel(
  level: number,
  label: string
): Promise<{ error: string | null }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin.from("org_group_level_labels").upsert(
    { organization_id: orgId, level, label: label.trim() },
    { onConflict: "organization_id,level" }
  );

  if (error) return { error: error.message };
  return { error: null };
}

export async function resetGroupLevelLabel(level: number): Promise<{ error: string | null }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  await admin
    .from("org_group_level_labels")
    .delete()
    .eq("organization_id", orgId)
    .eq("level", level);

  return { error: null };
}
