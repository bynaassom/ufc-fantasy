-- Automated event timing, server-enforced pick windows and hardened scoring RPCs.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS prelims_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timing_mode TEXT NOT NULL DEFAULT 'automatic';

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_timing_mode_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_timing_mode_check
  CHECK (timing_mode IN ('automatic', 'manual'));

CREATE OR REPLACE FUNCTION public.set_automated_event_timing()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_starts_at TIMESTAMPTZ;
BEGIN
  IF NEW.timing_mode = 'automatic' THEN
    v_starts_at := COALESCE(NEW.prelims_start_at, NEW.event_date);
    NEW.picks_lock_at := v_starts_at - INTERVAL '30 minutes';
    IF NEW.picks_open_at IS NULL THEN
      NEW.picks_open_at := v_starts_at - INTERVAL '12 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_automated_event_timing ON public.events;
CREATE TRIGGER set_automated_event_timing
  BEFORE INSERT OR UPDATE OF event_date, prelims_start_at, timing_mode
  ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_automated_event_timing();

UPDATE public.events
SET picks_lock_at = COALESCE(prelims_start_at, event_date) - INTERVAL '30 minutes'
WHERE timing_mode = 'automatic'
  AND status = 'upcoming';

CREATE INDEX IF NOT EXISTS idx_events_status_prelims_start
  ON public.events(status, prelims_start_at);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_banned = false
  );
$$;

CREATE OR REPLACE FUNCTION public.picks_are_open(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events
    WHERE id = p_event_id
      AND status = 'upcoming'
      AND (picks_open_at IS NULL OR NOW() >= picks_open_at)
      AND NOW() < picks_lock_at
  );
$$;

DROP POLICY IF EXISTS "picks_insert_own" ON public.picks;
CREATE POLICY "picks_insert_own" ON public.picks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.picks_are_open(event_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );

DROP POLICY IF EXISTS "picks_update_own" ON public.picks;
CREATE POLICY "picks_update_own" ON public.picks FOR UPDATE
  USING (
    auth.uid() = user_id
    AND public.picks_are_open(event_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.picks_are_open(event_id)
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

DROP POLICY IF EXISTS "picks_delete_own" ON public.picks;
CREATE POLICY "picks_delete_own" ON public.picks FOR DELETE
  USING (auth.uid() = user_id AND public.picks_are_open(event_id));

CREATE OR REPLACE FUNCTION public.prevent_pick_modification_after_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.scoring_picks', true) = 'on' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF NOT public.picks_are_open(OLD.event_id) THEN
    RAISE EXCEPTION 'Picks are outside the editable window for this event.';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.score_picks_for_fight(p_fight_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fight public.fights%ROWTYPE;
BEGIN
  SELECT * INTO v_fight
  FROM public.fights
  WHERE id = p_fight_id;

  IF NOT FOUND OR NOT v_fight.result_confirmed THEN
    RETURN;
  END IF;

  PERFORM set_config('app.scoring_picks', 'on', true);

  UPDATE public.picks
  SET
    points_winner = CASE WHEN picked_winner_id = v_fight.winner_id THEN 1 ELSE 0 END,
    points_method = CASE
      WHEN picked_winner_id = v_fight.winner_id
       AND picked_method = v_fight.result_method THEN 1 ELSE 0 END,
    points_round = CASE
      WHEN picked_winner_id = v_fight.winner_id
       AND picked_method = v_fight.result_method
       AND (
         v_fight.result_method = 'decision'
         OR picked_round = v_fight.result_round
       ) THEN 1 ELSE 0 END
  WHERE fight_id = p_fight_id
    AND is_confirmed = true;

  INSERT INTO public.event_scores (
    user_id, event_id, total_points, fights_scored, perfect_picks
  )
  SELECT
    p.user_id,
    v_fight.event_id,
    SUM(p.points_winner + p.points_method + p.points_round),
    COUNT(*),
    SUM(CASE
      WHEN p.points_winner = 1 AND p.points_method = 1 AND p.points_round = 1
      THEN 1 ELSE 0 END)
  FROM public.picks AS p
  WHERE p.event_id = v_fight.event_id
    AND p.is_confirmed = true
  GROUP BY p.user_id
  ON CONFLICT (user_id, event_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    fights_scored = EXCLUDED.fights_scored,
    perfect_picks = EXCLUDED.perfect_picks,
    updated_at = NOW();

  WITH ranked AS (
    SELECT
      id,
      RANK() OVER (
        ORDER BY total_points DESC, perfect_picks DESC
      ) AS rank_position
    FROM public.event_scores
    WHERE event_id = v_fight.event_id
  )
  UPDATE public.event_scores AS scores
  SET rank_position = ranked.rank_position
  FROM ranked
  WHERE scores.id = ranked.id;

  UPDATE public.profiles
  SET total_points = totals.total_points
  FROM (
    SELECT user_id, COALESCE(SUM(total_points), 0) AS total_points
    FROM public.event_scores
    GROUP BY user_id
  ) AS totals
  WHERE public.profiles.id = totals.user_id
    AND public.profiles.id IN (
      SELECT DISTINCT user_id FROM public.picks WHERE event_id = v_fight.event_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_fight_results_batch(results JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item JSONB;
  v_updated_count INTEGER := 0;
  v_fight public.fights%ROWTYPE;
  v_fight_id UUID;
  v_winner_id UUID;
  v_method public.fight_method;
  v_round INTEGER;
BEGIN
  IF results IS NULL OR jsonb_typeof(results) <> 'array' THEN
    RAISE EXCEPTION 'sync_fight_results_batch expects a JSON array';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(results) AS item(value)
  LOOP
    v_fight_id := (v_item->>'fight_id')::UUID;
    v_winner_id := (v_item->>'winner_id')::UUID;
    v_method := (v_item->>'method')::public.fight_method;
    v_round := (v_item->>'round')::INTEGER;

    SELECT * INTO v_fight
    FROM public.fights
    WHERE id = v_fight_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Fight % was not found', v_fight_id;
    END IF;
    IF v_winner_id NOT IN (v_fight.fighter_a_id, v_fight.fighter_b_id) THEN
      RAISE EXCEPTION 'Winner % does not belong to fight %', v_winner_id, v_fight_id;
    END IF;
    IF v_round < 1 OR v_round > v_fight.total_rounds THEN
      RAISE EXCEPTION 'Round % is invalid for fight %', v_round, v_fight_id;
    END IF;
    IF v_method = 'decision' THEN
      v_round := v_fight.total_rounds;
    END IF;

    UPDATE public.fights
    SET
      winner_id = v_winner_id,
      result_method = v_method,
      result_round = v_round,
      result_confirmed = true,
      result_confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = v_fight_id
      AND result_confirmed = false;

    IF FOUND THEN
      PERFORM public.score_picks_for_fight(v_fight_id);
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN v_updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.score_picks_for_fight(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_fight_results_batch(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.score_picks_for_fight(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_fight_results_batch(JSONB) TO service_role;
