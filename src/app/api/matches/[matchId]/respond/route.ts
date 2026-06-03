import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Stage to advance the deal card to when both parties accept
const ACCEPTED_STAGE = "Intro & Scoping";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const { matchId } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { decision: "accepted" | "declined" };
    const { decision } = body;
    if (decision !== "accepted" && decision !== "declined") {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    // Fetch the match
    const { data: match } = await admin
      .from("matches")
      .select("id, member_a_id, member_b_id, status, member_a_status, member_b_status")
      .eq("id", matchId)
      .single();

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const isA = match.member_a_id === user.id;
    const isB = match.member_b_id === user.id;
    if (!isA && !isB) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const nextMemberAStatus = isA ? decision : match.member_a_status;
    const nextMemberBStatus = isA ? match.member_b_status : decision;

    let nextStatus: string = match.status;
    if (nextMemberAStatus === "declined" || nextMemberBStatus === "declined") {
      nextStatus = "declined";
    } else if (
      nextMemberAStatus === "accepted" &&
      nextMemberBStatus === "accepted"
    ) {
      nextStatus = "accepted";
    }

    const bothAccepted = nextStatus === "accepted";

    // Update match
    const { error: updateError } = await admin
      .from("matches")
      .update({
        member_a_status: nextMemberAStatus,
        member_b_status: nextMemberBStatus,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If both accepted, advance deal card from "Qualified" to "Intro & Scoping"
    if (bothAccepted) {
      await admin
        .from("deal_cards")
        .update({
          stage: ACCEPTED_STAGE,
          last_updated_at: new Date().toISOString(),
        })
        .eq("buyer_member_id", match.member_a_id < match.member_b_id ? match.member_a_id : match.member_b_id)
        .eq("provider_member_id", match.member_a_id < match.member_b_id ? match.member_b_id : match.member_a_id)
        .eq("stage", "Qualified");

      // Also try the other member order (canonical pair may be either way)
      await admin
        .from("deal_cards")
        .update({
          stage: ACCEPTED_STAGE,
          last_updated_at: new Date().toISOString(),
        })
        .or(
          `and(buyer_member_id.eq.${match.member_a_id},provider_member_id.eq.${match.member_b_id}),` +
          `and(buyer_member_id.eq.${match.member_b_id},provider_member_id.eq.${match.member_a_id})`,
        )
        .eq("stage", "Qualified");
    }

    return NextResponse.json({
      success: true,
      status: nextStatus,
      bothAccepted,
      advancedToStage: bothAccepted ? ACCEPTED_STAGE : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
