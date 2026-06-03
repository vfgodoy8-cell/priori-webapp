"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type AppRole, canWrite } from "@/lib/roles";
import type { Product, RoadmapSegment, TeamDependency } from "@/types/database";

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

// ── PRODUCTS ──────────────────────────────────────────────────────────────────

export async function listProducts(): Promise<{ products: Product[]; error?: string }> {
  const { admin, orgId } = await getAuthContext();
  const { data, error } = await admin
    .from("products")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { products: [], error: error.message };
  return { products: (data ?? []) as Product[] };
}

export async function createProduct(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null; id?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos: solo Líder o Analista pueden crear productos." };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "El nombre es requerido." };

  const { data, error } = await admin
    .from("products")
    .insert({
      organization_id: orgId,
      name,
      description: (formData.get("description") as string)?.trim() || null,
      business_area: (formData.get("business_area") as string)?.trim() || null,
      initiative_id: (formData.get("initiative_id") as string) || null,
      start_date: (formData.get("start_date") as string) || new Date().toISOString().slice(0, 10),
      target_launch_date: (formData.get("target_launch_date") as string) || null,
      manual_mode: formData.get("manual_mode") === "true",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/roadmap");
  return { error: null, id: (data as { id: string }).id };
}

export async function updateProduct(
  id: string,
  patch: Partial<Pick<Product, "name" | "description" | "business_area" | "initiative_id" | "start_date" | "target_launch_date" | "manual_mode" | "sort_order">>,
): Promise<{ error?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("products")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/roadmap");
  return {};
}

export async function discardProduct(id: string): Promise<{ error?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("products")
    .update({ status: "discarded" })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/roadmap");
  return {};
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("products")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/roadmap");
  return {};
}

// ── SEGMENTS ──────────────────────────────────────────────────────────────────

export async function loadProductSegments(
  productId: string,
): Promise<{ segments: RoadmapSegment[]; error?: string }> {
  const { admin, orgId } = await getAuthContext();
  const { data, error } = await admin
    .from("roadmap_segments")
    .select("*")
    .eq("product_id", productId)
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true });
  if (error) return { segments: [], error: error.message };
  return { segments: (data ?? []) as RoadmapSegment[] };
}

export async function addSegment(
  productId: string,
  teamId: string,
  input: { label?: string; duration_sprints?: number; sort_order?: number; start_date?: string | null },
): Promise<{ error?: string; id?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { data, error } = await admin
    .from("roadmap_segments")
    .insert({
      organization_id: orgId,
      product_id: productId,
      team_id: teamId,
      label: input.label ?? "",
      duration_sprints: input.duration_sprints ?? 1,
      sort_order: input.sort_order ?? 0,
      start_date: input.start_date ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/roadmap");
  return { id: (data as { id: string }).id };
}

export async function updateSegment(
  id: string,
  patch: Partial<Pick<RoadmapSegment, "label" | "duration_sprints" | "depends_on" | "manual_start_sprint" | "start_date" | "sort_order">>,
): Promise<{ error?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("roadmap_segments")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/roadmap");
  return {};
}

export async function removeSegment(id: string): Promise<{ error?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("roadmap_segments")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/roadmap");
  return {};
}

// ── TEAM DEPENDENCIES ─────────────────────────────────────────────────────────

export async function listTeamDependencies(): Promise<{ deps: TeamDependency[]; error?: string }> {
  const { admin, orgId } = await getAuthContext();
  const { data, error } = await admin
    .from("team_dependencies")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  if (error) return { deps: [], error: error.message };
  return { deps: (data ?? []) as TeamDependency[] };
}

export async function createTeamDependency(
  teamId: string,
  dependsOnTeamId: string,
  description?: string,
): Promise<{ error?: string; id?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { data, error } = await admin
    .from("team_dependencies")
    .insert({
      organization_id: orgId,
      team_id: teamId,
      depends_on_team_id: dependsOnTeamId,
      description: description?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/roadmap");
  return { id: (data as { id: string }).id };
}

export async function deleteTeamDependency(id: string): Promise<{ error?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("team_dependencies")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/roadmap");
  return {};
}
