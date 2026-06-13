-- Remove dead keys and add new notification preference keys for existing profiles
UPDATE profiles
SET notification_preferences = 
  notification_preferences 
  -- Remove dead keys
  - 'reminder_24h'
  - 'reminder_6h'
  - 'reminder_1h'
  - 'fight_result'
  - 'event_completed'
  -- Add new keys defaulting to true
  || '{"picks_reminders": true, "perfect_pick": true, "challenge_received": true, "challenge_accepted": true, "challenge_declined": true, "challenge_result": true, "badge_earned": true}'
WHERE notification_preferences ? 'picks_opened';

-- Update the column default for future rows
ALTER TABLE profiles
ALTER COLUMN notification_preferences
SET DEFAULT '{"picks_opened": true, "picks_closed": true, "picks_reminders": true, "card_updated": true, "perfect_pick": true, "challenge_received": true, "challenge_accepted": true, "challenge_declined": true, "challenge_result": true, "badge_earned": true}';
