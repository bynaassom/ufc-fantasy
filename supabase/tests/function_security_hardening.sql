-- Run after 20260919000001 as postgres in the Supabase SQL Editor.
-- Assertions fail with an exception; all test objects are rolled back.
BEGIN;

DO $test$
DECLARE
  signature regprocedure;
  client_role text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.increment_profile_xp(uuid,integer)'::regprocedure,
    'public.update_profile_streak(uuid,integer,integer)'::regprocedure,
    'public.update_follow_counters(uuid,uuid,boolean)'::regprocedure,
    'public.handle_new_user()'::regprocedure,
    'public.update_updated_at()'::regprocedure,
    'public.log_pick_activity()'::regprocedure
  ] LOOP
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(client_role, signature, 'EXECUTE') THEN
        RAISE EXCEPTION '% still has EXECUTE on %', client_role, signature;
      END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role cannot execute %', signature;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p, unnest(p.proconfig) setting
      WHERE p.oid = signature AND setting LIKE 'search_path=%'
    ) THEN
      RAISE EXCEPTION 'Missing fixed search_path on %', signature;
    END IF;
  END LOOP;

  FOREACH signature IN ARRAY ARRAY[
    'public.is_admin()'::regprocedure,
    'public.picks_are_open(uuid)'::regprocedure,
    'public.picks_are_locked(uuid)'::regprocedure,
    'public.pick_update_is_safe(uuid,uuid,uuid,uuid,integer,integer,integer)'::regprocedure
  ] LOOP
    IF NOT has_function_privilege('authenticated', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'RLS helper permission lost: %', signature;
    END IF;
  END LOOP;

  IF has_schema_privilege('anon', 'public', 'CREATE')
    OR has_schema_privilege('authenticated', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Client can still create objects in public';
  END IF;
END;
$test$;

-- Exercise a real existing trigger function after its EXECUTE was revoked.
CREATE TEMP TABLE advisor_trigger_probe (id integer, updated_at timestamptz);
INSERT INTO advisor_trigger_probe VALUES (1, NULL);
CREATE TRIGGER advisor_trigger_probe_update
  BEFORE UPDATE ON advisor_trigger_probe
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
GRANT SELECT, UPDATE ON advisor_trigger_probe TO authenticated;
SET LOCAL ROLE authenticated;
UPDATE advisor_trigger_probe SET id = 2;
RESET ROLE;
DO $test$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM advisor_trigger_probe WHERE id = 2 AND updated_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Trigger stopped working after EXECUTE revocation';
  END IF;
END;
$test$;

ROLLBACK;
