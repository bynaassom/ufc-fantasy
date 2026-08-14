-- Ensure ban_reason column exists on profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
  END IF;
END $$;

-- index for admin chat message queries filtered by is_hidden
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_hidden
  ON chat_messages(is_hidden, created_at DESC)
  WHERE is_hidden = true;
