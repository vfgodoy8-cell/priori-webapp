"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import type { Comment } from "@/types/database";
import { logActivity } from "@/lib/activity";

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
  return { user, admin, orgId: membership.organization_id as string };
}

export async function addComment(
  entityType: "initiative" | "project",
  entityId: string,
  body: string
): Promise<{ error: string | null }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "El comentario no puede estar vacío." };
  if (trimmed.length > 2000) return { error: "El comentario es demasiado largo." };

  const { user, admin, orgId } = await getAuthContext();

  let insertError: string | null = null;
  if (entityType === "initiative") {
    const { error } = await admin.from("comments").insert({ organization_id: orgId, author_id: user.id, initiative_id: entityId, body: trimmed });
    if (error) insertError = error.message;
  } else {
    const { error } = await admin.from("comments").insert({ organization_id: orgId, author_id: user.id, project_id: entityId, body: trimmed });
    if (error) insertError = error.message;
  }
  if (insertError) return { error: insertError };

  // Fetch entity name for the log
  const nameCol = entityType === "initiative" ? "initiatives" : "projects";
  const { data: entity } = await admin.from(nameCol as "initiatives").select("name").eq("id", entityId).single();
  const entityName = (entity as { name: string } | null)?.name ?? entityId;
  logActivity(admin, orgId, user.id, entityType, entityId, entityName, "commented");

  return { error: null };
}

export async function getComments(
  entityType: "initiative" | "project",
  entityId: string
): Promise<Comment[]> {
  const { admin } = await getAuthContext();

  const col = entityType === "initiative" ? "initiative_id" : "project_id";
  const { data } = await admin
    .from("comments")
    .select("*, author:profiles(full_name)")
    .eq(col, entityId)
    .order("created_at", { ascending: true });

  return (data ?? []) as Comment[];
}

export async function deleteComment(id: string): Promise<void> {
  const { user, admin } = await getAuthContext();
  await admin.from("comments").delete().eq("id", id).eq("author_id", user.id);
}
