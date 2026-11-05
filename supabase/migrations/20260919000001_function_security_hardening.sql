-- Harden the functions reported by the 2026-09-19 Supabase Advisor export.
-- Preserve deployed bodies (including functions created outside this repo).
BEGIN;

-- A fixed search_path is safe only when clients cannot create objects in it.
-- This does not revoke table DML, schema USAGE, or administrator ownership.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

DO $hardening$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY (ARRAY[
        'pick_update_is_safe', 'update_profile_streak', 'update_follow_counters',
        'handle_new_user', 'recalc_pick_total_points', 'update_updated_at',
        'log_pick_activity', 'picks_are_locked', 'set_picks_lock_at',
        'open_next_event_picks', 'increment_profile_xp'
      ])
      AND NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS setting
        WHERE setting LIKE 'search_path=%'
      )
  LOOP
    -- Legacy bodies use unqualified public tables. Keep those working, while
    -- resolving built-ins first and temporary objects last (never implicitly first).
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public, pg_temp', target.signature);
  END LOOP;

  FOR target IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY (ARRAY[
        'increment_profile_xp', 'update_profile_streak', 'update_follow_counters',
        'open_next_event_picks', 'audit_pick_version', 'guard_event_completion',
        'handle_new_user', 'log_pick_activity', 'prevent_pick_modification_after_lock',
        'refresh_profile_totals_after_event_change', 'rls_auto_enable',
        'validate_fight_alert_event', 'recalc_pick_total_points',
        'update_updated_at', 'set_picks_lock_at'
      ])
  LOOP
    -- PUBLIC grants are inherited by anon/authenticated; revoke all three.
    -- Existing triggers remain attached and fire normally. Owners retain access.
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', target.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', target.signature);
  END LOOP;
END;
$hardening$;

-- Intentional exceptions: is_admin, picks_are_open, picks_are_locked and
-- pick_update_is_safe are read-only helpers used by existing RLS policies.
-- Keep their EXECUTE permissions: revoking them can break normal table access.
-- Missing legacy functions are skipped, and overloads of listed names are covered.
NOTIFY pgrst, 'reload schema';
COMMIT;
