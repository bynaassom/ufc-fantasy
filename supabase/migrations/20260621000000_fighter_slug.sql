ALTER TABLE fighters
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE INDEX IF NOT EXISTS idx_fighters_slug ON fighters(slug);
