-- Persistent automation heartbeats make missed cron executions visible, while
-- short result-sync leases prevent the permanent poller and its fallback from
-- processing the same event concurrently.

CREATE TABLE IF NOT EXISTS public.automation_health (
  automation_key TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'warning', 'error')),
  expected_interval_minutes INTEGER NOT NULL CHECK (expected_interval_minutes > 0),
  last_started_at TIMESTAMPTZ,
  last_succeeded_at TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ,
  last_duration_ms INTEGER,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automation_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_health_admin_all" ON public.automation_health;
CREATE POLICY "automation_health_admin_all" ON public.automation_health
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION public.record_automation_health(
  p_automation_key TEXT,
  p_status TEXT,
  p_expected_interval_minutes INTEGER,
  p_started_at TIMESTAMPTZ,
  p_duration_ms INTEGER DEFAULT NULL,
  p_error TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_status NOT IN ('running', 'success', 'warning', 'error') THEN
    RAISE EXCEPTION 'Invalid automation status: %', p_status;
  END IF;

  INSERT INTO public.automation_health (
    automation_key,
    status,
    expected_interval_minutes,
    last_started_at,
    last_succeeded_at,
    last_failed_at,
    last_duration_ms,
    consecutive_failures,
    last_error,
    details,
    updated_at
  ) VALUES (
    p_automation_key,
    p_status,
    p_expected_interval_minutes,
    p_started_at,
    CASE WHEN p_status IN ('success', 'warning') THEN NOW() ELSE NULL END,
    CASE WHEN p_status = 'error' THEN NOW() ELSE NULL END,
    p_duration_ms,
    CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
    p_error,
    COALESCE(p_details, '{}'::JSONB),
    NOW()
  )
  ON CONFLICT (automation_key) DO UPDATE SET
    status = EXCLUDED.status,
    expected_interval_minutes = EXCLUDED.expected_interval_minutes,
    last_started_at = EXCLUDED.last_started_at,
    last_succeeded_at = CASE
      WHEN EXCLUDED.status IN ('success', 'warning') THEN NOW()
      ELSE public.automation_health.last_succeeded_at
    END,
    last_failed_at = CASE
      WHEN EXCLUDED.status = 'error' THEN NOW()
      ELSE public.automation_health.last_failed_at
    END,
    last_duration_ms = EXCLUDED.last_duration_ms,
    consecutive_failures = CASE
      WHEN EXCLUDED.status = 'error' THEN public.automation_health.consecutive_failures + 1
      WHEN EXCLUDED.status IN ('success', 'warning') THEN 0
      ELSE public.automation_health.consecutive_failures
    END,
    last_error = CASE
      WHEN EXCLUDED.status = 'error' THEN EXCLUDED.last_error
      WHEN EXCLUDED.status IN ('success', 'warning') THEN NULL
      ELSE public.automation_health.last_error
    END,
    details = EXCLUDED.details,
    updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.record_automation_health(TEXT, TEXT, INTEGER, TIMESTAMPTZ, INTEGER, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_automation_health(TEXT, TEXT, INTEGER, TIMESTAMPTZ, INTEGER, TEXT, JSONB)
  TO service_role;

CREATE TABLE IF NOT EXISTS public.result_sync_leases (
  event_id UUID PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.result_sync_leases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "result_sync_leases_admin_all" ON public.result_sync_leases;
CREATE POLICY "result_sync_leases_admin_all" ON public.result_sync_leases
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION public.claim_result_sync(
  p_event_id UUID,
  p_lease_seconds INTEGER DEFAULT 90
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed UUID;
BEGIN
  INSERT INTO public.result_sync_leases (event_id, claimed_at, expires_at)
  VALUES (
    p_event_id,
    NOW(),
    NOW() + make_interval(secs => GREATEST(15, LEAST(p_lease_seconds, 300)))
  )
  ON CONFLICT (event_id) DO UPDATE SET
    claimed_at = EXCLUDED.claimed_at,
    expires_at = EXCLUDED.expires_at
  WHERE public.result_sync_leases.expires_at <= NOW()
  RETURNING event_id INTO v_claimed;

  RETURN v_claimed IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_result_sync(p_event_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.result_sync_leases WHERE event_id = p_event_id;
$$;

REVOKE ALL ON FUNCTION public.claim_result_sync(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_result_sync(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_result_sync(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_result_sync(UUID) TO service_role;
