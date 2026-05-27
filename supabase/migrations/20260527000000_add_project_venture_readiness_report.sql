ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS venture_readiness_report jsonb;