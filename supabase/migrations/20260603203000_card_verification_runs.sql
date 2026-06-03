CREATE TABLE IF NOT EXISTS public.card_verification_runs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  verification_window TEXT NOT NULL CHECK (verification_window IN ('t72', 't18')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  summary JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS idx_card_verification_runs_event_id
  ON public.card_verification_runs(event_id);
CREATE INDEX IF NOT EXISTS idx_card_verification_runs_status
  ON public.card_verification_runs(status);

ALTER TABLE public.card_verification_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "card_verification_runs_admin_all" ON public.card_verification_runs;
CREATE POLICY "card_verification_runs_admin_all" ON public.card_verification_runs
  FOR ALL
  USING (is_admin());
