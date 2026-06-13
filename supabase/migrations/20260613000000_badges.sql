-- Badge definitions table
CREATE TABLE IF NOT EXISTS badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('volume', 'accuracy', 'streak', 'challenge', 'special')),
  icon_name TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-badge junction table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Badges are readable by anyone
DROP POLICY IF EXISTS "badges_select_all" ON badges;
CREATE POLICY "badges_select_all" ON badges FOR SELECT USING (true);

-- Admins can manage badge definitions
DROP POLICY IF EXISTS "badges_insert_admin" ON badges;
CREATE POLICY "badges_insert_admin" ON badges FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "badges_update_admin" ON badges;
CREATE POLICY "badges_update_admin" ON badges FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "badges_delete_admin" ON badges;
CREATE POLICY "badges_delete_admin" ON badges FOR DELETE USING (is_admin());

-- User badges: user can see their own
DROP POLICY IF EXISTS "user_badges_select_own" ON user_badges;
CREATE POLICY "user_badges_select_own" ON user_badges FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_badges_insert_own" ON user_badges;
CREATE POLICY "user_badges_insert_own" ON user_badges FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "user_badges_delete_own" ON user_badges;
CREATE POLICY "user_badges_delete_own" ON user_badges FOR DELETE USING (false);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_slug ON badges(slug);

-- Insert badge definitions
INSERT INTO badges (slug, name, description, category, icon_name, tier, sort_order) VALUES
  ('primeiro_pick', 'Primeiro Pick', 'Faça seu primeiro pick confirmado em um evento', 'volume', 'target', 1, 1),
  ('veterano', 'Veterano', 'Participe de 10 eventos', 'volume', 'calendar', 2, 2),
  ('viciado', 'Journey Man', 'Participe de 25 eventos', 'volume', 'flame', 3, 3),
  ('mira_sniper', 'Striker de Elite', 'Acerte 3 perfect picks em um único evento', 'accuracy', 'crosshair', 2, 4),
  ('mestre_palpites', 'Isaac Dulgarian', 'Acumule 10 perfect picks no total', 'accuracy', 'star', 2, 5),
  ('vidente', 'Vidente', 'Alcance 70%+ de precisão nos picks', 'accuracy', 'eye', 3, 6),
  ('em_frente', 'Em um Timing Gigantesco', 'Mantenha uma sequência de 3 eventos melhorando de posição', 'streak', 'trending-up', 2, 7),
  ('gladiador', 'Gladiador', 'Vença 5 desafios', 'challenge', 'shield', 1, 8),
  ('invicto', 'Invicto', 'Vença 10 desafios', 'challenge', 'trophy', 2, 9),
  ('campeao_desafios', 'Campeão dos Desafios', 'Vença 25 desafios', 'challenge', 'crown', 3, 10)
ON CONFLICT (slug) DO NOTHING;
