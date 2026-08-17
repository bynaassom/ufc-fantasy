-- Immutable per-pick audit trail and API save-attempt telemetry.

ALTER TABLE public.picks
  ADD COLUMN IF NOT EXISTS last_save_request_id UUID,
  ADD COLUMN IF NOT EXISTS last_save_source TEXT,
  ADD COLUMN IF NOT EXISTS client_selected_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.pick_save_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL UNIQUE,
  client_request_id UUID,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  event_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'saved', 'rejected')),
  source TEXT NOT NULL DEFAULT 'autosave',
  pick_count INTEGER NOT NULL DEFAULT 0 CHECK (pick_count >= 0),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  client_saved_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS public.pick_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pick_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  fight_id UUID NOT NULL,
  operation TEXT NOT NULL
    CHECK (operation IN ('insert', 'update', 'delete', 'snapshot')),
  before_data JSONB,
  after_data JSONB,
  changed_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  request_id UUID,
  source TEXT NOT NULL DEFAULT 'unknown',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pick_attempts_user_event_received
  ON public.pick_save_attempts(user_id, event_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_pick_attempts_event_status
  ON public.pick_save_attempts(event_id, status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_pick_versions_user_event_occurred
  ON public.pick_versions(user_id, event_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pick_versions_pick_occurred
  ON public.pick_versions(pick_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pick_versions_request
  ON public.pick_versions(request_id)
  WHERE request_id IS NOT NULL;

ALTER TABLE public.pick_save_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pick_save_attempts_admin_select" ON public.pick_save_attempts;
CREATE POLICY "pick_save_attempts_admin_select"
  ON public.pick_save_attempts FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "pick_versions_admin_select" ON public.pick_versions;
CREATE POLICY "pick_versions_admin_select"
  ON public.pick_versions FOR SELECT
  USING (public.is_admin());

GRANT SELECT ON public.pick_save_attempts, public.pick_versions TO authenticated;
GRANT ALL ON public.pick_save_attempts, public.pick_versions TO service_role;

CREATE OR REPLACE FUNCTION public.reject_pick_version_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Pick audit versions are immutable.';
END;
$$;

DROP TRIGGER IF EXISTS keep_pick_versions_immutable ON public.pick_versions;
CREATE TRIGGER keep_pick_versions_immutable
  BEFORE UPDATE OR DELETE ON public.pick_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_pick_version_mutation();

CREATE OR REPLACE FUNCTION public.audit_pick_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
  v_changed_fields TEXT[];
  v_request_id UUID;
  v_source TEXT;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_before := jsonb_build_object(
      'picked_winner_id', OLD.picked_winner_id,
      'picked_method', OLD.picked_method,
      'picked_round', OLD.picked_round,
      'client_selected_at', OLD.client_selected_at,
      'is_confirmed', OLD.is_confirmed,
      'confirmed_at', OLD.confirmed_at
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_after := jsonb_build_object(
      'picked_winner_id', NEW.picked_winner_id,
      'picked_method', NEW.picked_method,
      'picked_round', NEW.picked_round,
      'client_selected_at', NEW.client_selected_at,
      'is_confirmed', NEW.is_confirmed,
      'confirmed_at', NEW.confirmed_at
    );
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_request_id := NEW.last_save_request_id;
    v_source := COALESCE(NULLIF(NEW.last_save_source, ''), 'unknown');
  ELSIF TG_OP = 'UPDATE'
    AND NEW.last_save_request_id IS DISTINCT FROM OLD.last_save_request_id THEN
    v_request_id := NEW.last_save_request_id;
    v_source := COALESCE(NULLIF(NEW.last_save_source, ''), 'unknown');
  ELSE
    -- Never attach a later manual mutation/deletion to an earlier autosave.
    v_request_id := NULL;
    v_source := 'unknown';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_changed_fields := array_remove(ARRAY[
      CASE WHEN OLD.picked_winner_id IS DISTINCT FROM NEW.picked_winner_id THEN 'picked_winner_id' END,
      CASE WHEN OLD.picked_method IS DISTINCT FROM NEW.picked_method THEN 'picked_method' END,
      CASE WHEN OLD.picked_round IS DISTINCT FROM NEW.picked_round THEN 'picked_round' END,
      CASE WHEN OLD.client_selected_at IS DISTINCT FROM NEW.client_selected_at THEN 'client_selected_at' END,
      CASE WHEN OLD.is_confirmed IS DISTINCT FROM NEW.is_confirmed THEN 'is_confirmed' END,
      CASE WHEN OLD.confirmed_at IS DISTINCT FROM NEW.confirmed_at THEN 'confirmed_at' END
    ], NULL);

    -- Scoring and housekeeping updates do not belong to the pick decision trail.
    IF cardinality(v_changed_fields) = 0 THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    v_changed_fields := ARRAY[
      'picked_winner_id', 'picked_method', 'picked_round', 'client_selected_at', 'is_confirmed', 'confirmed_at'
    ];
  ELSE
    v_changed_fields := ARRAY['deleted'];
  END IF;

  INSERT INTO public.pick_versions (
    pick_id,
    user_id,
    event_id,
    fight_id,
    operation,
    before_data,
    after_data,
    changed_fields,
    request_id,
    source,
    occurred_at
  ) VALUES (
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.fight_id ELSE NEW.fight_id END,
    lower(TG_OP),
    v_before,
    v_after,
    v_changed_fields,
    v_request_id,
    v_source,
    NOW()
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS audit_pick_versions ON public.picks;
CREATE TRIGGER audit_pick_versions
  AFTER INSERT OR UPDATE OR DELETE ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_pick_version();

-- Existing rows become a clearly labelled baseline. Past intermediate edits cannot
-- be reconstructed, so no historical claim is made before this migration.
INSERT INTO public.pick_versions (
  pick_id,
  user_id,
  event_id,
  fight_id,
  operation,
  before_data,
  after_data,
  changed_fields,
  request_id,
  source,
  occurred_at
)
SELECT
  p.id,
  p.user_id,
  p.event_id,
  p.fight_id,
  'snapshot',
  NULL,
  jsonb_build_object(
    'picked_winner_id', p.picked_winner_id,
    'picked_method', p.picked_method,
    'picked_round', p.picked_round,
    'client_selected_at', p.client_selected_at,
    'is_confirmed', p.is_confirmed,
    'confirmed_at', p.confirmed_at
  ),
  ARRAY['baseline'],
  NULL,
  'migration',
  NOW()
FROM public.picks AS p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pick_versions AS version
  WHERE version.pick_id = p.id
    AND version.operation = 'snapshot'
    AND version.source = 'migration'
);
