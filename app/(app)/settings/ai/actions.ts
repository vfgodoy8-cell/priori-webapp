"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AiProvider } from "@/types/database";

type State = { error: string | null; success?: boolean };

async function getAuthContext() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: m } = await admin.from("organization_members")
    .select("organization_id, role").eq("profile_id", user.id).single();
  if (!m) redirect("/onboarding");
  return { admin, orgId: m.organization_id as string, role: m.role as string };
}

export async function saveAiSettings(_prev: State, formData: FormData): Promise<State> {
  const { admin, orgId, role } = await getAuthContext();
  if (!["owner", "admin"].includes(role))
    return { error: "Solo Owner o Admin pueden configurar la IA." };

  const provider = formData.get("provider") as AiProvider;
  const api_key  = (formData.get("api_key") as string)?.trim();
  const model_id = (formData.get("model_id") as string)?.trim() || null;
  const azure_endpoint = (formData.get("azure_endpoint") as string)?.trim() || null;

  if (!api_key) return { error: "La API key es requerida." };
  if (!["anthropic", "openai", "azure"].includes(provider))
    return { error: "Proveedor invalido." };

  const { error } = await admin.from("ai_settings").upsert({
    organization_id: orgId, provider, api_key, model_id, azure_endpoint,
    updated_at: new Date().toISOString(),
  }, { onConflict: "organization_id" });

  if (error) return { error: error.message };
  revalidatePath("/settings/ai");
  return { error: null, success: true };
}

export async function getAiSettingsForOrg(): Promise<{
  provider: AiProvider; model_id: string | null; azure_endpoint: string | null;
  configured: boolean;
} | null> {
  const { admin, orgId } = await getAuthContext();
  const { data } = await admin.from("ai_settings")
    .select("provider, model_id, azure_endpoint").eq("organization_id", orgId).single();
  if (!data) return { provider: "anthropic", model_id: null, azure_endpoint: null, configured: false };
  return { ...(data as { provider: AiProvider; model_id: string | null; azure_endpoint: string | null }), configured: true };
}
