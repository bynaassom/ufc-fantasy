-- Add new notification preference keys to existing profiles
UPDATE profiles
SET notification_preferences = notification_preferences
  || '{"event_recap": true}'::jsonb
WHERE NOT notification_preferences ? 'event_recap';

UPDATE profiles
SET notification_preferences = notification_preferences
  || '{"league_rank": true}'::jsonb
WHERE NOT notification_preferences ? 'league_rank';

UPDATE profiles
SET notification_preferences = notification_preferences
  || '{"chat_mention": true}'::jsonb
WHERE NOT notification_preferences ? 'chat_mention';

UPDATE profiles
SET notification_preferences = notification_preferences
  || '{"rivalry_result": true}'::jsonb
WHERE NOT notification_preferences ? 'rivalry_result';

UPDATE profiles
SET notification_preferences = notification_preferences
  || '{"level_up": true}'::jsonb
WHERE NOT notification_preferences ? 'level_up';

-- Update the column default to include new types
ALTER TABLE profiles
ALTER COLUMN notification_preferences SET DEFAULT '{
  "picks_opened": true,
  "picks_closed": true,
  "picks_reminders": true,
  "card_updated": true,
  "perfect_pick": true,
  "challenge_received": true,
  "challenge_accepted": true,
  "challenge_declined": true,
  "challenge_result": true,
  "badge_earned": true,
  "event_recap": true,
  "league_rank": true,
  "chat_mention": true,
  "rivalry_result": true,
  "level_up": true
}'::jsonb;
