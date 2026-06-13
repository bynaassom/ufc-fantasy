CREATE TABLE IF NOT EXISTS seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT season_date_range CHECK (starts_at < ends_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_single_current
  ON seasons (is_current)
  WHERE is_current = true;

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seasons_select_public" ON seasons;
CREATE POLICY "seasons_select_public" ON seasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "seasons_admin_all" ON seasons;
CREATE POLICY "seasons_admin_all" ON seasons FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_season_id ON events(season_id);
CREATE INDEX IF NOT EXISTS idx_event_scores_event_user ON event_scores(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_event_scores_user_event ON event_scores(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON group_members(group_id, user_id);

INSERT INTO seasons (name, starts_at, ends_at, is_current)
SELECT
  'Temporada 2026',
  '2026-01-01T00:00:00Z'::timestamptz,
  '2027-01-01T00:00:00Z'::timestamptz,
  true
WHERE NOT EXISTS (SELECT 1 FROM seasons WHERE is_current = true);

UPDATE events e
SET season_id = s.id
FROM seasons s
WHERE e.season_id IS NULL
  AND e.event_date >= s.starts_at
  AND e.event_date < s.ends_at;

CREATE OR REPLACE VIEW global_season_standings AS
SELECT
  e.season_id,
  es.user_id,
  p.nickname,
  p.first_name,
  p.last_name,
  SUM(es.total_points)::integer AS total_points,
  SUM(COALESCE(es.perfect_picks, 0))::integer AS perfect_picks,
  COUNT(DISTINCT es.event_id)::integer AS events_played,
  RANK() OVER (
    PARTITION BY e.season_id
    ORDER BY
      SUM(es.total_points) DESC,
      SUM(COALESCE(es.perfect_picks, 0)) DESC,
      COUNT(DISTINCT es.event_id) DESC,
      p.nickname ASC
  )::integer AS rank_position
FROM event_scores es
JOIN events e ON e.id = es.event_id
JOIN profiles p ON p.id = es.user_id
WHERE e.season_id IS NOT NULL
  AND p.is_banned = false
GROUP BY e.season_id, es.user_id, p.nickname, p.first_name, p.last_name;

CREATE OR REPLACE VIEW group_season_standings AS
SELECT
  gm.group_id,
  s.id AS season_id,
  gm.user_id,
  p.nickname,
  p.first_name,
  p.last_name,
  gm.role,
  gm.joined_at,
  COALESCE(SUM(es.total_points), 0)::integer AS total_points,
  COALESCE(SUM(es.perfect_picks), 0)::integer AS perfect_picks,
  COUNT(DISTINCT es.event_id)::integer AS events_played,
  RANK() OVER (
    PARTITION BY gm.group_id, s.id
    ORDER BY
      COALESCE(SUM(es.total_points), 0) DESC,
      COALESCE(SUM(es.perfect_picks), 0) DESC,
      COUNT(DISTINCT es.event_id) DESC,
      p.nickname ASC
  )::integer AS rank_position
FROM group_members gm
JOIN profiles p ON p.id = gm.user_id
CROSS JOIN seasons s
LEFT JOIN events e
  ON e.season_id = s.id
LEFT JOIN event_scores es
  ON es.event_id = e.id
 AND es.user_id = gm.user_id
WHERE p.is_banned = false
GROUP BY
  gm.group_id,
  s.id,
  gm.user_id,
  p.nickname,
  p.first_name,
  p.last_name,
  gm.role,
  gm.joined_at;
