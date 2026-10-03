-- Snapshot purchase terms when checkout starts; webhook retries must not grant twice.
ALTER TABLE public.payments
  ADD COLUMN granted_credits integer CHECK (granted_credits >= 0),
  ADD COLUMN subscription_months integer CHECK (subscription_months > 0),
  ADD COLUMN purchase_label text;

-- Existing unpaid checkouts need explicit reconciliation rather than guessed terms.
CREATE OR REPLACE FUNCTION public.fulfill_checkout_payment(
  p_session_id text, p_amount integer, p_member_id text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  payment public.payments%ROWTYPE;
BEGIN
  SELECT * INTO payment FROM public.payments
    WHERE paymongo_session_id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown checkout'; END IF;
  IF payment.amount <> p_amount OR payment.member_id::text <> p_member_id THEN
    RAISE EXCEPTION 'Checkout details do not match';
  END IF;
  IF payment.status = 'paid' THEN RETURN false; END IF;
  IF payment.status <> 'pending' OR payment.granted_credits IS NULL OR payment.purchase_label IS NULL THEN
    RAISE EXCEPTION 'Checkout requires reconciliation';
  END IF;
  IF payment.type = 'subscription' THEN
    IF payment.subscription_months IS NULL OR payment.plan_id IS NULL THEN
      RAISE EXCEPTION 'Missing subscription terms';
    END IF;
    UPDATE public.profiles SET subscription_plan = payment.plan_id,
      subscription_ends_at = GREATEST(COALESCE(subscription_ends_at, now()), now())
        + make_interval(months => payment.subscription_months)
      WHERE id = payment.member_id;
  END IF;
  IF payment.granted_credits > 0 THEN
    INSERT INTO public.ad_credit_ledger (member_id, change_amount, reason)
    VALUES (payment.member_id, payment.granted_credits,
      CASE WHEN payment.type = 'subscription' THEN 'Subscription ' ELSE 'Credit purchase: ' END || payment.purchase_label);
  END IF;
  UPDATE public.payments SET status = 'paid', paid_at = now()
    WHERE id = payment.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.fulfill_checkout_payment(text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_checkout_payment(text, integer, text) TO service_role;
