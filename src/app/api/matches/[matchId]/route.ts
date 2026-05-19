import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId } = await params;
    const { decision } = (await request.json()) as { decision: "accepted" | "declined" | "pending" };

    if (!["accepted", "declined", "pending"].includes(decision)) {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: match, error: fetchError } = await admin
      .from("matches")
      .select("id, member_a_id, member_b_id, member_a_status, member_b_status, status")
      .eq("id", matchId)
      .single();

    if (fetchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const isMemberA = match.member_a_id === user.id;
    const isMemberB = match.member_b_id === user.id;

    if (!isMemberA && !isMemberB) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["pending", "approved"].includes(match.status)) {
      return NextResponse.json({ error: "Match cannot be responded to" }, { status: 400 });
    }

    const nextMemberAStatus = isMemberA ? decision : match.member_a_status;
    const nextMemberBStatus = isMemberA ? match.member_b_status : decision;

    let nextStatus: string = match.status;
    if (nextMemberAStatus === "declined" || nextMemberBStatus === "declined") {
      nextStatus = "declined";
    } else if (nextMemberAStatus === "accepted" && nextMemberBStatus === "accepted") {
      nextStatus = "accepted";
    }

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

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
