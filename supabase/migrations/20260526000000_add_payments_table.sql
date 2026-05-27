-- Payments table: records every PayMongo checkout attempt
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paymongo_session_id text NOT NULL UNIQUE,
  paymongo_payment_id text,
  type text NOT NULL CHECK (type IN ('subscription', 'credits')),
  plan_id text,       -- populated for type = 'subscription'
  package_id text,    -- populated for type = 'credits'
  amount integer NOT NULL, -- in centavos
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

-- Subscription state on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

-- Indexes
CREATE INDEX IF NOT EXISTS payments_member_id_idx ON public.payments (member_id);
CREATE INDEX IF NOT EXISTS payments_session_id_idx ON public.payments (paymongo_session_id);

-- RLS: members can read their own payments; service role handles writes via webhook
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_read_own_payments" ON public.payments;
CREATE POLICY "members_read_own_payments"
  ON public.payments FOR SELECT
  USING (member_id = auth.uid());
