ALTER TYPE public.fight_method ADD VALUE IF NOT EXISTS 'majority_draw';

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
    IF v_method IS NULL THEN
      RAISE EXCEPTION 'Method is required for fight %', v_fight_id;
    END IF;
    IF v_method = 'majority_draw' THEN
      IF v_winner_id IS NOT NULL THEN
        RAISE EXCEPTION 'A majority draw cannot have a winner for fight %', v_fight_id;
      END IF;
    ELSIF v_winner_id IS NULL OR v_winner_id NOT IN (v_fight.fighter_a_id, v_fight.fighter_b_id) THEN
      RAISE EXCEPTION 'Winner % does not belong to fight %', v_winner_id, v_fight_id;
    END IF;
    IF v_round IS NULL OR v_round < 1 OR v_round > v_fight.total_rounds THEN
      RAISE EXCEPTION 'Round % is invalid for fight %', v_round, v_fight_id;
    END IF;
    IF v_method IN ('decision', 'majority_draw') THEN
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
