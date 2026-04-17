ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS division_confirmed BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET division_confirmed = false
WHERE division_confirmed IS DISTINCT FROM false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    nickname,
    first_name,
    last_name,
    division,
    division_confirmed
  )
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
    END,
    COALESCE((NEW.raw_user_meta_data->>'division_confirmed')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
