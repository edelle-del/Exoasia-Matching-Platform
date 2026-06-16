import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BYPASS_CREDIT_GATES } from "@/lib/credits";

function canonicalizePair(idA: string, idB: string) {
  return idA < idB
    ? { member_a_id: idA, member_b_id: idB }
    : { member_a_id: idB, member_b_id: idA };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { target_id?: string };
    const { target_id } = body;

    if (!target_id) {
      return NextResponse.json({ error: "target_id required" }, { status: 400 });
    }
    if (target_id === user.id) {
      return NextResponse.json({ error: "Cannot request introduction with yourself" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify target exists
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", target_id)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const pair = canonicalizePair(user.id, target_id);
    const requesterIsA = pair.member_a_id === user.id;

    // Return early if a match already exists between this pair
    const { data: existing } = await admin
      .from("matches")
      .select("id, status")
      .eq("member_a_id", pair.member_a_id)
      .eq("member_b_id", pair.member_b_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ alreadyExists: true });
    }

    // Intros are now free, no credit deduction required

    const { error: insertError } = await admin
      .from("matches")
      .insert({
        ...pair,
        fit_score: null,
        rationale: "Community introduction request",
        status: "pending",
        member_a_status: requesterIsA ? "accepted" : "pending",
        member_b_status: requesterIsA ? "pending" : "accepted",
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
