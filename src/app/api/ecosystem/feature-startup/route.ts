import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BYPASS_CREDIT_GATES } from "@/lib/credits";

const FEATURE_COST = 10;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("member_role")
      .eq("id", user.id)
      .single();

    if (profile?.member_role !== "ecosystem_partner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { startup_id } = (await request.json().catch(() => ({}))) as { startup_id?: string };
    if (!startup_id) {
      return NextResponse.json({ error: "startup_id is required" }, { status: 400 });
    }

    // Idempotency: don't charge if this startup was already featured this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: recentFeature } = await admin
      .from("ad_credit_ledger")
      .select("id")
      .eq("member_id", user.id)
      .eq("reason", `Feature startup in digest: ${startup_id}`)
      .gte("created_at", monthStart.toISOString())
      .maybeSingle();

    if (recentFeature) {
      return NextResponse.json({ ok: true, already_featured: true });
    }

    const { data: ledgerRows } = await admin
      .from("ad_credit_ledger")
      .select("change_amount")
      .eq("member_id", user.id);

    const balance = (ledgerRows ?? []).reduce(
      (sum, r) => sum + Number(r.change_amount ?? 0),
      0,
    );

    if (!BYPASS_CREDIT_GATES && balance < FEATURE_COST) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${FEATURE_COST} credits but have ${balance}.`, needed: FEATURE_COST, balance },
        { status: 402 },
      );
    }

    const { error: deductError } = await admin.from("ad_credit_ledger").insert({
      member_id: user.id,
      change_amount: -FEATURE_COST,
      reason: `Feature startup in digest: ${startup_id}`,
    });

    if (deductError) {
      return NextResponse.json({ error: deductError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
