import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BYPASS_CREDIT_GATES } from "@/lib/credits";

const REDO_COST = 100;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { id: projectId } = await params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check credit balance
    const { data: ledgerRows } = await admin
      .from("ad_credit_ledger")
      .select("change_amount")
      .eq("member_id", user.id);

    const balance = (ledgerRows ?? []).reduce(
      (sum, r) => sum + Number(r.change_amount ?? 0),
      0,
    );

    if (!BYPASS_CREDIT_GATES && balance < REDO_COST) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${REDO_COST} credits but have ${balance}.` },
        { status: 402 },
      );
    }

    // Deduct credits
    const { error: deductError } = await admin.from("ad_credit_ledger").insert({
      member_id: user.id,
      change_amount: -REDO_COST,
      reason: "AI venture readiness assessment (redo)",
    });

    if (deductError) {
      return NextResponse.json({ error: deductError.message }, { status: 500 });
    }

    // Generate assessment token

    const token = crypto.randomUUID();

    const { error: insertError } = await admin
      .from("assessment_tokens")
      .insert({
        id: token,
        project_id: projectId,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        used: false,
        session: { "init": true },
      });

    if (insertError) {
      // Refund on token failure
      await admin.from("ad_credit_ledger").insert({
        member_id: user.id,
        change_amount: REDO_COST,
        reason: "Refund: assessment token generation failed",
      });
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      token,
      url: `https://confidence.exoasia.org/roadmap?token=${token}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
