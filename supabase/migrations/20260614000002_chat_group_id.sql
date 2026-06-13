-- Add group_id to chat_messages for league-scoped chat
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_id ON chat_messages(group_id);

-- Drop old policies and recreate with group membership checks
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT USING (
  (is_hidden = false OR is_admin())
  AND (
    group_id IS NULL
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = chat_messages.group_id
        AND group_members.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_banned = true
  )
  AND (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = chat_messages.group_id
        AND group_members.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "chat_messages_update_admin" ON chat_messages;
CREATE POLICY "chat_messages_update_admin" ON chat_messages FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "chat_messages_delete_admin" ON chat_messages;
CREATE POLICY "chat_messages_delete_admin" ON chat_messages FOR DELETE USING (is_admin());
