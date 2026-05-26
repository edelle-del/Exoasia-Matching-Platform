ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS venture_readiness_report jsonb;
