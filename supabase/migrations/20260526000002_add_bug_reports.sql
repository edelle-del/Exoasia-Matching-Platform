CREATE TABLE IF NOT EXISTS public.bug_reports (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject    text        NOT NULL,
  description text       NOT NULL,
  steps      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Members can submit bug reports
DROP POLICY IF EXISTS "Members can insert bug reports" ON public.bug_reports;
CREATE POLICY "Members can insert bug reports"
  ON public.bug_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
