-- Add notification_preferences column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"picks_opened": true, "picks_closed": true, "reminder_24h": true, "reminder_6h": true, "reminder_1h": true, "fight_result": true, "event_completed": true, "card_updated": true}';
