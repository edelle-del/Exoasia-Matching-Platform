-- Allow investors to browse all active startup projects
CREATE POLICY "Investors can read all active projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND member_role = 'investor'
    )
  );
