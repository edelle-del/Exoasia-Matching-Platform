-- 20260618000000_credit_requests.sql
CREATE TABLE IF NOT EXISTS public.credit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own credit requests"
ON public.credit_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit requests"
ON public.credit_requests FOR SELECT
USING (auth.uid() = user_id);

-- Trigger to auto update updated_at
CREATE TRIGGER credit_requests_updated_at
BEFORE UPDATE ON public.credit_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
