-- Add Google Gemini as supported AI provider
ALTER TABLE public.ai_settings DROP CONSTRAINT IF EXISTS ai_settings_provider_check;
ALTER TABLE public.ai_settings ADD CONSTRAINT ai_settings_provider_check
  CHECK (provider IN ('anthropic', 'openai', 'azure', 'google'));
