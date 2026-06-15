-- Add manual badge awards and configurable badge notification copy.

ALTER TABLE badges
  ADD COLUMN IF NOT EXISTS award_mode TEXT NOT NULL DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS notification_title TEXT,
  ADD COLUMN IF NOT EXISTS notification_message TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'badges_award_mode_check'
      AND conrelid = 'badges'::regclass
  ) THEN
    ALTER TABLE badges
      ADD CONSTRAINT badges_award_mode_check
      CHECK (award_mode IN ('automatic', 'manual'));
  END IF;
END $$;

UPDATE badges
SET award_mode = 'automatic'
WHERE award_mode IS NULL;
