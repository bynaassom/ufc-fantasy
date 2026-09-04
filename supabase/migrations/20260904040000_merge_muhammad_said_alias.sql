-- UFC used "Muhammad Said" in pre-fight editorial and "Muhammad Saidov" in
-- the official result. Consolidate the unused pre-fight alias into the result
-- identity that owns the fight, picks, and official portrait.

SELECT public.merge_fighter_records(
  '46670b7f-2967-4a95-a2c9-8b50d4405cef',
  'f4ec39e0-5f1e-47e5-8a18-601872814cf0'
);
