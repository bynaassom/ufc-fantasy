-- Keep operational history useful without allowing cron polling to dominate
-- database storage. Security/audit rows and explicit sync alerts are preserved.

CREATE INDEX IF NOT EXISTS idx_activity_logs_action_created_at
  ON public.activity_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_result_event_step_created_at
  ON public.activity_logs (
    (details ->> 'event_id'),
    (details ->> 'step'),
    created_at DESC
  )
  WHERE action = 'admin_sync_results';

CREATE OR REPLACE FUNCTION public.record_rate_limited_activity_log(
  p_action TEXT,
  p_details JSONB,
  p_min_interval_seconds INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_interval_seconds INTEGER := GREATEST(0, LEAST(p_min_interval_seconds, 86400));
  v_event_id TEXT := COALESCE(p_details ->> 'event_id', '');
  v_step TEXT := COALESCE(p_details ->> 'step', '');
BEGIN
  IF p_action NOT IN ('admin_sync_results', 'admin_sync_alert') THEN
    RAISE EXCEPTION 'Unsupported rate-limited action: %', p_action;
  END IF;

  IF v_interval_seconds > 0 THEN
    -- Serialize identical event/step checks so overlapping serverless calls
    -- cannot both insert the same routine heartbeat.
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        p_action || ':' || v_event_id || ':' || v_step,
        0
      )
    );

    IF EXISTS (
      SELECT 1
      FROM public.activity_logs
      WHERE action = p_action
        AND COALESCE(details ->> 'event_id', '') = v_event_id
        AND COALESCE(details ->> 'step', '') = v_step
        AND created_at >= pg_catalog.now() - pg_catalog.make_interval(secs => v_interval_seconds)
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  INSERT INTO public.activity_logs (user_id, action, details)
  VALUES (NULL, p_action, COALESCE(p_details, '{}'::JSONB));

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_rate_limited_activity_log(TEXT, JSONB, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_rate_limited_activity_log(TEXT, JSONB, INTEGER)
  TO service_role;

CREATE OR REPLACE FUNCTION public.prune_expired_operational_logs(
  p_retention_days INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_retention_days INTEGER := GREATEST(30, LEAST(p_retention_days, 3650));
  v_cutoff TIMESTAMPTZ := pg_catalog.now() - pg_catalog.make_interval(days => v_retention_days);
  v_activity_logs_deleted INTEGER := 0;
  v_card_runs_deleted INTEGER := 0;
BEGIN
  DELETE FROM public.activity_logs AS log
  WHERE log.user_id IS NULL
    AND log.suspicious = FALSE
    AND log.action IN (
      'admin_sync_results',
      'admin_sync_events',
      'admin_preview_events',
      'admin_update_card',
      'admin_sync_odds'
    )
    AND (
      log.created_at < v_cutoff
      OR EXISTS (
        SELECT 1
        FROM public.events AS event
        WHERE event.id::TEXT = log.details ->> 'event_id'
          AND event.event_date < v_cutoff
      )
    );
  GET DIAGNOSTICS v_activity_logs_deleted = ROW_COUNT;

  DELETE FROM public.card_verification_runs AS run
  WHERE run.started_at < v_cutoff
    OR EXISTS (
      SELECT 1
      FROM public.events AS event
      WHERE event.id = run.event_id
        AND event.event_date < v_cutoff
    );
  GET DIAGNOSTICS v_card_runs_deleted = ROW_COUNT;

  RETURN pg_catalog.jsonb_build_object(
    'retention_days', v_retention_days,
    'activity_logs_deleted', v_activity_logs_deleted,
    'card_verification_runs_deleted', v_card_runs_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prune_expired_operational_logs(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_expired_operational_logs(INTEGER)
  TO service_role;

COMMENT ON FUNCTION public.prune_expired_operational_logs(INTEGER) IS
  'Deletes non-user operational logs after the retention window or once their event is older than it.';
