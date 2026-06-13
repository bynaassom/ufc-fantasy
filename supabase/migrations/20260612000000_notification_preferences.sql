-- Add notification_preferences column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"picks_opened": true, "picks_closed": true, "picks_reminders": true, "card_updated": true, "perfect_pick": true, "challenge_received": true, "challenge_accepted": true, "challenge_declined": true, "challenge_result": true, "badge_earned": true}';
