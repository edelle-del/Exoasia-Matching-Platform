-- 1. Persistent Unlocked Assets Tracking
CREATE TABLE IF NOT EXISTS public.user_unlocked_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL, -- e.g., 'match', 'pitch_deck', 'financials', 'community_profile', 'investor_profile'
    asset_id TEXT NOT NULL,   -- The ID of the specific asset being unlocked
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, asset_type, asset_id)
);

ALTER TABLE public.user_unlocked_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own unlocked assets" 
    ON public.user_unlocked_assets FOR SELECT 
    USING (auth.uid() = user_id);

-- 2. Weekly Quota Tracking
CREATE TABLE IF NOT EXISTS public.user_weekly_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- e.g., 'view_pitch_deck', 'view_investor_profile'
    week_start TIMESTAMPTZ NOT NULL, -- The Monday 6:00 AM of the week this usage belongs to
    usage_count INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, action_type, week_start)
);

ALTER TABLE public.user_weekly_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own usage" 
    ON public.user_weekly_usage FOR SELECT 
    USING (auth.uid() = user_id);

-- 3. Announcements Feed
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read announcements" 
    ON public.announcements FOR SELECT 
    USING (true);

-- 4. Background Jobs tracking
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    result_payload JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own jobs" 
    ON public.background_jobs FOR SELECT 
    USING (auth.uid() = user_id);

-- Update trigger for background jobs
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER background_jobs_updated_at
BEFORE UPDATE ON public.background_jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
