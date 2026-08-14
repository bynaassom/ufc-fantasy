-- Esta migration pode ser aplicada antes de followers_activity em previews novos.
-- Garante as colunas usadas pela view sem depender da ordem em que chegaram ao remoto.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS favorite_fighter_id UUID REFERENCES fighters(id),
  ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE VIEW ranking_profiles AS
  SELECT
    id,
    nickname,
    first_name,
    last_name,
    total_points,
    division,
    bio,
    favorite_fighter_id,
    followers_count,
    following_count
  FROM profiles
  WHERE is_banned = false;
