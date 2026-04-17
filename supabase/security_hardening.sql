-- Endurece callback/scraping no app e reduz exposição de profiles no banco.
-- Rode no SQL Editor do Supabase.

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
ON public.profiles
FOR SELECT
USING (public.is_admin());

DROP VIEW IF EXISTS public.ranking_profiles;

CREATE VIEW public.ranking_profiles AS
SELECT
  id,
  nickname,
  first_name,
  last_name,
  total_points,
  division
FROM public.profiles
WHERE is_banned = false;

GRANT SELECT ON public.ranking_profiles TO authenticated;
REVOKE ALL ON public.ranking_profiles FROM anon;
