-- ============================================================
-- RIVALRIES
-- ============================================================

CREATE TABLE IF NOT EXISTS rivalries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_a_wins INTEGER NOT NULL DEFAULT 0,
  user_b_wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id_a, user_id_b),
  CONSTRAINT different_users CHECK (user_id_a <> user_id_b)
);

ALTER TABLE rivalries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rivalries_select" ON rivalries;
CREATE POLICY "rivalries_select" ON rivalries FOR SELECT USING (true);

DROP POLICY IF EXISTS "rivalries_insert" ON rivalries;
CREATE POLICY "rivalries_insert" ON rivalries FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "rivalries_update" ON rivalries;
CREATE POLICY "rivalries_update" ON rivalries FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_rivalries_user_a ON rivalries(user_id_a);
CREATE INDEX IF NOT EXISTS idx_rivalries_user_b ON rivalries(user_id_b);

-- ============================================================
-- BADGE ARCHIVE (instead of hard delete)
-- ============================================================

ALTER TABLE badges ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS criteria_description TEXT;

DROP POLICY IF EXISTS "badges_select" ON badges;
CREATE POLICY "badges_select" ON badges FOR SELECT USING (
  archived = false OR is_admin()
);
