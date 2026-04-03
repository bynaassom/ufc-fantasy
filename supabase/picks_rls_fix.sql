-- Limpa policies duplicadas/antigas da tabela picks e recria a versão segura.

CREATE OR REPLACE FUNCTION public.pick_update_is_safe(
  p_pick_id uuid,
  p_user_id uuid,
  p_fight_id uuid,
  p_event_id uuid,
  p_points_winner integer,
  p_points_method integer,
  p_points_round integer
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.picks original_pick
    WHERE original_pick.id = p_pick_id
      AND original_pick.user_id = p_user_id
      AND original_pick.fight_id = p_fight_id
      AND original_pick.event_id = p_event_id
      AND p_points_winner = 0
      AND p_points_method = 0
      AND p_points_round = 0
  );
$$;

DROP POLICY IF EXISTS "Criar palpite" ON public.picks;
DROP POLICY IF EXISTS "Deletar palpite" ON public.picks;
DROP POLICY IF EXISTS "Editar palpite" ON public.picks;
DROP POLICY IF EXISTS "Ver palpites" ON public.picks;
DROP POLICY IF EXISTS "picks_admin_all" ON public.picks;
DROP POLICY IF EXISTS "picks_delete_own" ON public.picks;
DROP POLICY IF EXISTS "picks_insert_own" ON public.picks;
DROP POLICY IF EXISTS "picks_select_admin" ON public.picks;
DROP POLICY IF EXISTS "picks_select_own" ON public.picks;
DROP POLICY IF EXISTS "picks_select_public_after_lock" ON public.picks;
DROP POLICY IF EXISTS "picks_select_secure" ON public.picks;
DROP POLICY IF EXISTS "picks_update_own" ON public.picks;

CREATE POLICY "picks_select_own"
ON public.picks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "picks_select_admin"
ON public.picks
FOR SELECT
USING (public.is_admin());

CREATE POLICY "picks_select_secure"
ON public.picks
FOR SELECT
USING (
  auth.uid() = user_id
  OR (auth.uid() IS NOT NULL AND public.picks_are_locked(event_id))
);

CREATE POLICY "picks_insert_own"
ON public.picks
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.picks_are_locked(event_id)
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_banned = true
  )
);

CREATE POLICY "picks_update_own"
ON public.picks
FOR UPDATE
USING (
  auth.uid() = user_id
  AND NOT public.picks_are_locked(event_id)
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_banned = true
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND public.pick_update_is_safe(
    id,
    user_id,
    fight_id,
    event_id,
    points_winner,
    points_method,
    points_round
  )
);

CREATE POLICY "picks_delete_own"
ON public.picks
FOR DELETE
USING (
  auth.uid() = user_id
  AND NOT public.picks_are_locked(event_id)
);

CREATE POLICY "picks_admin_all"
ON public.picks
FOR ALL
USING (public.is_admin());
