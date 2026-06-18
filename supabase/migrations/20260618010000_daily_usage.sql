CREATE TABLE IF NOT EXISTS public.user_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  date_pht date NOT NULL,
  count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, action_type, date_pht)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_usage_user_id ON public.user_daily_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_usage_date ON public.user_daily_usage(date_pht);

ALTER TABLE public.user_daily_usage ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own daily usage
CREATE POLICY "user daily usage read"
ON public.user_daily_usage
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR authorize('profiles.admin'));

-- Only service role / admin logic should insert or update this table
-- So we do not grant insert/update to authenticated generally.
