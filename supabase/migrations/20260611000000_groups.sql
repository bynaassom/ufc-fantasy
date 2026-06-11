CREATE TABLE groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 50),
  CONSTRAINT invite_code_length CHECK (char_length(invite_code) = 8)
);

CREATE TABLE group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_select_own" ON groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid())
);

CREATE POLICY "groups_insert_own" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_update_admin" ON groups FOR UPDATE USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid() AND group_members.role = 'admin')
);

CREATE POLICY "groups_delete_admin" ON groups FOR DELETE USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid() AND group_members.role = 'admin')
);

CREATE POLICY "group_members_select_own" ON group_members FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "group_members_insert_join" ON group_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "group_members_delete_own" ON group_members FOR DELETE USING (
  auth.uid() = user_id
);

CREATE INDEX idx_groups_invite_code ON groups(invite_code);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
