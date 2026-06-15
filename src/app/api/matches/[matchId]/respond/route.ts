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

    let match;
    let bothAccepted = false;
    let nextStatus = "pending";
    let attempt = 0;

    while (attempt < 3) {
      // Fetch the match
      const { data: currentMatch } = await admin
        .from("matches")
        .select("id, member_a_id, member_b_id, status, member_a_status, member_b_status, updated_at")
        .eq("id", matchId)
        .single();

      if (!currentMatch) {
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
      }
      match = currentMatch;

      const isA = match.member_a_id === user.id;
      const isB = match.member_b_id === user.id;
      if (!isA && !isB) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const nextMemberAStatus = isA ? decision : match.member_a_status;
      const nextMemberBStatus = isA ? match.member_b_status : decision;

      nextStatus = match.status;
      if (nextMemberAStatus === "declined" || nextMemberBStatus === "declined") {
        nextStatus = "declined";
      } else if (
        nextMemberAStatus === "accepted" &&
        nextMemberBStatus === "accepted"
      ) {
        nextStatus = "accepted";
      }

      bothAccepted = nextStatus === "accepted";

      // Optimistic update
      const { data: updatedMatch, error: updateError } = await admin
        .from("matches")
        .update({
          member_a_status: nextMemberAStatus,
          member_b_status: nextMemberBStatus,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId)
        .eq("updated_at", match.updated_at)
        .select()
        .maybeSingle();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      if (updatedMatch) {
        break; // Success!
      }

      // Concurrency collision, retry
      attempt++;
      if (attempt === 3) {
        return NextResponse.json({ error: "Server busy. Please try again." }, { status: 409 });
      }
      
      await new Promise((r) => setTimeout(r, 150));
    }

    // If the current user accepted, advance deal card from "discover" (Qualified) to "intro" (Intro & Scoping)
    if (decision === "accepted" && match) {
      await admin
        .from("deal_cards")
        .update({
          stage: "intro",
          last_updated_at: new Date().toISOString(),
        })
        .eq("match_id", match.id)
        .eq("stage", "discover");

      // Fallback for deal cards without match_id yet (legacy)
      await admin
        .from("deal_cards")
        .update({
          stage: "intro",
          last_updated_at: new Date().toISOString(),
        })
        .or(
          `and(buyer_member_id.eq.${match.member_a_id},provider_member_id.eq.${match.member_b_id}),` +
          `and(buyer_member_id.eq.${match.member_b_id},provider_member_id.eq.${match.member_a_id})`,
        )
        .eq("stage", "discover");
    }

    return NextResponse.json({
      success: true,
      status: nextStatus,
      bothAccepted,
      advancedToStage: decision === "accepted" ? "intro" : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
