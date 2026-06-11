import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BYPASS_CREDIT_GATES } from "@/lib/credits";

const UNLOCK_COST = 5;

export type FinancialSnapshot = {
  revenue: string;
  burn_rate: string;
  runway: string;
};

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

    // Fetch the snapshot + owner from the project
    const { data: project } = await admin
      .from("projects")
      .select("financial_snapshot, owner_id")
      .eq("id", projectId)
      .single();

    const projectData = project as { financial_snapshot?: FinancialSnapshot | null; owner_id?: string } | null;
    const snapshot = projectData?.financial_snapshot ?? null;

    // Owners see their own snapshot for free
    if (projectData?.owner_id === user.id) {
      return NextResponse.json({ success: true, alreadyUnlocked: true, snapshot });
    }

    // Idempotent — already unlocked, return data without charging
    const { data: existing } = await admin
      .from("ad_credit_ledger")
      .select("id")
      .eq("member_id", user.id)
      .eq("reason", `Unlock financial snapshot: ${projectId}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, alreadyUnlocked: true, snapshot });
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
      reason: `Unlock financial snapshot: ${projectId}`,
    });

    if (deductError) {
      return NextResponse.json({ error: deductError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, alreadyUnlocked: false, snapshot });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
