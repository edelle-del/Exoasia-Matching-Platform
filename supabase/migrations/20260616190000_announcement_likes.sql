CREATE TABLE IF NOT EXISTS public.announcement_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

ALTER TABLE public.announcement_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view announcement likes"
    ON public.announcement_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own likes"
    ON public.announcement_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
    ON public.announcement_likes FOR DELETE
    USING (auth.uid() = user_id);
