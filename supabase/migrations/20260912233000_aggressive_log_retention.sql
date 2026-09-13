-- ============================================================
-- AGGRESSIVE OPERATIONAL LOG RETENTION (FREE TIER OPTIMIZATION)
-- Reduces log accumulation and reclaims memory/disk space.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prune_expired_operational_logs(
  p_retention_days INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_retention_days INTEGER := GREATEST(1, LEAST(p_retention_days, 3650));
  v_cutoff TIMESTAMPTZ := pg_catalog.now() - pg_catalog.make_interval(days => v_retention_days);
  v_activity_logs_deleted INTEGER := 0;
  v_card_runs_deleted INTEGER := 0;
  v_notifications_deleted INTEGER := 0;
BEGIN
  -- Delete operational activity logs older than retention window (including admin-triggered operational syncs)
  DELETE FROM public.activity_logs AS log
  WHERE log.suspicious = FALSE
    AND log.action IN (
      'admin_sync_results',
      'admin_sync_events',
      'admin_preview_events',
      'admin_update_card',
      'admin_sync_odds',
      'admin_sync_alert'
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

  -- Delete old card verification runs
  DELETE FROM public.card_verification_runs AS run
  WHERE run.started_at < v_cutoff
    OR EXISTS (
      SELECT 1
      FROM public.events AS event
      WHERE event.id = run.event_id
        AND event.event_date < v_cutoff
    );
  GET DIAGNOSTICS v_card_runs_deleted = ROW_COUNT;

  -- Delete read notifications older than 30 days
  DELETE FROM public.notifications
  WHERE read = TRUE
    AND created_at < (pg_catalog.now() - INTERVAL '30 days');
  GET DIAGNOSTICS v_notifications_deleted = ROW_COUNT;

  RETURN pg_catalog.jsonb_build_object(
    'retention_days', v_retention_days,
    'activity_logs_deleted', v_activity_logs_deleted,
    'card_verification_runs_deleted', v_card_runs_deleted,
    'notifications_deleted', v_notifications_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prune_expired_operational_logs(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_expired_operational_logs(INTEGER)
  TO service_role;
