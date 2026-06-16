-- Allow cofounders to read their linked projects
DROP POLICY IF EXISTS "Cofounders can read their linked projects" ON public.projects;
CREATE POLICY "Cofounders can read their linked projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cofounder_links cl
      WHERE cl.project_id = public.projects.id
      AND cl.cofounder_profile_id = auth.uid()
    )
  );

-- Allow cofounders to read match scores for their linked projects
DROP POLICY IF EXISTS "Cofounders read match scores for linked projects" ON public.project_match_scores;
CREATE POLICY "Cofounders read match scores for linked projects"
  ON public.project_match_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cofounder_links cl
      WHERE cl.project_id = public.project_match_scores.project_id
      AND cl.cofounder_profile_id = auth.uid()
    )
  );

-- Allow cofounders to read deal cards for their linked projects
DROP POLICY IF EXISTS "Cofounders read deal cards for linked projects" ON public.deal_cards;
CREATE POLICY "Cofounders read deal cards for linked projects"
  ON public.deal_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cofounder_links cl
      WHERE cl.project_id = public.deal_cards.project_id
      AND cl.cofounder_profile_id = auth.uid()
    )
  );
