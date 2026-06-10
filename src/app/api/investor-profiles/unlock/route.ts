import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UNLOCK_COST = 3;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { investorProfileId } = await request.json() as { investorProfileId: string };
    if (!investorProfileId) {
      return NextResponse.json({ error: "investorProfileId required" }, { status: 400 });
    }

    // Idempotent — if already unlocked, return success without charging again
    const { data: existing } = await admin
      .from("ad_credit_ledger")
      .select("id")
      .eq("member_id", user.id)
      .eq("reason", `Unlock investor profile: ${investorProfileId}`)
      .maybeSingle();

    if (existing) {
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

    if (balance < UNLOCK_COST) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${UNLOCK_COST} credits but have ${balance}.`, needed: UNLOCK_COST, balance },
        { status: 402 },
      );
    }

    const { error: deductError } = await admin.from("ad_credit_ledger").insert({
      member_id: user.id,
      change_amount: -UNLOCK_COST,
      reason: `Unlock investor profile: ${investorProfileId}`,
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
