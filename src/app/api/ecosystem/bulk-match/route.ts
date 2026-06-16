import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BYPASS_CREDIT_GATES } from "@/lib/credits";



export async function POST() {
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

    const { data: ledgerRows } = await admin
      .from("ad_credit_ledger")
      .select("change_amount")
      .eq("member_id", user.id);

    const balance = (ledgerRows ?? []).reduce(
      (sum, r) => sum + Number(r.change_amount ?? 0),
      0,
    );

    const { data: previousMatches } = await admin
      .from("ad_credit_ledger")
      .select("id")
      .eq("member_id", user.id)
      .ilike("reason", "Bulk AI match:%")
      .limit(1);

    const isFirstMatch = !previousMatches || previousMatches.length === 0;
    const BULK_MATCH_COST = isFirstMatch ? 0 : 8;

    if (!BYPASS_CREDIT_GATES && balance < BULK_MATCH_COST) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${BULK_MATCH_COST} credits but have ${balance}.`, needed: BULK_MATCH_COST, balance },
        { status: 402 },
      );
    }

    const { error: deductError } = await admin.from("ad_credit_ledger").insert({
      member_id: user.id,
      change_amount: -BULK_MATCH_COST,
      reason: `Bulk AI match: ${new Date().toISOString().split("T")[0]}`,
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
