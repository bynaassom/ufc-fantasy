ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS division TEXT NOT NULL DEFAULT 'Lightweight';

UPDATE public.profiles
SET division = 'Lightweight'
WHERE division IS NULL
   OR division = ''
   OR division NOT IN (
     'Heavyweight',
     'LightHeavyweight',
     'Middleweight',
     'Welterweight',
     'Lightweight',
     'Featherweight',
     'Bantamweight',
     'Flyweight',
     'Strawweight'
   );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'division_valid'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT division_valid CHECK (
      division IN (
        'Heavyweight',
        'LightHeavyweight',
        'Middleweight',
        'Welterweight',
        'Lightweight',
        'Featherweight',
        'Bantamweight',
        'Flyweight',
        'Strawweight'
      )
    );
  END IF;
END $$;

CREATE OR REPLACE VIEW public.ranking_profiles AS
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, first_name, last_name, division)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    CASE
      WHEN NEW.raw_user_meta_data->>'division' IN (
        'Heavyweight',
        'LightHeavyweight',
        'Middleweight',
        'Welterweight',
        'Lightweight',
        'Featherweight',
        'Bantamweight',
        'Flyweight',
        'Strawweight'
      ) THEN NEW.raw_user_meta_data->>'division'
      ELSE 'Lightweight'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
