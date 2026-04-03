-- Corrige o trigger de delete de picks.
-- Em triggers BEFORE DELETE, retornar NEW cancela a exclusão porque NEW é null.

CREATE OR REPLACE FUNCTION public.prevent_pick_modification_after_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.picks_are_locked(OLD.event_id) THEN
    RAISE EXCEPTION 'Picks are locked for this event. Cannot modify after lock time.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;
