CREATE TABLE public.ai_settings (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider         text NOT NULL DEFAULT 'anthropic' CHECK (provider IN ('anthropic', 'openai', 'azure')),
  api_key          text NOT NULL,
  model_id         text,
  azure_endpoint   text,
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX ai_settings_org_idx ON public.ai_settings(organization_id);
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_settings: select"
  ON public.ai_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = ai_settings.organization_id AND profile_id = auth.uid()
  ));

CREATE POLICY "ai_settings: upsert"
  ON public.ai_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = ai_settings.organization_id
      AND profile_id = auth.uid() AND role IN ('owner', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = ai_settings.organization_id
      AND profile_id = auth.uid() AND role IN ('owner', 'admin')
  ));
