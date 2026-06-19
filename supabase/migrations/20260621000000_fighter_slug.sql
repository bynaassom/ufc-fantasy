ALTER TABLE fighters
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fighters_slug_unique ON fighters(slug) WHERE slug IS NOT NULL;
