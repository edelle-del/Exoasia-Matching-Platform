import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DiscoverProject = {
  project_id: string;
  project_name: string;
  stage: string | null;
  sector: string | null;
  description: string | null;
  owner_id: string;
  owner_name: string;
  already_in_portfolio: boolean;
  eco_score: number | null;
  eco_summary: string | null;
};

export type DiscoverInvestor = {
  profile_id: string;
  full_name: string | null;
  business_name: string | null;
  sector: string | null;
  city: string | null;
  verification_status: string | null;
  role_title: string | null;
  offer_categories: string[] | null;
  ask_categories: string[] | null;
  short_bio: string | null;
  eco_score: number | null;
  eco_summary: string | null;
  already_in_portfolio: boolean;
};

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

    if (profile?.member_role !== "ecosystem_partner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      { data: portfolio },
      { data: projects, error: projectsError },
      { data: existingScores },
      { data: investors },
      { data: ledgerUnlocks },
      existingInvestorScores,
    ] = await Promise.all([
      admin.from("portfolio_companies").select("startup_id").eq("partner_id", user.id),
      admin
        .from("projects")
        .select("id, name, stage, sector, description, owner_id, profiles!owner_id(full_name, business_name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      admin
        .from("ecosystem_match_scores")
        .select("project_id, fit_score, summary")
        .eq("eco_partner_profile_id", user.id),
      admin
        .from("profiles")
        .select("id, full_name, business_name, sector, city, verification_status, role_title, offer_categories, ask_categories, short_bio")
        .eq("member_role", "investor")
        .order("created_at", { ascending: false }),
      admin
        .from("ad_credit_ledger")
        .select("reason")
        .eq("member_id", user.id)
        .ilike("reason", "Permanently unlock match card:%"),
      admin
        .from("ecosystem_investor_match_scores")
        .select("investor_profile_id, fit_score, summary")
        .eq("eco_partner_profile_id", user.id),
    ]);

    if (projectsError) {
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    const portfolioIds = new Set((portfolio ?? []).map((r) => r.startup_id));
    const scoreByProject = new Map(
      (existingScores ?? []).map((s) => [s.project_id, s]),
    );

    const projectRows: DiscoverProject[] = (projects ?? []).map((p) => {
      const owner = p.profiles as { full_name?: string | null; business_name?: string | null } | null;
      const score = scoreByProject.get(p.id);
      return {
        project_id: p.id,
        project_name: p.name,
        stage: p.stage,
        sector: p.sector,
        description: p.description ?? null,
        owner_id: p.owner_id,
        owner_name: owner?.business_name ?? owner?.full_name ?? "Unnamed startup",
        already_in_portfolio: portfolioIds.has(p.owner_id),
        eco_score: score?.fit_score ?? null,
        eco_summary: score?.summary ?? null,
      };
    });

    const investorRows: DiscoverInvestor[] = (investors ?? []).map((inv) => ({
      profile_id: inv.id,
      full_name: inv.full_name ?? null,
      business_name: inv.business_name ?? null,
      sector: inv.sector ?? null,
      city: inv.city ?? null,
      verification_status: inv.verification_status ?? null,
      role_title: inv.role_title ?? null,
      offer_categories: (inv.offer_categories as string[] | null) ?? null,
      ask_categories: (inv.ask_categories as string[] | null) ?? null,
      short_bio: inv.short_bio ?? null,
      eco_score: null,
      eco_summary: null,
      already_in_portfolio: portfolioIds.has(inv.id),
    }));

    const investorScores = existingInvestorScores?.data || [];
    const scoreByInvestor = new Map(
      investorScores.map((s) => [s.investor_profile_id, s]),
    );

    for (const inv of investorRows) {
      const score = scoreByInvestor.get(inv.profile_id);
      inv.eco_score = score?.fit_score ?? null;
      inv.eco_summary = score?.summary ?? null;
    }

    // Sort projects by eco_score descending
    projectRows.sort((a, b) => {
      const scoreA = a.eco_score ?? -1;
      const scoreB = b.eco_score ?? -1;
      return scoreB - scoreA;
    });

    // Sort investors by eco_score descending
    investorRows.sort((a, b) => {
      const scoreA = a.eco_score ?? -1;
      const scoreB = b.eco_score ?? -1;
      return scoreB - scoreA;
    });

    const unlockedMatchIds = new Set((ledgerUnlocks ?? []).map(row => 
      (row.reason as string).replace("Permanently unlock match card: ", "").trim()
    ));

    const limit = 5;

    const maskedProjects = projectRows.map((p, index) => {
      const isLocked = index >= limit && !p.already_in_portfolio && !unlockedMatchIds.has(p.project_id);
      return {
        ...p,
        owner_name: isLocked ? "Hidden Startup" : p.owner_name,
        project_name: isLocked ? "Confidential Project" : p.project_name,
        description: isLocked ? "This project description is hidden due to visibility limits. Unlock to view full details." : p.description,
        is_locked: isLocked,
      };
    });

    const maskedInvestors = investorRows.map((inv, index) => {
      const isLocked = index >= limit && !inv.already_in_portfolio && !unlockedMatchIds.has(inv.profile_id);
      return {
        ...inv,
        full_name: isLocked ? "Hidden Investor" : inv.full_name,
        business_name: isLocked ? "Confidential Firm" : inv.business_name,
        short_bio: isLocked ? "Investor biography is hidden due to visibility limits. Unlock to view full details." : inv.short_bio,
        is_locked: isLocked,
      };
    });

    return NextResponse.json({ projects: maskedProjects, investors: maskedInvestors, unlockedMatchIds: Array.from(unlockedMatchIds) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
