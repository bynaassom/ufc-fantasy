-- Keep result writes atomic and prevent events from completing before every fight.

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
  v_overwrite BOOLEAN;
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
    v_overwrite := COALESCE((v_item->>'overwrite')::BOOLEAN, false);

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
      AND (result_confirmed = false OR v_overwrite);

    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
    END IF;

    -- Always recalculate. This repairs a previously confirmed fight whose result
    -- was saved before a scoring RPC failed, while remaining idempotent on retries.
    PERFORM public.score_picks_for_fight(v_fight_id);
  END LOOP;

  RETURN v_updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.score_picks_for_fight(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_fight_results_batch(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.score_picks_for_fight(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_fight_results_batch(JSONB) TO service_role;

-- Repair any confirmed result whose pick points do not match the stored result.
-- This covers the partial-write incident that motivated this migration without
-- rewriting fights whose scoring is already consistent.
DO $$
DECLARE
  v_fight_id UUID;
BEGIN
  FOR v_fight_id IN
    SELECT f.id
    FROM public.fights AS f
    WHERE f.result_confirmed = true
      AND EXISTS (
        SELECT 1
        FROM public.picks AS p
        WHERE p.fight_id = f.id
          AND (
            p.points_winner IS DISTINCT FROM CASE
              WHEN p.picked_winner_id = f.winner_id THEN 1 ELSE 0 END
            OR p.points_method IS DISTINCT FROM CASE
              WHEN p.picked_winner_id = f.winner_id
               AND p.picked_method = f.result_method THEN 1 ELSE 0 END
            OR p.points_round IS DISTINCT FROM CASE
              WHEN p.picked_winner_id = f.winner_id
               AND p.picked_method = f.result_method
               AND (
                 f.result_method = 'decision'
                 OR p.picked_round = f.result_round
               ) THEN 1 ELSE 0 END
          )
      )
  LOOP
    UPDATE public.fights
    SET result_confirmed_at = COALESCE(result_confirmed_at, updated_at, NOW())
    WHERE id = v_fight_id
      AND result_confirmed_at IS NULL;
    PERFORM public.score_picks_for_fight(v_fight_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_event_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.fights WHERE event_id = NEW.id
    ) OR EXISTS (
      SELECT 1
      FROM public.fights
      WHERE event_id = NEW.id
        AND result_confirmed = false
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Event cannot be completed until every fight result is confirmed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_event_completion_results ON public.events;
CREATE TRIGGER enforce_event_completion_results
  BEFORE INSERT OR UPDATE OF status ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_event_completion();
