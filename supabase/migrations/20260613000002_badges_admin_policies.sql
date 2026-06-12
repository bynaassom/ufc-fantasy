DROP POLICY IF EXISTS "badges_insert_admin" ON badges;
CREATE POLICY "badges_insert_admin" ON badges FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "badges_update_admin" ON badges;
CREATE POLICY "badges_update_admin" ON badges FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "badges_delete_admin" ON badges;
CREATE POLICY "badges_delete_admin" ON badges FOR DELETE USING (is_admin());
