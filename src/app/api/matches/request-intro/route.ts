import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function canonicalizePair(idA: string, idB: string) {
  return idA < idB
    ? { member_a_id: idA, member_b_id: idB }
    : { member_a_id: idB, member_b_id: idA };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { project_id?: string; investor_profile_id?: string };
    const { project_id, investor_profile_id } = body;
    if (!project_id || !investor_profile_id) {
      return NextResponse.json(
        { error: "project_id and investor_profile_id required" },
        { status: 400 },
      );
    }

    // Verify caller is either the project owner (startup) or the investor
    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isStartup = project.owner_id === user.id;
    const isInvestor = investor_profile_id === user.id;

    if (!isStartup && !isInvestor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Startups pay 7 cr, investors pay 5 cr per intro request
    const INTRO_COST = isStartup ? 7 : 5;

    // Idempotent — don't charge if match already exists
    const { data: existingMatch } = await admin
      .from("matches")
      .select("id")
      .or(
        `and(member_a_id.eq.${project.owner_id},member_b_id.eq.${investor_profile_id}),and(member_a_id.eq.${investor_profile_id},member_b_id.eq.${project.owner_id})`,
      )
      .maybeSingle();

    if (!existingMatch) {
      const { data: ledgerRows } = await admin
        .from("ad_credit_ledger")
        .select("change_amount")
        .eq("member_id", user.id);

      const balance = (ledgerRows ?? []).reduce(
        (sum, r) => sum + Number(r.change_amount ?? 0),
        0,
      );

      if (balance < INTRO_COST) {
        return NextResponse.json(
          { error: `Insufficient credits. You need ${INTRO_COST} credits but have ${balance}.`, needed: INTRO_COST, balance },
          { status: 402 },
        );
      }

      const { error: deductError } = await admin.from("ad_credit_ledger").insert({
        member_id: user.id,
        change_amount: -INTRO_COST,
        reason: isStartup
          ? `Intro request to investor: ${investor_profile_id}`
          : `Intro request to startup: ${project.owner_id}`,
      });

      if (deductError) {
        return NextResponse.json({ error: deductError.message }, { status: 500 });
      }
    }

    // Carry over fit_score + summary from the project score if it exists
    const { data: scoreRow } = await admin
      .from("project_match_scores")
      .select("fit_score, summary")
      .eq("project_id", project_id)
      .eq("investor_profile_id", investor_profile_id)
      .single();

    const startupId = project.owner_id;
    const investorId = investor_profile_id;
    const pair = canonicalizePair(startupId, investorId);

    // Requester side is auto-accepted; counterpart still needs to respond
    const requesterIsA = pair.member_a_id === user.id;
    const member_a_status = requesterIsA ? "accepted" : "pending";
    const member_b_status = requesterIsA ? "pending" : "accepted";

    const { error: upsertError } = await admin
      .from("matches")
      .upsert(
        [
          {
            ...pair,
            fit_score: scoreRow?.fit_score ?? null,
            summary: scoreRow?.summary ?? null,
            rationale: "Member-initiated connection from project match",
            status: "pending",
            member_a_status,
            member_b_status,
            created_at: new Date().toISOString(),
          },
        ],
        // ignoreDuplicates: don't overwrite a match that already exists
        { onConflict: "member_a_id,member_b_id", ignoreDuplicates: true },
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const { data: match } = await admin
      .from("matches")
      .select("id, status, member_a_status, member_b_status")
      .eq("member_a_id", pair.member_a_id)
      .eq("member_b_id", pair.member_b_id)
      .single();

    // Create a deal card in "Qualified" if one doesn't already exist for this pair.
    // Wrapped in try/catch so a missing DB constraint doesn't block the match creation.
    try {
      const { data: existingCard } = await admin
        .from("deal_cards")
        .select("id")
        .eq("buyer_member_id", startupId)
        .eq("provider_member_id", investorId)
        .maybeSingle();

      if (!existingCard) {
        const { data: projectRow } = await admin
          .from("projects")
          .select("name")
          .eq("id", project_id)
          .single();

        await admin.from("deal_cards").insert({
          buyer_member_id: startupId,
          provider_member_id: investorId,
          title: projectRow?.name ?? "Untitled project",
          stage: "discover",
          fit_score: scoreRow?.fit_score ?? null,
          confidence: "Medium",
          last_updated_at: new Date().toISOString(),
        });
      }
    } catch {
      // Deal card creation is non-critical — match creation already succeeded
    }

    return NextResponse.json({ success: true, match });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
