-- User-selected live alerts for a whole event or individual fights.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'fight_up_next';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'fight_starting';

CREATE TABLE IF NOT EXISTS public.fight_alert_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  fight_id UUID REFERENCES public.fights(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fight_alert_event_subscription
  ON public.fight_alert_subscriptions(user_id, event_id)
  WHERE fight_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fight_alert_fight_subscription
  ON public.fight_alert_subscriptions(user_id, event_id, fight_id)
  WHERE fight_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fight_alert_subscriptions_event
  ON public.fight_alert_subscriptions(event_id);

CREATE INDEX IF NOT EXISTS idx_fight_alert_subscriptions_fight
  ON public.fight_alert_subscriptions(fight_id)
  WHERE fight_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_fight_alert_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.fight_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.fights
    WHERE id = NEW.fight_id
      AND event_id = NEW.event_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Fight alert subscription must reference a fight from the selected event.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_fight_alert_event
  ON public.fight_alert_subscriptions;
CREATE TRIGGER validate_fight_alert_event
  BEFORE INSERT OR UPDATE OF event_id, fight_id
  ON public.fight_alert_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_fight_alert_event();

ALTER TABLE public.fight_alert_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fight_alert_subscriptions_select_own"
  ON public.fight_alert_subscriptions;
CREATE POLICY "fight_alert_subscriptions_select_own"
  ON public.fight_alert_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fight_alert_subscriptions_insert_own"
  ON public.fight_alert_subscriptions;
CREATE POLICY "fight_alert_subscriptions_insert_own"
  ON public.fight_alert_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fight_alert_subscriptions_delete_own"
  ON public.fight_alert_subscriptions;
CREATE POLICY "fight_alert_subscriptions_delete_own"
  ON public.fight_alert_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fight_alert_subscriptions_admin_all"
  ON public.fight_alert_subscriptions;
CREATE POLICY "fight_alert_subscriptions_admin_all"
  ON public.fight_alert_subscriptions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
