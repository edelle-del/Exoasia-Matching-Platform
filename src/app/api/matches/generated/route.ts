import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
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

    const role = profile?.member_role || "startup";

    // Unlocked asset check
    const { data: ledgerUnlocks } = await admin
      .from("ad_credit_ledger")
      .select("reason")
      .eq("member_id", user.id)
      .ilike("reason", "Permanently unlock match card:%");

    const unlockedMatchIds = new Set((ledgerUnlocks ?? []).map(row => 
      (row.reason as string).replace("Permanently unlock match card: ", "").trim()
    ));

    if (role === "investor") {
      // Investors see Projects
      const limit = 10;
      const { data: projects } = await admin
        .from("projects")
        .select("id, name, stage, sector, description, owner_id, is_active, profiles!owner_id(full_name, business_name)")
        .eq("is_active", true);

      const { data: scores } = await admin
        .from("project_match_scores")
        .select("project_id, fit_score, summary, generated_at")
        .eq("investor_profile_id", user.id);

      const scoreMap = new Map((scores ?? []).map(s => [s.project_id, s]));

      const results = (projects ?? []).map(p => {
        const owner = p.profiles as { full_name?: string | null; business_name?: string | null } | null;
        const score = scoreMap.get(p.id);
        return {
          id: p.id,
          project_id: p.id,
          owner_id: p.owner_id,
          project_name: p.name,
          stage: p.stage,
          sector: p.sector,
          description: p.description,
          owner_name: owner?.business_name ?? owner?.full_name ?? "Unnamed startup",
          fit_score: score?.fit_score ?? 0,
          summary: score?.summary ?? null,
          generated_at: score?.generated_at ?? null,
          is_active: p.is_active,
        };
      });

      // Sort by score
      results.sort((a, b) => b.fit_score - a.fit_score);

      // Mask
      const masked = results.map((r, index) => {
        const isLocked = index >= limit && !unlockedMatchIds.has(r.id);
        return {
          ...r,
          owner_name: isLocked ? "Hidden Startup" : r.owner_name,
          project_name: isLocked ? "Confidential Project" : r.project_name,
          description: isLocked ? "Description locked due to visibility limits." : r.description,
          is_locked: isLocked,
        };
      });

      return NextResponse.json({ matches: masked });
    } else if (role === "startup") {
      // Startups see Investors
      const limit = 3;
      const { data: userProjects } = await admin.from("projects").select("id").eq("owner_id", user.id).eq("is_active", true);
      const projectIds = (userProjects ?? []).map(p => p.id);

      let scores: any[] = [];
      if (projectIds.length > 0) {
        const { data } = await admin
          .from("project_match_scores")
          .select("id, project_id, investor_profile_id, fit_score, generated_at, summary")
          .in("project_id", projectIds);
        scores = data ?? [];
      }

      const investorIds = [...new Set(scores.map(s => s.investor_profile_id))];
      let nameMap = new Map<string, string>();
      if (investorIds.length > 0) {
        const { data: investors } = await admin
          .from("profiles")
          .select("id, full_name, business_name")
          .in("id", investorIds);
        nameMap = new Map(
          (investors ?? []).map((p) => [p.id, p.business_name || p.full_name || "Verified investor"]),
        );
      }

      const results = scores.map(s => {
        return {
          id: s.id, // match score ID or composite
          project_id: s.project_id,
          investor_profile_id: s.investor_profile_id,
          fit_score: s.fit_score,
          generated_at: s.generated_at,
          summary: s.summary,
          investor_name: nameMap.get(s.investor_profile_id) ?? "Verified investor",
        };
      });

      // Sort by score
      results.sort((a, b) => b.fit_score - a.fit_score);

      // Mask
      const masked = results.map((r, index) => {
        // Here we use the score ID as the asset ID, or perhaps the profile ID. The prompt for match unblurring is usually the score ID or profile ID. 
        // In my-matches, it uses match ID. 
        // We'll use the profile ID or score ID depending on how page.tsx is set up. page.tsx uses "Permanently unlock match card: " + match.id.
        const isLocked = index >= limit && !unlockedMatchIds.has(r.id);
        return {
          ...r,
          investor_name: isLocked ? "Hidden Investor" : r.investor_name,
          summary: isLocked ? "Summary locked due to visibility limits." : r.summary,
          is_locked: isLocked,
        };
      });

      return NextResponse.json({ matches: masked });
    }

    return NextResponse.json({ matches: [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
