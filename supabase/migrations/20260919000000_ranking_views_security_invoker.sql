-- Fix Supabase Advisor 0010 (Security Definer View).
-- PostgreSQL 15+: direct callers must obey the underlying tables' RLS.
-- Rankings in the app are read server-side using service_role, so they keep
-- seeing the full standings. Do not broaden profiles RLS to restore direct
-- client access: profiles also contains private fields.
-- ALTER preserves the current columns, filters, calculations and grants.
BEGIN;

ALTER VIEW public.ranking_profiles SET (security_invoker = true);
ALTER VIEW public.global_season_standings SET (security_invoker = true);
ALTER VIEW public.group_season_standings SET (security_invoker = true);

COMMIT;
