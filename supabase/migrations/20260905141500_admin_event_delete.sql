-- Event deletion cascades through picks. The normal pick lock trigger must
-- remain active for users, but an authenticated admin deletion needs the same
-- transaction-local bypass used by result scoring.

CREATE OR REPLACE FUNCTION public.delete_event_cascade(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_id UUID;
BEGIN
  PERFORM set_config('app.scoring_picks', 'on', true);

  DELETE FROM public.events
  WHERE id = p_event_id
  RETURNING id INTO v_deleted_id;

  RETURN v_deleted_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_event_cascade(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_event_cascade(UUID)
  TO service_role;
