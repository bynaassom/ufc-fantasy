ALTER TABLE public.events ADD COLUMN ufc_live_event_id text CHECK (ufc_live_event_id IS NULL OR ufc_live_event_id ~ '^[0-9]+$');
