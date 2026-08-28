-- Bonus events keep their own picks and leaderboard, but do not contribute to
-- cumulative rankings. Event deletion also refreshes affected profile totals.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_bonus BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_ranked_completed
  ON public.events (event_date DESC)
  WHERE status = 'completed' AND is_bonus = false;

CREATE OR REPLACE VIEW public.global_season_standings AS
SELECT
  e.season_id,
  es.user_id,
  p.nickname,
  p.first_name,
  p.last_name,
  SUM(es.total_points)::integer AS total_points,
  SUM(COALESCE(es.perfect_picks, 0))::integer AS perfect_picks,
  COUNT(DISTINCT es.event_id)::integer AS events_played,
  RANK() OVER (
    PARTITION BY e.season_id
    ORDER BY
      SUM(es.total_points) DESC,
      SUM(COALESCE(es.perfect_picks, 0)) DESC,
      COUNT(DISTINCT es.event_id) DESC,
      p.nickname ASC
  )::integer AS rank_position
FROM public.event_scores AS es
JOIN public.events AS e ON e.id = es.event_id
JOIN public.profiles AS p ON p.id = es.user_id
WHERE e.season_id IS NOT NULL
  AND e.is_bonus = false
  AND p.is_banned = false
GROUP BY e.season_id, es.user_id, p.nickname, p.first_name, p.last_name;

CREATE OR REPLACE VIEW public.group_season_standings AS
SELECT
  gm.group_id,
  s.id AS season_id,
  gm.user_id,
  p.nickname,
  p.first_name,
  p.last_name,
  gm.role,
  gm.joined_at,
  COALESCE(SUM(es.total_points), 0)::integer AS total_points,
  COALESCE(SUM(es.perfect_picks), 0)::integer AS perfect_picks,
  COUNT(DISTINCT es.event_id)::integer AS events_played,
  RANK() OVER (
    PARTITION BY gm.group_id, s.id
    ORDER BY
      COALESCE(SUM(es.total_points), 0) DESC,
      COALESCE(SUM(es.perfect_picks), 0) DESC,
      COUNT(DISTINCT es.event_id) DESC,
      p.nickname ASC
  )::integer AS rank_position
FROM public.group_members AS gm
JOIN public.profiles AS p ON p.id = gm.user_id
CROSS JOIN public.seasons AS s
LEFT JOIN public.events AS e
  ON e.season_id = s.id
 AND e.is_bonus = false
LEFT JOIN public.event_scores AS es
  ON es.event_id = e.id
 AND es.user_id = gm.user_id
WHERE p.is_banned = false
GROUP BY
  gm.group_id,
  s.id,
  gm.user_id,
  p.nickname,
  p.first_name,
  p.last_name,
  gm.role,
  gm.joined_at;

CREATE OR REPLACE FUNCTION public.refresh_profile_totals_after_event_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_event_id := OLD.id;
  ELSE
    v_event_id := NEW.id;
  END IF;

  UPDATE public.profiles AS profile
  SET total_points = COALESCE((
    SELECT SUM(score.total_points)
    FROM public.event_scores AS score
    JOIN public.events AS ranked_event ON ranked_event.id = score.event_id
    WHERE score.user_id = profile.id
      AND ranked_event.is_bonus = false
      AND (TG_OP <> 'DELETE' OR ranked_event.id <> OLD.id)
  ), 0)
  WHERE profile.id IN (
    SELECT score.user_id
    FROM public.event_scores AS score
    WHERE score.event_id = v_event_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_profile_totals_on_event_ranking_mode ON public.events;
CREATE TRIGGER refresh_profile_totals_on_event_ranking_mode
  AFTER UPDATE OF is_bonus ON public.events
  FOR EACH ROW
  WHEN (OLD.is_bonus IS DISTINCT FROM NEW.is_bonus)
  EXECUTE FUNCTION public.refresh_profile_totals_after_event_change();

DROP TRIGGER IF EXISTS refresh_profile_totals_before_event_delete ON public.events;
CREATE TRIGGER refresh_profile_totals_before_event_delete
  BEFORE DELETE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_profile_totals_after_event_change();

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
    pick.user_id,
    v_fight.event_id,
    SUM(pick.points_winner + pick.points_method + pick.points_round),
    COUNT(*),
    SUM(CASE
      WHEN pick.points_winner = 1
       AND pick.points_method = 1
       AND pick.points_round = 1 THEN 1
      ELSE 0
    END)
  FROM public.picks AS pick
  WHERE pick.event_id = v_fight.event_id
    AND pick.is_confirmed = true
  GROUP BY pick.user_id
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
  UPDATE public.event_scores AS score
  SET rank_position = ranked.rank_position
  FROM ranked
  WHERE score.id = ranked.id;

  UPDATE public.profiles AS profile
  SET total_points = COALESCE((
    SELECT SUM(score.total_points)
    FROM public.event_scores AS score
    JOIN public.events AS ranked_event ON ranked_event.id = score.event_id
    WHERE score.user_id = profile.id
      AND ranked_event.is_bonus = false
  ), 0)
  WHERE profile.id IN (
    SELECT DISTINCT pick.user_id
    FROM public.picks AS pick
    WHERE pick.event_id = v_fight.event_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.score_picks_for_fight(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.score_picks_for_fight(UUID) TO service_role;
