import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductCredits } from "@/lib/credits";

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

    // Check if already explicitly unlocked via fallback credits
    const { data: existing } = await admin
      .from("ad_credit_ledger")
      .select("id")
      .eq("member_id", user.id)
      .eq("reason", `View startup pitch deck (fallback): ${projectId}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, alreadyUnlocked: true, pitchDeckUrl });
    }

    // Check if there is an unblurred match (inherent top 10 or manually unblurred)
    const { count: unlockedCount } = await admin
      .from("user_unlocked_assets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("asset_type", "match")
      .eq("asset_id", projectId);

    let isUnblurredMatch = (unlockedCount ?? 0) > 0;

    if (!isUnblurredMatch) {
      // Check if it's in the top 10 active matches
      const { data: topScores } = await admin
        .from("project_match_scores")
        .select("project_id")
        .eq("investor_profile_id", user.id)
        .order("fit_score", { ascending: false })
        .limit(10);
      
      isUnblurredMatch = topScores?.some(s => s.project_id === projectId) ?? false;
    }

    // If it's an unblurred match, it's completely free, return immediately
    if (isUnblurredMatch) {
      return NextResponse.json({ success: true, alreadyUnlocked: true, pitchDeckUrl });
    }

    // Otherwise, deduct fallback credits
    try {
      await deductCredits(user.id, "VIEW_PITCH_DECK", projectId);
    } catch (e: any) {
      if (e.name === "InsufficientCreditsError") {
        return NextResponse.json(
          { error: `Insufficient credits. You need ${e.required} credits but have ${e.balance}.`, needed: e.required, balance: e.balance },
          { status: 402 }
        );
      }
      throw e;
    }

    return NextResponse.json({ success: true, alreadyUnlocked: false, pitchDeckUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
