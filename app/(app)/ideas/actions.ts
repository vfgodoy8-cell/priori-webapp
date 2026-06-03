"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type AppRole, canWrite } from "@/lib/roles";
import type { Idea, IdeaStatus, IdeaSuggestedType } from "@/types/database";

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

export async function createIdea(input: {
  title: string;
  problem: string;
  current_situation: string | null;
  expected_result: string | null;
  suggested_type: IdeaSuggestedType | null;
  raw_transcript: unknown;
}): Promise<{ error?: string; id?: string }> {
  const { user, admin, orgId } = await getAuthContext();

  const { data, error } = await admin
    .from("ideas")
    .insert({
      organization_id: orgId,
      created_by: user.id,
      title: input.title.trim(),
      problem: input.problem.trim(),
      current_situation: input.current_situation ?? null,
      expected_result: input.expected_result ?? null,
      suggested_type: input.suggested_type ?? null,
      raw_transcript: input.raw_transcript,
      status: "raw",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/ideas");
  return { id: (data as { id: string }).id };
}

export async function listIdeas(): Promise<{ ideas: Idea[]; error?: string }> {
  const { admin, orgId } = await getAuthContext();

  const { data, error } = await admin
    .from("ideas")
    .select("*, author:profiles!created_by(full_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return { ideas: [], error: error.message };
  return { ideas: (data ?? []) as unknown as Idea[] };
}

export async function updateIdeaStatus(
  id: string,
  status: IdeaStatus
): Promise<{ error?: string }> {
  const { admin, orgId, role } = await getAuthContext();
  if (!canWrite(role)) return { error: "Sin permisos." };

  const { error } = await admin
    .from("ideas")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/ideas");
  return {};
}
