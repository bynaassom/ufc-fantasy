UPDATE challenges
SET template_type = 'classic'
WHERE template_type IS NULL;

ALTER TABLE challenges
  ALTER COLUMN template_type SET DEFAULT 'classic',
  ALTER COLUMN template_type SET NOT NULL;

ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS challenges_template_type_check;

ALTER TABLE challenges
  ADD CONSTRAINT challenges_template_type_check
  CHECK (template_type IN ('classic', 'perfect_picks'));
