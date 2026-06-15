-- Migration to add project_id to deal cards and matches

-- 1. Add columns
ALTER TABLE public.matches ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.deal_cards ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- 2. Backfill deal_cards project_id based on project name matching title
UPDATE public.deal_cards dc
SET project_id = p.id
FROM public.projects p
WHERE dc.title = p.name AND dc.project_id IS NULL;

-- 3. Backfill matches project_id based on project_match_scores
UPDATE public.matches m
SET project_id = pms.project_id
FROM public.project_match_scores pms
WHERE (m.member_a_id = pms.investor_profile_id OR m.member_b_id = pms.investor_profile_id)
  AND (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pms.project_id AND (p.owner_id = m.member_a_id OR p.owner_id = m.member_b_id)))
  AND m.project_id IS NULL;

-- 4. Replace unique index on deal_cards
DROP INDEX IF EXISTS unique_deal_card_pair;
CREATE UNIQUE INDEX unique_deal_card_pair 
ON public.deal_cards (
    LEAST(buyer_member_id, provider_member_id),
    GREATEST(buyer_member_id, provider_member_id),
    project_id
);

-- 5. Add a unique constraint to matches to support upserts
ALTER TABLE public.matches ADD CONSTRAINT matches_member_a_member_b_project_id_key UNIQUE (member_a_id, member_b_id, project_id);
