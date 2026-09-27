-- Disqualification awards the winner pick; no pick can earn method or round points.
ALTER TYPE public.fight_method ADD VALUE IF NOT EXISTS 'disqualification';
