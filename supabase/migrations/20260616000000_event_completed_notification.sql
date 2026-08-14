-- Add event_completed notification type and update default preferences
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_completed';

-- Update default notification_preferences to include event_completed
ALTER TABLE profiles
  ALTER COLUMN notification_preferences SET DEFAULT '{"picks_opened": true, "picks_closed": true, "picks_reminders": true, "card_updated": true, "perfect_pick": true, "challenge_received": true, "challenge_accepted": true, "challenge_declined": true, "challenge_result": true, "badge_earned": true, "event_completed": true}'::jsonb;

-- Backfill existing rows that lack event_completed
UPDATE profiles
SET notification_preferences = notification_preferences || '{"event_completed": true}'::jsonb
WHERE NOT (notification_preferences ? 'event_completed');
