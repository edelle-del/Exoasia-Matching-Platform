import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BYPASS_CREDIT_GATES } from "@/lib/credits";

const UNLOCK_COST = 2;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId } = await request.json() as { memberId: string };
    if (!memberId) {
      return NextResponse.json({ error: "memberId required" }, { status: 400 });
    }

    // Idempotent — already unlocked via community or investor matches
    const { data: existingRows } = await admin
      .from("ad_credit_ledger")
      .select("id")
      .eq("member_id", user.id)
      .or(`reason.eq.Unlock community profile: ${memberId},reason.eq.Unlock investor profile: ${memberId}`);

    if (existingRows && existingRows.length > 0) {
      return NextResponse.json({ success: true, alreadyUnlocked: true });
    }

    // Check balance
    const { data: ledgerRows } = await admin
      .from("ad_credit_ledger")
      .select("change_amount")
      .eq("member_id", user.id);

    const balance = (ledgerRows ?? []).reduce(
      (sum, r) => sum + Number(r.change_amount ?? 0),
      0,
    );

    if (!BYPASS_CREDIT_GATES && balance < UNLOCK_COST) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${UNLOCK_COST} credits but have ${balance}.`, needed: UNLOCK_COST, balance },
        { status: 402 },
      );
    }

    const { error: deductError } = await admin.from("ad_credit_ledger").insert({
      member_id: user.id,
      change_amount: -UNLOCK_COST,
      reason: `Unlock community profile: ${memberId}`,
    });

    if (deductError) {
      return NextResponse.json({ error: deductError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, alreadyUnlocked: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
