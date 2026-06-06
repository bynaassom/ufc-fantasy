ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS espn_fightcenter_url TEXT,
  ADD COLUMN IF NOT EXISTS sherdog_event_url TEXT,
  ADD COLUMN IF NOT EXISTS tapology_event_url TEXT;
