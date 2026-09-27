-- Remove a replaced matchup and its picks only while changes to picks are open.
-- Affected users receive an in-app notice in the same transaction.
CREATE OR REPLACE FUNCTION public.remove_replaced_fight_before_lock(
  p_event_id UUID,
  p_fight_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_event RECORD;
  v_fight RECORD;
BEGIN
  SELECT status, picks_lock_at, name, slug
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  IF v_event.status <> 'upcoming' OR v_event.picks_lock_at IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT f.id, f.result_confirmed, a.name AS fighter_a_name, b.name AS fighter_b_name
  INTO v_fight
  FROM public.fights AS f
  JOIN public.fighters AS a ON a.id = f.fighter_a_id
  JOIN public.fighters AS b ON b.id = f.fighter_b_id
  WHERE f.id = p_fight_id AND f.event_id = p_event_id
  FOR UPDATE OF f;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  IF v_fight.result_confirmed THEN
    RETURN FALSE;
  END IF;
  IF v_event.picks_lock_at <= clock_timestamp() THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.notifications (
    user_id, type, title, message, target_path, event_id, fight_id, dedupe_key
  )
  SELECT DISTINCT
    p.user_id,
    'fight_removed'::public.notification_type,
    'Luta removida do card',
    'A luta ' || v_fight.fighter_a_name || ' vs ' || v_fight.fighter_b_name ||
      ' foi substituída no ' || v_event.name || '. Seu palpite nessa luta foi removido.',
    '/event/' || v_event.slug,
    p_event_id,
    p_fight_id,
    'fight_removed:' || p_event_id::TEXT || ':' || p_fight_id::TEXT
  FROM public.picks AS p
  WHERE p.fight_id = p_fight_id
  ON CONFLICT DO NOTHING;

  DELETE FROM public.fights
  WHERE id = p_fight_id
    AND result_confirmed = FALSE
    AND clock_timestamp() < v_event.picks_lock_at;
  IF NOT FOUND THEN
    -- Roll back the notice inserted above if the picks lock was reached.
    RAISE EXCEPTION 'Fight replacement could not be removed before picks lock';
  END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_replaced_fight_before_lock(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_replaced_fight_before_lock(UUID, UUID)
  TO service_role;
