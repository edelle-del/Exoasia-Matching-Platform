import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BYPASS_CREDIT_GATES } from "@/lib/credits";
import { checkWeeklyQuota, incrementWeeklyQuota } from "@/lib/quotas";

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

    // Check free unlocks used this week via quota
    const quota = await checkWeeklyQuota(user.id, "unlock_community_profile");
    const isFree = quota.remaining > 0;
    const cost = isFree ? 0 : 1;

    // Check balance if not free
    if (cost > 0) {
      const { data: ledgerRows } = await admin
        .from("ad_credit_ledger")
        .select("change_amount")
        .eq("member_id", user.id);

      const balance = (ledgerRows ?? []).reduce(
        (sum, r) => sum + Number(r.change_amount ?? 0),
        0,
      );

      if (!BYPASS_CREDIT_GATES && balance < cost) {
        return NextResponse.json(
          { error: `Insufficient credits. You need ${cost} credit to unlock this profile.`, needed: cost, balance },
          { status: 402 },
        );
      }
    }

    const { error: deductError } = await admin.from("ad_credit_ledger").insert({
      member_id: user.id,
      change_amount: -cost,
      reason: `Unlock community profile: ${memberId}`,
    });

    if (deductError) {
      return NextResponse.json({ error: deductError.message }, { status: 500 });
    }

    if (isFree) {
      await incrementWeeklyQuota(user.id, "unlock_community_profile");
    }

    return NextResponse.json({ success: true, alreadyUnlocked: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
