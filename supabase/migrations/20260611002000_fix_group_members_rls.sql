DROP POLICY IF EXISTS "group_members_select_own" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_own" ON group_members;

CREATE POLICY "group_members_select_own" ON group_members FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "group_members_delete_own" ON group_members FOR DELETE USING (
  auth.uid() = user_id
);
