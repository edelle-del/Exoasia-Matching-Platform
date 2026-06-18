-- Threads (Twitter-style community feed)
CREATE TABLE IF NOT EXISTS public.threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view threads"
    ON public.threads FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own threads"
    ON public.threads FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own threads"
    ON public.threads FOR DELETE
    USING (auth.uid() = author_id);

-- Thread replies
CREATE TABLE IF NOT EXISTS public.thread_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.thread_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view replies"
    ON public.thread_replies FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own replies"
    ON public.thread_replies FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own replies"
    ON public.thread_replies FOR DELETE
    USING (auth.uid() = author_id);

-- Thread likes
CREATE TABLE IF NOT EXISTS public.thread_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(thread_id, user_id)
);

ALTER TABLE public.thread_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view thread likes"
    ON public.thread_likes FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own thread likes"
    ON public.thread_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thread likes"
    ON public.thread_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Feature requests
CREATE TABLE IF NOT EXISTS public.feature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'planned', 'in_progress', 'done', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view feature requests"
    ON public.feature_requests FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own feature requests"
    ON public.feature_requests FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own feature requests"
    ON public.feature_requests FOR DELETE
    USING (auth.uid() = author_id);

-- Feature request votes
CREATE TABLE IF NOT EXISTS public.feature_request_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(request_id, user_id)
);

ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view feature request votes"
    ON public.feature_request_votes FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own votes"
    ON public.feature_request_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
    ON public.feature_request_votes FOR DELETE
    USING (auth.uid() = user_id);
