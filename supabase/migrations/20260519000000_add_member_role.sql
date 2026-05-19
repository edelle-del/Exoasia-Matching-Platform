-- Add member_role to profiles to distinguish investors from startups
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS member_role text;

COMMENT ON COLUMN public.profiles.member_role IS 'Member type: investor or startup';
