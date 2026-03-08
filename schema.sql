-- ============================================================
-- UFC FANTASY APP - SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE fight_method AS ENUM ('decision', 'submission', 'knockout');
CREATE TYPE event_status AS ENUM ('upcoming', 'live', 'completed');
CREATE TYPE fight_card_type AS ENUM ('main', 'preliminary');
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- ============================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  is_banned BOOLEAN NOT NULL DEFAULT false,
  ban_reason TEXT,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nickname_length CHECK (char_length(nickname) >= 3 AND char_length(nickname) <= 20),
  CONSTRAINT nickname_format CHECK (nickname ~ '^[a-zA-Z0-9_]+$'),
  CONSTRAINT first_name_length CHECK (char_length(first_name) >= 1 AND char_length(first_name) <= 50),
  CONSTRAINT last_name_length CHECK (char_length(last_name) >= 1 AND char_length(last_name) <= 50)
);

-- ============================================================
-- EVENTS TABLE
-- ============================================================
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  banner_image_url TEXT,
  ufc_event_id TEXT UNIQUE,
  status event_status NOT NULL DEFAULT 'upcoming',
  picks_lock_at TIMESTAMPTZ GENERATED ALWAYS AS (event_date - INTERVAL '30 minutes') STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FIGHTERS TABLE
-- ============================================================
CREATE TABLE fighters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  ufc_fighter_id TEXT UNIQUE,
  headshot_url TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FIGHTS TABLE
-- ============================================================
CREATE TABLE fights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  fighter_a_id UUID NOT NULL REFERENCES fighters(id),
  fighter_b_id UUID NOT NULL REFERENCES fighters(id),
  card_type fight_card_type NOT NULL DEFAULT 'preliminary',
  fight_order INTEGER NOT NULL DEFAULT 0,
  weight_class TEXT NOT NULL,
  is_title_fight BOOLEAN NOT NULL DEFAULT false,
  total_rounds INTEGER NOT NULL DEFAULT 3 CHECK (total_rounds IN (3, 5)),
  winner_id UUID REFERENCES fighters(id),
  result_method fight_method,
  result_round INTEGER CHECK (result_round IS NULL OR (result_round >= 1 AND result_round <= 5)),
  result_confirmed BOOLEAN NOT NULL DEFAULT false,
  result_confirmed_at TIMESTAMPTZ,
  result_confirmed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT different_fighters CHECK (fighter_a_id != fighter_b_id),
  CONSTRAINT result_round_valid CHECK (result_round IS NULL OR result_round <= total_rounds)
);

-- ============================================================
-- PICKS TABLE
-- ============================================================
CREATE TABLE picks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fight_id UUID NOT NULL REFERENCES fights(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  picked_winner_id UUID NOT NULL REFERENCES fighters(id),
  picked_method fight_method NOT NULL,
  picked_round INTEGER NOT NULL CHECK (picked_round >= 1 AND picked_round <= 5),
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  points_winner INTEGER NOT NULL DEFAULT 0 CHECK (points_winner IN (0, 1)),
  points_method INTEGER NOT NULL DEFAULT 0 CHECK (points_method IN (0, 1)),
  points_round INTEGER NOT NULL DEFAULT 0 CHECK (points_round IN (0, 1)),
  total_points INTEGER GENERATED ALWAYS AS (points_winner + points_method + points_round) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, fight_id)
);

-- ============================================================
-- EVENT SCORES TABLE (aggregate per event per user)
-- ============================================================
CREATE TABLE event_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  fights_scored INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- ============================================================
-- ACTIVITY LOGS TABLE
-- ============================================================
CREATE TABLE activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  suspicious BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_picks_user_id ON picks(user_id);
CREATE INDEX idx_picks_fight_id ON picks(fight_id);
CREATE INDEX idx_picks_event_id ON picks(event_id);
CREATE INDEX idx_fights_event_id ON fights(event_id);
CREATE INDEX idx_event_scores_event_id ON event_scores(event_id);
CREATE INDEX idx_event_scores_user_id ON event_scores(user_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_suspicious ON activity_logs(suspicious) WHERE suspicious = true;
CREATE INDEX idx_profiles_total_points ON profiles(total_points DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fighters ENABLE ROW LEVEL SECURITY;
ALTER TABLE fights ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if picks are locked for an event
CREATE OR REPLACE FUNCTION picks_are_locked(p_event_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id AND NOW() >= picks_lock_at
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id AND NOT is_admin())
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND is_banned = (SELECT is_banned FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (is_admin());

-- EVENTS policies
CREATE POLICY "events_select_public" ON events FOR SELECT USING (true);
CREATE POLICY "events_admin_all" ON events FOR ALL USING (is_admin());

-- FIGHTERS policies
CREATE POLICY "fighters_select_public" ON fighters FOR SELECT USING (true);
CREATE POLICY "fighters_admin_all" ON fighters FOR ALL USING (is_admin());

-- FIGHTS policies
CREATE POLICY "fights_select_public" ON fights FOR SELECT USING (true);
CREATE POLICY "fights_admin_all" ON fights FOR ALL USING (is_admin());

-- PICKS policies
CREATE POLICY "picks_select_own" ON picks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "picks_select_admin" ON picks FOR SELECT USING (is_admin());
CREATE POLICY "picks_select_public_after_lock" ON picks FOR SELECT
  USING (picks_are_locked(event_id));

CREATE POLICY "picks_insert_own" ON picks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT picks_are_locked(event_id)
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = true)
  );

CREATE POLICY "picks_update_own" ON picks FOR UPDATE
  USING (
    auth.uid() = user_id
    AND NOT picks_are_locked(event_id)
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = true)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND user_id = (SELECT user_id FROM picks WHERE id = picks.id)
    AND fight_id = (SELECT fight_id FROM picks WHERE id = picks.id)
    AND event_id = (SELECT event_id FROM picks WHERE id = picks.id)
    AND points_winner = 0
    AND points_method = 0
    AND points_round = 0
  );

CREATE POLICY "picks_delete_own" ON picks FOR DELETE
  USING (
    auth.uid() = user_id
    AND NOT picks_are_locked(event_id)
  );

CREATE POLICY "picks_admin_all" ON picks FOR ALL USING (is_admin());

-- EVENT SCORES policies
CREATE POLICY "event_scores_select_public" ON event_scores FOR SELECT USING (true);
CREATE POLICY "event_scores_admin_all" ON event_scores FOR ALL USING (is_admin());

-- ACTIVITY LOGS policies
CREATE POLICY "activity_logs_admin_only" ON activity_logs FOR ALL USING (is_admin());

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nickname, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fighters_updated_at BEFORE UPDATE ON fighters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fights_updated_at BEFORE UPDATE ON fights FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER picks_updated_at BEFORE UPDATE ON picks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Prevent modifying confirmed picks after lock
CREATE OR REPLACE FUNCTION prevent_pick_modification_after_lock()
RETURNS TRIGGER AS $$
BEGIN
  IF picks_are_locked(OLD.event_id) THEN
    RAISE EXCEPTION 'Picks are locked for this event. Cannot modify after lock time.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_pick_lock_on_update
  BEFORE UPDATE ON picks
  FOR EACH ROW EXECUTE FUNCTION prevent_pick_modification_after_lock();

CREATE TRIGGER enforce_pick_lock_on_delete
  BEFORE DELETE ON picks
  FOR EACH ROW EXECUTE FUNCTION prevent_pick_modification_after_lock();

-- Log suspicious activity (too many picks in short time)
CREATE OR REPLACE FUNCTION log_pick_activity()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM picks
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF recent_count > 20 THEN
    INSERT INTO activity_logs (user_id, action, details, suspicious)
    VALUES (NEW.user_id, 'rapid_picks', jsonb_build_object('count', recent_count, 'fight_id', NEW.fight_id), true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER monitor_pick_activity
  AFTER INSERT ON picks
  FOR EACH ROW EXECUTE FUNCTION log_pick_activity();

-- ============================================================
-- FUNCTION: Score picks after result is confirmed
-- ============================================================
CREATE OR REPLACE FUNCTION score_picks_for_fight(p_fight_id UUID)
RETURNS VOID AS $$
DECLARE
  fight_record fights%ROWTYPE;
BEGIN
  SELECT * INTO fight_record FROM fights WHERE id = p_fight_id;

  IF NOT fight_record.result_confirmed THEN
    RAISE EXCEPTION 'Fight result not confirmed yet';
  END IF;

  -- Update picks points
  UPDATE picks SET
    points_winner = CASE WHEN picked_winner_id = fight_record.winner_id THEN 1 ELSE 0 END,
    points_method = CASE WHEN picked_method = fight_record.result_method AND picked_winner_id = fight_record.winner_id THEN 1 ELSE 0 END,
    points_round = CASE WHEN picked_round = fight_record.result_round AND picked_method = fight_record.result_method AND picked_winner_id = fight_record.winner_id THEN 1 ELSE 0 END
  WHERE fight_id = p_fight_id;

  -- Update event_scores for all users who picked this fight
  INSERT INTO event_scores (user_id, event_id, total_points, fights_scored)
  SELECT
    p.user_id,
    fight_record.event_id,
    SUM(p.total_points),
    COUNT(*)
  FROM picks p
  JOIN fights f ON p.fight_id = f.id
  WHERE f.event_id = fight_record.event_id
  GROUP BY p.user_id
  ON CONFLICT (user_id, event_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    fights_scored = EXCLUDED.fights_scored,
    updated_at = NOW();

  -- Update global total_points on profiles
  UPDATE profiles SET
    total_points = (
      SELECT COALESCE(SUM(total_points), 0)
      FROM event_scores
      WHERE user_id = profiles.id
    )
  WHERE id IN (SELECT user_id FROM picks WHERE fight_id = p_fight_id);

  -- Update event ranking positions
  WITH ranked AS (
    SELECT user_id, RANK() OVER (ORDER BY total_points DESC) as pos
    FROM event_scores
    WHERE event_id = fight_record.event_id
  )
  UPDATE event_scores SET rank_position = ranked.pos
  FROM ranked
  WHERE event_scores.user_id = ranked.user_id
    AND event_scores.event_id = fight_record.event_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FIRST ADMIN SETUP (run after creating your account)
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_UUID';
-- ============================================================
