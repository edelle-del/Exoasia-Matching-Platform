-- Migration to fix duplicate deal cards and lost match updates race conditions

-- 1. Create a unique constraint to prevent duplicate deal cards between the same two members
CREATE UNIQUE INDEX IF NOT EXISTS unique_deal_card_pair 
ON public.deal_cards (
    LEAST(buyer_member_id, provider_member_id),
    GREATEST(buyer_member_id, provider_member_id)
);

-- 2. Create an RPC function to process match responses atomically with row locking
CREATE OR REPLACE FUNCTION public.respond_to_match(
    p_match_id UUID,
    p_user_id UUID,
    p_decision TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match public.matches%ROWTYPE;
    v_is_a BOOLEAN;
    v_is_b BOOLEAN;
    v_next_a_status TEXT;
    v_next_b_status TEXT;
    v_next_status TEXT;
    v_both_accepted BOOLEAN;
BEGIN
    -- Lock the row for update to prevent concurrent race conditions
    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    v_is_a := (v_match.member_a_id = p_user_id);
    v_is_b := (v_match.member_b_id = p_user_id);

    IF NOT v_is_a AND NOT v_is_b THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    IF p_decision NOT IN ('accepted', 'declined') THEN
        RAISE EXCEPTION 'Invalid decision';
    END IF;

    v_next_a_status := CASE WHEN v_is_a THEN p_decision ELSE v_match.member_a_status END;
    v_next_b_status := CASE WHEN v_is_b THEN p_decision ELSE v_match.member_b_status END;

    v_next_status := v_match.status;
    IF v_next_a_status = 'declined' OR v_next_b_status = 'declined' THEN
        v_next_status := 'declined';
    ELSIF v_next_a_status = 'accepted' AND v_next_b_status = 'accepted' THEN
        v_next_status := 'accepted';
    END IF;

    v_both_accepted := (v_next_status = 'accepted');

    -- Update match
    UPDATE public.matches
    SET 
        member_a_status = v_next_a_status,
        member_b_status = v_next_b_status,
        status = v_next_status,
        updated_at = NOW()
    WHERE id = p_match_id;

    -- Advance deal card if both accepted
    IF v_both_accepted THEN
        UPDATE public.deal_cards
        SET 
            stage = 'Intro & Scoping',
            last_updated_at = NOW()
        WHERE stage = 'Qualified' AND (
            (buyer_member_id = v_match.member_a_id AND provider_member_id = v_match.member_b_id) OR
            (buyer_member_id = v_match.member_b_id AND provider_member_id = v_match.member_a_id)
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', v_next_status,
        'bothAccepted', v_both_accepted,
        'advancedToStage', CASE WHEN v_both_accepted THEN 'Intro & Scoping' ELSE NULL END
    );
END;
$$;
