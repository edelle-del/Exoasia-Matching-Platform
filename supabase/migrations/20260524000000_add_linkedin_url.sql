ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin_url text;

COMMENT ON COLUMN public.profiles.linkedin_url IS 'LinkedIn profile URL provided during onboarding';
