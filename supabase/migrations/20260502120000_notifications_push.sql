ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'picks_opened';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'picks_closing_tomorrow';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'picks_closing_today';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'picks_closing_1h';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'picks_closing_30m';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'picks_closing_15m';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'fight_removed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'fight_added';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'card_updated';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS fight_id UUID REFERENCES fights(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_fight_id ON notifications(fight_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe
  ON notifications(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_select_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_select_own" ON push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own" ON push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_update_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_update_own" ON push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own" ON push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_admin_all" ON push_subscriptions;
CREATE POLICY "push_subscriptions_admin_all" ON push_subscriptions
  FOR ALL
  USING (is_admin());

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
