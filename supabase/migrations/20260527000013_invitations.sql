CREATE TABLE IF NOT EXISTS invitations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  role            TEXT        NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  token           TEXT        UNIQUE NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Org members can read invitations of their org
CREATE POLICY "invitations_select" ON invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE profile_id = auth.uid()
    )
  );

-- Líder (owner) and Analista (admin) can invite
CREATE POLICY "invitations_insert" ON invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Líder and Analista can cancel invitations
CREATE POLICY "invitations_delete" ON invitations
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
