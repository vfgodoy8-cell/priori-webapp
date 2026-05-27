-- Shared views: public read-only links with optional expiry
CREATE TABLE IF NOT EXISTS shared_views (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode         TEXT        NOT NULL CHECK (mode IN ('squad', 'cross')),
  token        TEXT        UNIQUE NOT NULL,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shared_views ENABLE ROW LEVEL SECURITY;

-- Org members can read shared views of their org
CREATE POLICY "shared_views_select" ON shared_views
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE profile_id = auth.uid()
    )
  );

-- Org members can create shared views for their org
CREATE POLICY "shared_views_insert" ON shared_views
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE profile_id = auth.uid()
    )
  );

-- Creators can delete their own shared views
CREATE POLICY "shared_views_delete" ON shared_views
  FOR DELETE USING (created_by = auth.uid());
