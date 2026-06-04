-- Ecosystem partner AI mandate-fit scores for portfolio startup projects

CREATE TABLE IF NOT EXISTS public.ecosystem_match_scores (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  eco_partner_profile_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fit_score              INTEGER     NOT NULL CHECK (fit_score >= 0 AND fit_score <= 100),
  summary                TEXT,
  rationale              JSONB,
  generated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, eco_partner_profile_id)
);

ALTER TABLE public.ecosystem_match_scores ENABLE ROW LEVEL SECURITY;

-- Eco partner can read and write their own scores
DROP POLICY IF EXISTS "Eco partner manages own scores" ON public.ecosystem_match_scores;
CREATE POLICY "Eco partner manages own scores"
  ON public.ecosystem_match_scores FOR ALL
  USING  (eco_partner_profile_id = auth.uid())
  WITH CHECK (eco_partner_profile_id = auth.uid());

-- Project owner can see eco scores on their own project
DROP POLICY IF EXISTS "Project owner reads eco scores" ON public.ecosystem_match_scores;
CREATE POLICY "Project owner reads eco scores"
  ON public.ecosystem_match_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );
