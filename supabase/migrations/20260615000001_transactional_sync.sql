-- RPC: Sync multiple fight results atomically
-- Receives array of (fight_id, winner_id, method, round) and scores all picks
-- Returns number of fights updated

CREATE OR REPLACE FUNCTION sync_fight_results_batch(results JSONB)
RETURNS INTEGER AS $$
DECLARE
  result_item JSONB;
  updated_count INTEGER := 0;
  fight_id UUID;
  winner_id UUID;
  v_method fight_method;
  v_round INTEGER;
BEGIN
  FOR result_item IN SELECT jsonb_array_elements(results)
  LOOP
    fight_id := (result_item->>'fight_id')::UUID;
    winner_id := (result_item->>'winner_id')::UUID;
    v_method := (result_item->>'method')::fight_method;
    v_round := (result_item->>'round')::INTEGER;

    -- Update fight result
    UPDATE fights SET
      winner_id = sync_fight_results_batch.winner_id,
      result_method = v_method,
      result_round = v_round,
      result_confirmed = true,
      result_confirmed_at = NOW()
    WHERE id = fight_id
      AND result_confirmed = false;

    IF FOUND THEN
      -- Score picks for this fight
      PERFORM score_picks_for_fight(fight_id);
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
