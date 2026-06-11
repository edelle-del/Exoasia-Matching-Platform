import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductCredits, InsufficientCreditsError, CREDIT_COSTS } from "@/lib/credits";

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

    // Idempotent — 0-amount entries (paid subscribers) and negative entries (free tier)
    // both satisfy this check, so we never double-charge
    const { data: existing } = await admin
      .from("ad_credit_ledger")
      .select("id")
      .eq("member_id", user.id)
      .eq("reason", `${CREDIT_COSTS.UNLOCK_INVESTOR_PROFILE.reason}: ${investorProfileId}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, alreadyUnlocked: true });
    }

    try {
      await deductCredits(user.id, "UNLOCK_INVESTOR_PROFILE", investorProfileId);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        return NextResponse.json(
          { error: `Insufficient credits. You need ${err.required} credits but have ${err.balance}.`, needed: err.required, balance: err.balance },
          { status: 402 },
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true, alreadyUnlocked: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
