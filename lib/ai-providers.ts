import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI }    from "@ai-sdk/openai";
import { createAzure }     from "@ai-sdk/azure";
import type { LanguageModel } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiProvider, AiSettingsRow } from "@/types/database";

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai:    "gpt-4o",
  azure:     "gpt-4o",
};

export type { AiProvider };
export type { AiSettingsRow as AiSettings };

export async function getAiSettings(orgId: string): Promise<AiSettingsRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_settings")
    .select("*")
    .eq("organization_id", orgId)
    .single();
  return data as AiSettingsRow | null;
}

export function buildLanguageModel(s: AiSettingsRow): LanguageModel {
  const modelId = s.model_id ?? DEFAULT_MODELS[s.provider as AiProvider];
  switch (s.provider) {
    case "anthropic":
      return createAnthropic({ apiKey: s.api_key })(modelId);
    case "openai":
      return createOpenAI({ apiKey: s.api_key })(modelId);
    case "azure":
      return createAzure({ apiKey: s.api_key, baseURL: s.azure_endpoint ?? undefined })(modelId);
    default:
      throw new Error("Unknown AI provider: " + s.provider);
  }
}

export async function getModelForOrg(orgId: string): Promise<LanguageModel> {
  const settings = await getAiSettings(orgId);
  if (!settings) throw new Error("AI no configurada para esta organizacion. Configurala en Settings -> IA.");
  return buildLanguageModel(settings);
}
