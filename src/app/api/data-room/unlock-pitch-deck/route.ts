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

    const { projectId } = await request.json() as { projectId: string };
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    // Fetch the pitch deck URL from the project
    const { data: project } = await admin
      .from("projects")
      .select("pitch_deck_url")
      .eq("id", projectId)
      .single();

    const pitchDeckUrl = (project as { pitch_deck_url?: string | null } | null)?.pitch_deck_url ?? null;

    // Idempotent — already unlocked, return URL for free
    const { data: existing } = await admin
      .from("ad_credit_ledger")
      .select("id")
      .eq("member_id", user.id)
      .eq("reason", `Unlock pitch deck: ${projectId}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, alreadyUnlocked: true, pitchDeckUrl });
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
      reason: `Unlock pitch deck: ${projectId}`,
    });

    if (deductError) {
      return NextResponse.json({ error: deductError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, alreadyUnlocked: false, pitchDeckUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
