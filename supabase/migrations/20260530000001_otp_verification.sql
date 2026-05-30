-- Add OTP columns for email verification flows.
-- 6-digit numeric codes replace link-click verification for invites and nominations.

ALTER TABLE public.cofounder_invites
  ADD COLUMN IF NOT EXISTS otp VARCHAR(6);

ALTER TABLE public.portfolio_nominations
  ADD COLUMN IF NOT EXISTS otp VARCHAR(6);
