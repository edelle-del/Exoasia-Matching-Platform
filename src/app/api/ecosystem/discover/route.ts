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
    }));

    return NextResponse.json({ projects: projectRows, investors: investorRows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
