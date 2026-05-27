-- Project-level match scores between investors and startup projects
CREATE TABLE IF NOT EXISTS public.project_match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  investor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fit_score INTEGER NOT NULL CHECK (fit_score >= 0 AND fit_score <= 100),
  summary TEXT,
  rationale JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, investor_profile_id)
);

ALTER TABLE public.project_match_scores ENABLE ROW LEVEL SECURITY;

-- Investor can read their own scores across all projects
DROP POLICY IF EXISTS "Investor reads own project scores" ON public.project_match_scores;
CREATE POLICY "Investor reads own project scores"
  ON public.project_match_scores FOR SELECT
  USING (investor_profile_id = auth.uid());

-- Project owner can read all investor scores for their project
DROP POLICY IF EXISTS "Project owner reads scores for own project" ON public.project_match_scores;
CREATE POLICY "Project owner reads scores for own project"
  ON public.project_match_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );
