-- Fix sync_fight_results_batch variable ambiguity and validate payload shape.
-- Keep the parameter name `results` because PostgREST RPC calls use it by name.

CREATE OR REPLACE FUNCTION sync_fight_results_batch(results JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_item JSONB;
  v_updated_count INTEGER := 0;
  v_fight_id UUID;
  v_winner_id UUID;
  v_method fight_method;
  v_round INTEGER;
BEGIN
  IF results IS NULL OR jsonb_typeof(results) <> 'array' THEN
    RAISE EXCEPTION 'sync_fight_results_batch expects a JSON array';
  END IF;

  FOR v_result_item IN SELECT value FROM jsonb_array_elements(results) AS item(value)
  LOOP
    v_fight_id := (v_result_item->>'fight_id')::UUID;
    v_winner_id := (v_result_item->>'winner_id')::UUID;
    v_method := (v_result_item->>'method')::fight_method;
    v_round := (v_result_item->>'round')::INTEGER;

    UPDATE fights AS f SET
      winner_id = v_winner_id,
      result_method = v_method,
      result_round = v_round,
      result_confirmed = true,
      result_confirmed_at = NOW(),
      updated_at = NOW()
    WHERE f.id = v_fight_id
      AND f.result_confirmed = false;

    IF FOUND THEN
      PERFORM score_picks_for_fight(v_fight_id);
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN v_updated_count;
END;
$$;
