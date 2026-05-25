-- Ecosystem Partner: portfolio management schema + RLS extensions

-- ── 1. portfolio_companies join table ──────────────────────────────────────────
-- Links an ecosystem_partner profile to any number of startup profiles.

CREATE TABLE IF NOT EXISTS public.portfolio_companies (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  startup_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'inactive', 'pending')),
  nominated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes        TEXT,
  UNIQUE (partner_id, startup_id)
);

ALTER TABLE public.portfolio_companies ENABLE ROW LEVEL SECURITY;

-- Partner manages their own portfolio entries
CREATE POLICY "Partner manages own portfolio"
  ON public.portfolio_companies FOR ALL
  USING  (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

-- A startup can see which partners have listed them
CREATE POLICY "Startup sees own portfolio memberships"
  ON public.portfolio_companies FOR SELECT
  USING (startup_id = auth.uid());

-- Advisors can read everything
CREATE POLICY "Advisors read portfolio_companies"
  ON public.portfolio_companies FOR SELECT
  USING (public.authorize('profiles.read'));

-- ── 2. portfolio_nominations — invite workflow ─────────────────────────────────
-- Ecosystem partner sends an email invite; startup registers and the token links them.

CREATE TABLE IF NOT EXISTS public.portfolio_nominations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_email TEXT        NOT NULL,
  token         TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'expired')),
  message       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days')
);

ALTER TABLE public.portfolio_nominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner manages own nominations"
  ON public.portfolio_nominations FOR ALL
  USING  (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

-- ── 3. RLS: Ecosystem partner can read projects owned by portfolio startups ─────

CREATE POLICY "Ecosystem partner reads portfolio projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_companies pc
      WHERE  pc.startup_id = projects.owner_id
        AND  pc.partner_id = auth.uid()
        AND  pc.status     = 'active'
    )
  );

-- ── 4. RLS: Ecosystem partner can read match scores for portfolio projects ───────

CREATE POLICY "Ecosystem partner reads portfolio match scores"
  ON public.project_match_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.projects p
      JOIN   public.portfolio_companies pc ON pc.startup_id = p.owner_id
      WHERE  p.id            = project_match_scores.project_id
        AND  pc.partner_id   = auth.uid()
        AND  pc.status       = 'active'
    )
  );

-- ── 5. RLS: Ecosystem partner can read matches involving portfolio startups ──────

CREATE POLICY "Ecosystem partner reads portfolio matches"
  ON public.matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_companies pc
      WHERE  pc.partner_id = auth.uid()
        AND  pc.status     = 'active'
        AND  (pc.startup_id = matches.member_a_id OR pc.startup_id = matches.member_b_id)
    )
  );

-- ── 6. RLS: Ecosystem partner can read deal cards for portfolio startups ─────────

CREATE POLICY "Ecosystem partner reads portfolio deal cards"
  ON public.deal_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_companies pc
      WHERE  pc.partner_id = auth.uid()
        AND  pc.status     = 'active'
        AND  (
               pc.startup_id = deal_cards.buyer_member_id
            OR pc.startup_id = deal_cards.provider_member_id
             )
    )
  );
