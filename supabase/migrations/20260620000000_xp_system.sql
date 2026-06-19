-- 20260620000000_xp_system.sql
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id, reason)
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON xp_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_event ON xp_events(event_id);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp_total       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level          INTEGER NOT NULL DEFAULT 1;

-- RLS: users can read own xp_events, admins can read all
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_events_select_own" ON xp_events;
CREATE POLICY "xp_events_select_own" ON xp_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "xp_events_admin_select" ON xp_events;
CREATE POLICY "xp_events_admin_select" ON xp_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_banned = false)
  );

-- Inserts/updates are server-only (no policy = blocked for anon/authenticated)

-- Atomic increment of xp_total
CREATE OR REPLACE FUNCTION increment_profile_xp(p_user_id UUID, p_amount INTEGER)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET xp_total = GREATEST(0, xp_total + p_amount)
  WHERE id = p_user_id;
$$;

-- Monotonic streak update (best_streak never decreases)
CREATE OR REPLACE FUNCTION update_profile_streak(
  p_user_id UUID,
  p_current_streak INTEGER,
  p_best_streak INTEGER
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET current_streak = p_current_streak,
      best_streak = GREATEST(best_streak, p_best_streak)
  WHERE id = p_user_id;
$$;
