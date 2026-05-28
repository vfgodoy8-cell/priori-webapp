"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import type { ActivityLog } from "@/lib/activity";

async function getOrgId(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data } = await admin.from("organization_members").select("organization_id").eq("profile_id", user.id).single();
  if (!data) redirect("/onboarding");
  return (data as { organization_id: string }).organization_id;
}

export async function getEntityActivity(entityId: string): Promise<ActivityLog[]> {
  const orgId = await getOrgId();
  const admin = createAdminClient();
  const { data } = await admin
    .from("activity_log")
    .select("*, actor:profiles(full_name)")
    .eq("organization_id", orgId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as ActivityLog[];
}

export async function getRecentActivity(limit = 15): Promise<ActivityLog[]> {
  const orgId = await getOrgId();
  const admin = createAdminClient();
  const { data } = await admin
    .from("activity_log")
    .select("*, actor:profiles(full_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ActivityLog[];
}
